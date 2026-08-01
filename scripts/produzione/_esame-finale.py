# Esame finale del corso: 30 domande in banca, estrazione 20, soglia 0,75 — stessa forma
# di produzione/19011/copioni.json. Tre domande per modulo, generate dal contenuto reale
# del modulo e obbligatoriamente DIVERSE da quelle del checkpoint dello stesso modulo.
# Uso: python _esame-finale.py <corso>
import sys, json, asyncio, re
from pathlib import Path
sys.path.insert(0, "scripts/produzione")
import orchestratore as O

PER_MODULO = 3
VIETATI = re.compile(r"[()/%°\[\]{}<>\\|~^*_=+×÷€²³]")

ISTRUZIONI = (
    "Sei l'esaminatore di un corso professionale. Ti do i contenuti di UN modulo e le domande "
    "già usate nel suo checkpoint.\n\n"
    f"COMPITO: scrivi {PER_MODULO} domande per l'ESAME FINALE del corso.\n\n"
    "REGOLE:\n"
    "- Devono essere DIVERSE, per formulazione E per concetto verificato, da quelle del checkpoint.\n"
    "- Verificano che la persona sappia APPLICARE il contenuto, non che ricordi una definizione: "
    "preferisci situazioni concrete (\"un'impresa fa X: che cosa comporta?\").\n"
    "- Esattamente 4 opzioni, UNA sola corretta, le altre plausibili per chi ha studiato male "
    "(mai assurde, mai \"tutte le precedenti\", mai di lunghezza rivelatrice).\n"
    "- La risposta deve essere ricavabile dal contenuto del modulo, non da conoscenze esterne.\n"
    "- Testo semplice: niente parentesi, trattini, barre, simboli o percentuali in simbolo.\n\n"
    "Rispondi SOLO con JSON {\"domande\": [{\"q\": \"...\", \"opzioni\": [\"a\",\"b\",\"c\",\"d\"], "
    "\"corretta\": 0, \"tipo\": \"comprensione\"}]} dove corretta è l'indice 0-3 e tipo è "
    "\"riconoscimento\", \"comprensione\" o \"applicazione\"."
)


def verifica(d: dict) -> str | None:
    if not isinstance(d.get("opzioni"), list) or len(d["opzioni"]) != 4:
        return "non ha 4 opzioni"
    if not isinstance(d.get("corretta"), int) or not 0 <= d["corretta"] <= 3:
        return "indice corretto fuori range"
    if len(set(d["opzioni"])) != 4:
        return "opzioni duplicate"
    if VIETATI.search(d.get("q", "") + " ".join(d["opzioni"])):
        return "simboli vietati"
    if d.get("tipo") not in ("riconoscimento", "comprensione", "applicazione"):
        return f"tipo non valido: {d.get('tipo')}"
    return None


async def main():
    corso = sys.argv[1]
    path = Path(f"produzione/{corso}/copioni.json")
    c = json.loads(path.read_text(encoding="utf-8"))
    if c.get("esameFinale"):
        print(f"{corso}: esameFinale già presente ({len(c['esameFinale']['banca'])} domande) — nulla da fare")
        return

    moduli = sorted(c.get("checkpoint", {}))
    per_mod = {}
    for s in c["slides"]:
        per_mod.setdefault(s["id"].split("_")[1], []).append(s)

    env = O.carica_env()
    mdl = O.Modello(O.client_azure(env), env, {"input": 0, "output": 0, "chiamate": 0})

    async def uno(mod: str):
        slides = per_mod.get(mod, [])
        # estratto: titolo + apertura di ogni slide, abbastanza per coprire tutto il modulo
        estratto = "\n\n".join(
            f"[{s['id'][-4:]}] {s.get('titolo','')}\n{' '.join(s['testo'].split()[:110])}"
            for s in slides)
        gia = "\n".join(f"- {q['q']}" for q in c["checkpoint"][mod].get("banca", []))
        for _ in range(2):
            try:
                r = await mdl.chiama(
                    [{"role": "system", "content": ISTRUZIONI},
                     {"role": "user", "content": f"MODULO {mod}\n\nCONTENUTI:\n{estratto}\n\n"
                                                 f"DOMANDE GIÀ USATE NEL CHECKPOINT:\n{gia}"}],
                    {"type": "json_object"}, max_tokens=64000)
            except Exception as e:
                print(f"  [{mod}] chiamata fallita: {str(e)[:70]}"); continue
            dom = r.get("domande") or []
            buone = []
            for d in dom:
                motivo = verifica(d)
                if motivo:
                    print(f"  [{mod}] domanda scartata ({motivo})")
                    continue
                d["modulo"] = mod
                buone.append(d)
            if len(buone) >= PER_MODULO:
                return mod, buone[:PER_MODULO]
            print(f"  [{mod}] solo {len(buone)}/{PER_MODULO} valide — riprovo")
        return mod, []

    esiti = await asyncio.gather(*(uno(m) for m in moduli))
    banca = []
    for mod, dom in sorted(esiti):
        if not dom:
            print(f"ERRORE: modulo {mod} senza domande — esame NON scritto")
            sys.exit(1)
        banca.extend(dom)

    c["esameFinale"] = {"estrazione": 20, "soglia": 0.75, "banca": banca}
    path.write_text(json.dumps(c, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{corso}: esameFinale scritto — {len(banca)} domande su {len(moduli)} moduli, "
          f"estrazione 20, soglia 0,75")

asyncio.run(main())
