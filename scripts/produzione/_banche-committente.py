#!/usr/bin/env python3
"""Banche quiz dalle domande del COMMITTENTE (corsi a fonte HTML con _fonte/quiz.json).

Per ogni modulo il modello legge la narrazione completa (copioni.json) e, per ognuna delle domande
del committente (checkpoint e esame di quel modulo), indica la slide che giustifica la risposta, il
tipo (riconoscimento / comprensione / applicazione) e se la risposta marcata corretta è SOSTENUTA dal
copione. È anche un controllo di fedeltà: una domanda che il parlato non copre viene segnalata.

Scrive (solo con --scrivi, dopo aver letto il rapporto):
  checkpoint[mNN].banca = banca dell'orchestratore + domande di verifica del committente sostenute
  esameFinale = { estrazione: 20, soglia: 0.75, banca: domande d'esame del committente sostenute }
Le domande NON sostenute non entrano: vanno guardate a mano (rapporto in _staging).
Uso: python scripts/produzione/_banche-committente.py <corso> [--scrivi] [--accetta-riviste]
  --accetta-riviste: include anche le NON sostenute, SOLO dopo averle verificate a mano una per una
  (sul testo della norma e sugli altri moduli: il giudice vede solo la narrazione del modulo).
"""
from __future__ import annotations
import asyncio, json, os, sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, "scripts/produzione")
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
import orchestratore as O

PROD = Path("produzione")
SCHEMA = {"type": "json_schema", "json_schema": {"name": "mappa_quiz", "strict": True, "schema": {
    "type": "object", "additionalProperties": False, "required": ["domande"],
    "properties": {"domande": {"type": "array", "items": {
        "type": "object", "additionalProperties": False,
        "required": ["n", "slide", "tipo", "sostenuta", "motivo"],
        "properties": {"n": {"type": "integer"}, "slide": {"type": "string"},
                       "tipo": {"type": "string", "enum": ["riconoscimento", "comprensione", "applicazione"]},
                       "sostenuta": {"type": "boolean"}, "motivo": {"type": "string"}}}}}}}}


def norm(s: str) -> str:
    # apostrofi e virgolette tipografiche → ASCII (la voce e il lint non li vogliono)
    return s.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"').strip()


async def un_modulo(mdl, mod: str, slides: list[dict], domande: list[dict]) -> list[dict]:
    narr = "\n\n".join(f"### {s['id'].split('_')[-1]} — {s['titolo']}\n{s['testo']}" for s in slides)
    elenco = "\n\n".join(f"[{i}] {d['domanda']}\n" + "\n".join(f"  {chr(65 + j)}) {o}" for j, o in enumerate(d['opzioni']))
                         + f"\n  CORRETTA: {chr(65 + d['corretta'])}" for i, d in enumerate(domande))
    out = await mdl.chiama([
        {"role": "system", "content": "Sei il revisore dei quiz di un corso. Per ogni domanda indichi la slide (sNNN) della "
         "narrazione che giustifica la risposta corretta, il tipo di domanda, e se la risposta marcata CORRETTA è davvero "
         "sostenuta da quanto la narrazione dice (sostenuta=false se la narrazione non tratta il punto o dice altro). "
         "Motivo breve in italiano."},
        {"role": "user", "content": f"NARRAZIONE DEL MODULO {mod}:\n{narr}\n\nDOMANDE:\n{elenco}"}], SCHEMA, max_tokens=32000)
    per_n = {x["n"]: x for x in out["domande"]}
    return [{**d, **per_n.get(i, {"slide": "", "tipo": "comprensione", "sostenuta": False, "motivo": "nessuna risposta"})}
            for i, d in enumerate(domande)]


async def main() -> None:
    corso, scrivi = sys.argv[1], "--scrivi" in sys.argv
    cop = json.loads((PROD / corso / "copioni.json").read_text(encoding="utf-8"))
    quiz = json.loads((PROD / corso / "_fonte" / "quiz.json").read_text(encoding="utf-8"))
    moduli = sorted({s["id"].split("_")[1] for s in cop["slides"]})
    env = O.carica_env()
    mdl = O.Modello(O.client_azure(env), env, {"input": 0, "output": 0, "chiamate": 0})
    sem = asyncio.Semaphore(5)

    async def uno(m):
        async with sem:
            dom = [dict(d, origine="checkpoint") for d in quiz["checkpoint"] if d["modulo"] == m] + \
                  [dict(d, origine="esame") for d in quiz["esame"] if d["modulo"] == m]
            return m, await un_modulo(mdl, m, [s for s in cop["slides"] if s["id"].split("_")[1] == m], dom)

    esiti = dict(await asyncio.gather(*(uno(m) for m in moduli)))
    if "--accetta-riviste" in sys.argv:
        for ds in esiti.values():
            for d in ds:
                if not d["sostenuta"]:
                    d["sostenuta"], d["motivo"] = True, "verificata a mano: " + d["motivo"]
    rapporto = {m: [{k: d[k] for k in ("origine", "domanda", "slide", "tipo", "sostenuta", "motivo")} for d in ds]
                for m, ds in esiti.items()}
    dest = PROD / "_staging" / "slide-gates" / corso
    dest.mkdir(parents=True, exist_ok=True)
    (dest / "banche-committente.json").write_text(json.dumps(rapporto, ensure_ascii=False, indent=1), encoding="utf-8")

    non = [(m, d) for m, ds in esiti.items() for d in ds if not d["sostenuta"]]
    for m, ds in esiti.items():
        print(f"{m}: {sum(d['sostenuta'] for d in ds)}/{len(ds)} sostenute")
    for m, d in non:
        print(f"  NON SOSTENUTA [{m} · {d['origine']}] {d['domanda'][:110]} — {d['motivo'][:160]}")

    voce = lambda d, m: {"q": norm(d["domanda"]), "opzioni": [norm(o) for o in d["opzioni"]], "corretta": d["corretta"],
                         "tipo": d["tipo"], "slide": d["slide"] if d["slide"].startswith("s") else "s001", "modulo": m}
    nuovi_cp = {m: [voce(d, m) for d in ds if d["origine"] == "checkpoint" and d["sostenuta"]] for m, ds in esiti.items()}
    esame = [voce(d, m) for m, ds in esiti.items() for d in ds if d["origine"] == "esame" and d["sostenuta"]]
    print(f"esame finale: {len(esame)} domande in banca · posizioni corrette {dict(Counter(q['corretta'] for q in esame))}")
    if not scrivi:
        print("(prova: nulla scritto; rilancia con --scrivi)")
        return
    for m in moduli:
        orch = [q for q in cop["checkpoint"][m]["banca"] if q.get("origine") != "committente"]
        cop["checkpoint"][m]["banca"] = orch + [{**{k: v for k, v in q.items() if k != "modulo"}, "origine": "committente"}
                                                for q in nuovi_cp[m]]
    cop["esameFinale"] = {"estrazione": 20, "soglia": 0.75, "banca": esame}
    p = PROD / corso / "copioni.json"
    p.with_suffix(".json.tmp").write_text(json.dumps(cop, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.replace(p.with_suffix(".json.tmp"), p)
    print("scritto copioni.json: checkpoint arricchiti ed esameFinale")

asyncio.run(main())
