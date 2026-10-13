# Secondo giudice, più forte, sui soli DISACCORDI di qa-risposte-quiz.mjs (che usa il modello piccolo del
# chatbot, debole nei conti). Il modello della fabbrica (gpt-5.4, con ragionamento) risolve ogni domanda
# da capo, senza vedere la chiave, e indica la lettera. Restano da verificare a mano solo i casi in cui
# ANCHE lui è in disaccordo con la chiave del corso.
# Uso: python scripts/produzione/_rigiudica-quiz.py <corso>
import asyncio, json, sys
from pathlib import Path
sys.path.insert(0, "scripts/produzione")
sys.stdout.reconfigure(encoding="utf-8")
import orchestratore as O

corso = sys.argv[1]
rap = json.loads(Path(f"produzione/_staging/slide-gates/{corso}/risposte-quiz.json").read_text(encoding="utf-8"))
man = json.loads(Path(f"produzione/{corso}/manifest.json").read_text(encoding="utf-8"))
domande = {}
def raccogli(o):
    "ogni domanda del manifest, ovunque stia (lezioni, checkpoint, esame)"
    if isinstance(o, dict):
        for q in o.get("questions", []) if isinstance(o.get("questions"), list) else []:
            if isinstance(q, dict) and "text" in q: domande[q["text"]] = q
        for v in o.values(): raccogli(v)
    elif isinstance(o, list):
        for v in o: raccogli(v)
raccogli(man)
for q in man["finalExam"]["questions"]: domande[q["text"]] = q

ISTR = ("Risolvi la domanda di un corso sulla carbon footprint (GHG Protocol, ISO 14064-1, ISO 14067, ISO 14068-1). "
        "Se è un calcolo, fai il conto passo per passo con attenzione alle unità (kg e t, kWh e MWh). "
        "Rispondi SOLO in JSON: {\"lettera\": \"a|b|c|d\", \"conto\": \"passaggi essenziali\"}")


async def main():
    env = O.carica_env(); mdl = O.Modello(O.client_azure(env), env, {"input": 0, "output": 0, "chiamate": 0})
    dis = [r for r in rap["risultati"] if not r["concorda"]]
    sem = asyncio.Semaphore(8)

    async def uno(r):
        q = domande.get(r["testo"])
        if not q: return r, None
        testo = q["text"] + "\n" + "\n".join(f"{o['id']}) {o['text']}" for o in q["options"])
        async with sem:
            g = await mdl.chiama([{"role": "system", "content": ISTR}, {"role": "user", "content": testo}],
                                 {"type": "json_object"}, max_tokens=16000)
        return r, g

    esiti = await asyncio.gather(*(uno(r) for r in dis))
    restano = []
    for r, g in esiti:
        if g is None: print("  ? domanda non trovata nel manifest:", r["testo"][:80]); restano.append((r, g)); continue
        if g.get("lettera") != r["marcata"]: restano.append((r, g))
    print(f"disaccordi del giudice piccolo: {len(dis)} · il giudice forte dà ragione alla chiave in {len(dis) - len(restano)} · da verificare a mano {len(restano)}")
    for r, g in restano:
        print(f"\n[{r['dove']}] {r['testo']}\n   chiave {r['marcata']} · giudice forte {g and g.get('lettera')} · {g and g.get('conto', '')[:400]}")

asyncio.run(main())
