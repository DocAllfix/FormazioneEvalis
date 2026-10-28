# Allungatore chirurgico E6 (l'inverso di _snellisci.py): quando il MONTE ORE del corso resta sotto
# la soglia legale anche con ogni modulo dentro i suoi limiti, NON si rigenera: si aggiunge UN
# paragrafo alle slide più corte dei moduli indicati, fino al bersaglio del modulo. Il testo
# originale resta identico; il paragrafo nuovo va prima dell'ultimo (che di solito aggancia la
# slide dopo) e passa una verifica, altrimenti si scarta. Ogni aggiunta finisce in
# _log/allunga-<mNN>.json per la revisione a mano (valori nuovi, coerenza).
# Uso: python _allunga.py <corso> <mNN>[:<scarto%>] ...   (scarto bersaglio, default 0 = budget esatto)
import sys, json, asyncio, re
from pathlib import Path
sys.path.insert(0, "scripts/produzione")
import orchestratore as O

PS = O.PAROLE_AL_SECONDO
PAR_MIN, PAR_MAX = 80, 170
VIETATI = re.compile(r"[-()/%°\[\]{}<>\\|~^*_=+×÷€²³\d]")
FONTE_NOMINATA = re.compile(r"\b(il modulo|questo modulo|il documento|la slide|questa slide|il materiale|la fonte|il committente)\b", re.I)

ISTRUZIONI = (
    "Sei l'autore dei copioni parlati di un corso professionale per piastrellisti. Ti do il testo di UNA "
    "slide e il contenuto di riferimento del modulo.\n"
    "COMPITO: scrivi UN SOLO paragrafo nuovo, di circa {target} parole, da inserire prima dell'ultimo "
    "paragrafo della slide. Deve approfondire ciò che la slide sta già dicendo: il perché tecnico, un "
    "esempio di cantiere concreto, un controllo pratico, un errore da evitare. Deve dire qualcosa di "
    "NUOVO rispetto al testo della slide, mai ripeterlo con altre parole.\n\n"
    "REGOLE ASSOLUTE:\n"
    "- Nessun valore numerico nuovo: niente soglie, tolleranze, classi, misure, tempi o quantità che non "
    "siano già nel testo della slide. Se ti serve un numero, riusa uno già detto nella slide, scritto "
    "nello stesso modo. In dubbio, nessun numero.\n"
    "- Nessun contenuto di norma inventato: non citare punti, prospetti o paragrafi di norme.\n"
    "- È testo PARLATO da una voce sintetica: mai cifre, trattini, parentesi, barre, simboli, elenchi.\n"
    "- Non nominare mai il modulo, la slide, il documento, il materiale o la fonte: parla al corsista "
    "con il tu, nello stesso tono della slide.\n"
    "- Nessun gerundio o imperativo con pronome attaccato.\n\n"
    "Rispondi SOLO con JSON {{\"paragrafo\": \"...\"}}."
)


def verifica(par: str) -> str | None:
    n = len(par.split())
    if not PAR_MIN <= n <= PAR_MAX:
        return f"lunghezza {n}"
    if VIETATI.search(par):
        return f"simboli o cifre: {''.join(sorted(set(VIETATI.findall(par))))}"
    if FONTE_NOMINATA.search(par):
        return f"nomina la fonte: {FONTE_NOMINATA.search(par).group(0)}"
    if "\n" in par.strip() or not par.rstrip().endswith((".", "?")):
        return "non è un paragrafo unico e chiuso"
    return None


async def allunga_modulo(mdl, corso: str, mod: str, budget_min: int, scarto: float) -> None:
    path = Path(f"produzione/{corso}/_bozze/{mod}.json")
    bozza = json.loads(path.read_text(encoding="utf-8"))
    slides = bozza["slides"]
    fonte = Path(f"produzione/{corso}/_fonte/{mod}.txt").read_text(encoding="utf-8")
    target_mod = budget_min * 60 * PS * (1 + scarto)
    tot = sum(len(s["testo"].split()) for s in slides)
    da_aggiungere = int(target_mod - tot)
    if da_aggiungere <= 0:
        print(f"[{mod}] già al bersaglio: {tot} parole"); return
    # le slide più corte, mai la prima né l'ultima del modulo (apertura e chiusura restano come sono)
    candidate = sorted(range(1, len(slides) - 1), key=lambda i: len(slides[i]["testo"].split()))
    piano, resto = [], da_aggiungere
    for i in candidate:
        if resto <= 0:
            break
        q = max(PAR_MIN, min(130, resto))
        piano.append((i, q)); resto -= q
    print(f"[{mod}] {tot} parole, aggiungo {da_aggiungere} su {len(piano)} slide")

    async def una(i: int, q: int):
        s = slides[i]
        for tentativo in range(3):
            try:
                r = await mdl.chiama(
                    [{"role": "system", "content": ISTRUZIONI.format(target=q)},
                     {"role": "user", "content": f"## CONTENUTO DI RIFERIMENTO DEL MODULO\n{fonte}\n\n## TESTO DELLA SLIDE «{s['titolo']}»\n{s['testo']}"}],
                    {"type": "json_object"}, max_tokens=64000)
            except Exception as e:
                print(f"  [{mod} s{i+1:03d}] chiamata fallita: {str(e)[:80]}"); continue
            par = (r.get("paragrafo") or "").strip().replace("’", "'")  # E4: solo l'apostrofo semplice
            motivo = verifica(par)
            if motivo is None:
                return i, par
            print(f"  [{mod} s{i+1:03d}] scartato ({motivo})")
        return i, None

    esiti = await asyncio.gather(*(una(i, q) for i, q in piano))
    registro = []
    for i, par in esiti:
        if not par:
            continue
        paragrafi = slides[i]["testo"].split("\n\n")
        slides[i]["testo"] = "\n\n".join(paragrafi[:-1] + [par, paragrafi[-1]]) if len(paragrafi) > 1 else slides[i]["testo"] + "\n\n" + par
        registro.append({"id": slides[i]["id"], "paragrafo": par})
    nuovo = sum(len(s["testo"].split()) for s in slides)
    print(f"[{mod}] {len(registro)}/{len(piano)} paragrafi → {nuovo} parole ({(nuovo / (budget_min * 60 * PS) - 1) * 100:+.1f}% del budget)")
    if registro:
        O.scrivi_atomico(path, json.dumps(bozza, ensure_ascii=False, indent=2) + "\n")
        log = Path(f"produzione/{corso}/_log/allunga-{mod}.json")
        vecchi = json.loads(log.read_text(encoding="utf-8")) if log.exists() else []
        O.scrivi_atomico(log, json.dumps(vecchi + registro, ensure_ascii=False, indent=2) + "\n")


async def main():
    corso, voci = sys.argv[1], sys.argv[2:]
    env = O.carica_env()
    mdl = O.Modello(O.client_azure(env), env, {"input": 0, "output": 0, "chiamate": 0})
    budget = json.loads(Path(f"produzione/{corso}/copioni.json").read_text(encoding="utf-8"))["budget"]["minutiPerModulo"]
    lavori = []
    for v in voci:
        mod, _, sc = v.partition(":")
        lavori.append(allunga_modulo(mdl, corso, mod, budget[mod], float(sc or 0) / 100))
    await asyncio.gather(*lavori)

asyncio.run(main())
