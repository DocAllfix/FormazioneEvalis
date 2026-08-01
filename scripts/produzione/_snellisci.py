# Snellitore chirurgico E6: quando un modulo supera il tetto di lunghezza (+2% del budget),
# NON si rigenera (oscilla tra troppo corto e troppo lungo): si comprimono SOLO le slide più
# lunghe, una per una, chiedendo al modello di togliere ridondanza a parità di concetti.
# Ogni slide riscritta passa una verifica prima di essere accettata; se fallisce si tiene
# l'originale. Uso: python _snellisci.py <corso> <mod> [<mod> ...]
import sys, json, asyncio, re
from pathlib import Path
sys.path.insert(0, "scripts/produzione")
import orchestratore as O

PS = O.PAROLE_AL_SECONDO
MARGINE = 0.010          # si punta a +1,0% invece del tetto +2%: il lint deve passare largo
VIETATI = re.compile(r"[-()/%°\[\]{}<>\\|~^*_=+×÷€²³]")

ISTRUZIONI = (
    "Sei un revisore di copioni parlati per un corso professionale. Ti do il testo di UNA slide.\n"
    "COMPITO: riscrivilo più asciutto, portandolo a ESATTAMENTE {target} parole (tolleranza ±8), "
    "cioè togliendo circa {taglio} parole.\n\n"
    "REGOLE ASSOLUTE:\n"
    "- NON eliminare nessun concetto, dato numerico, norma, esempio o passaggio logico: "
    "si toglie SOLO ridondanza (ripetizioni, perifrasi, rilanci inutili, aggettivi superflui, "
    "frasi che ridicono quanto appena detto con parole diverse).\n"
    "- Tutti i numeri, gli importi, le percentuali e i riferimenti normativi restano IDENTICI.\n"
    "- È testo PARLATO da una voce sintetica: mai trattini, parentesi, barre, simboli, "
    "percentuali in simbolo, elenchi puntati. Numeri e norme in cifre. Frasi complete.\n"
    "- Nessun gerundio con pronome attaccato, nessun imperativo con pronome attaccato.\n"
    "- NON cambiare la forma dei numeri: ciò che nell'originale è scritto in lettere "
    "(\"tre aree\", \"l'ottanta per cento\") resta in lettere, ciò che è in cifre resta in cifre.\n"
    "- Stessa persona, stesso tono, stesso ordine degli argomenti dell'originale.\n\n"
    "Rispondi SOLO con JSON {{\"testo\": \"...\"}}."
)


def verifica(nuovo: str, vecchio: str, target: int) -> str | None:
    """Ritorna il motivo dello scarto, o None se la riscrittura è accettabile."""
    n = len(nuovo.split())
    if abs(n - target) > 12:
        return f"lunghezza {n} ≠ target {target}"
    if n >= len(vecchio.split()):
        return "non ha accorciato"
    if VIETATI.search(nuovo):
        return f"simboli vietati: {''.join(sorted(set(VIETATI.findall(nuovo))))}"
    if not nuovo.rstrip().endswith((".", "!", "?")):
        return "testo troncato"
    # i numeri dell'originale devono esserci tutti anche nel nuovo (nessun dato perso)
    num_v = set(re.findall(r"\d[\d.,]*", vecchio))
    persi = [x for x in num_v if x not in nuovo]
    if persi:
        return f"numeri persi: {persi[:6]}"
    # non deve trasformare numeri a lettere in cifre (la casa scrive "l'ottanta per cento")
    nuove_cifre = set(re.findall(r"\d[\d.,]*", nuovo)) - num_v
    if nuove_cifre:
        return f"numeri convertiti in cifre: {sorted(nuove_cifre)[:6]}"
    return None


async def snellisci_modulo(mdl, corso: str, mod: str, budget_min: int) -> bool:
    path = Path(f"produzione/{corso}/_bozze/{mod}.json")
    bozza = json.loads(path.read_text(encoding="utf-8"))
    slides = bozza["slides"]
    target_mod = budget_min * 60 * PS
    tot = sum(len(s["testo"].split()) for s in slides)
    da_tagliare = int(tot - target_mod * (1 + MARGINE))
    if da_tagliare <= 0:
        print(f"[{mod}] già dentro: {tot} parole")
        return True

    # si sceglie il minimo numero di slide lunghe che copre il taglio, max 45 parole ciascuna
    ordinate = sorted(enumerate(slides), key=lambda t: -len(t[1]["testo"].split()))
    piano, resto = [], da_tagliare
    for i, s in ordinate:
        if resto <= 0:
            break
        n = len(s["testo"].split())
        q = min(45, max(15, resto), n - 600)   # mai sotto le 600 parole per slide
        if q < 15:
            continue
        piano.append((i, n, n - q))
        resto -= q
    if resto > 0:
        print(f"[{mod}] ATTENZIONE: piano copre solo {da_tagliare - resto}/{da_tagliare} parole")
    print(f"[{mod}] {tot} parole, taglio {da_tagliare} su {len(piano)} slide")

    async def una(i: int, vecchio_n: int, target: int):
        s = slides[i]
        for tentativo in range(2):
            try:
                r = await mdl.chiama(
                    [{"role": "system", "content": ISTRUZIONI.format(target=target,
                                                                     taglio=vecchio_n - target)},
                     {"role": "user", "content": s["testo"]}],
                    {"type": "json_object"}, max_tokens=64000)  # i reasoning token contano nel limite
            except Exception as e:  # una slide persa non deve far cadere il modulo
                print(f"  [{mod} s{i+1:03d}] chiamata fallita: {str(e)[:80]}")
                continue
            nuovo = (r.get("testo") or "").strip()
            motivo = verifica(nuovo, s["testo"], target)
            if motivo is None:
                return i, nuovo
            print(f"  [{mod} s{i+1:03d}] scartata ({motivo}){' — riprovo' if tentativo == 0 else ''}")
        return i, None

    esiti = await asyncio.gather(*(una(i, n, t) for i, n, t in piano))
    riscritte = 0
    for i, nuovo in esiti:
        if nuovo:
            slides[i]["testo"] = nuovo
            riscritte += 1

    nuovo_tot = sum(len(s["testo"].split()) for s in slides)
    scarto = (nuovo_tot - target_mod) / target_mod
    ok = -0.05 <= scarto <= 0.02
    print(f"[{mod}] {riscritte}/{len(piano)} riscritte → {nuovo_tot} parole, "
          f"scarto {scarto*100:+.1f}% {'OK' if ok else 'ANCORA FUORI'}")
    if riscritte:
        O.scrivi_atomico(path, json.dumps(bozza, ensure_ascii=False, indent=2) + "\n")
    return ok


async def main():
    corso, moduli = sys.argv[1], sys.argv[2:]
    env = O.carica_env()
    client = O.client_azure(env)
    usage = {"input": 0, "output": 0, "chiamate": 0}
    mdl = O.Modello(client, env, usage)
    budget = json.loads(Path(f"produzione/{corso}/copioni.json").read_text(encoding="utf-8")).get("budget", {})
    tutti = []
    for mod in moduli:
        minuti = budget.get("minutiPerModulo", {}).get(mod, 240)
        tutti.append(await snellisci_modulo(mdl, corso, mod, minuti))
    print(f"\n{sum(tutti)}/{len(tutti)} moduli dentro il budget — "
          f"{usage['chiamate']} chiamate, {usage['output']} token out")

asyncio.run(main())
