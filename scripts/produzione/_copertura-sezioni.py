#!/usr/bin/env python3
"""Controllo di COPERTURA di una bozza modulo rispetto alla ripartizione dello skeleton.

Lo skeleton (struttura.md, blocco "### Mn — ...") assegna a ogni sezione della fonte un numero di
slide. I gate meccanici e il revisore non verificano che il copione le rispetti: sui moduli lunghi
il modello tende a dilatare le prime sezioni e a schiacciare le ultime (fadpas24000, 13/10/2026).
Qui il modello assegna OGNI slide (titolo + inizio del testo) alla sezione che tratta; poi si
confrontano i conteggi con quelli previsti. Esito:
  ROSSO  se una sezione ha 0 slide, o meno della metà di quelle previste (arrotondata per eccesso)
  GIALLO se una sezione si discosta di 2 o più slide dal previsto
  VERDE  altrimenti
Uso: python scripts/produzione/_copertura-sezioni.py <corso> <mNN> [<mNN> ...]   (legge _bozze/<mNN>.json)
Esce con codice 1 se almeno un modulo è ROSSO.
"""
from __future__ import annotations
import asyncio, json, math, re, sys
from pathlib import Path

sys.path.insert(0, "scripts/produzione")
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
import orchestratore as O

PROD = Path("produzione")

SCHEMA = {"type": "json_schema", "json_schema": {"name": "assegnazione", "strict": True, "schema": {
    "type": "object", "additionalProperties": False, "required": ["assegnazioni"],
    "properties": {"assegnazioni": {"type": "array", "items": {
        "type": "object", "additionalProperties": False, "required": ["slide", "sezione"],
        "properties": {"slide": {"type": "string"}, "sezione": {"type": "integer"}}}}}}}}


def previste(corso: str, mod: str) -> list[tuple[str, int]]:
    md = (PROD / corso / "struttura.md").read_text(encoding="utf-8")
    n = int(mod[1:])
    blocco = next(b for b in md.split("\n### ")[1:] if re.match(rf"M{n} — ", b))
    conteggi = [int(k) for k in re.findall(r"^- .*? — (\d+) slide$", blocco, re.M)]
    # titoli esatti dalla fonte (la riga dello skeleton unisce titolo e schermate con ":")
    fonte = PROD / corso / "_fonte" / f"{mod}.txt"
    titoli = re.findall(r"^## SEZIONE \d+ — (.*)$", fonte.read_text(encoding="utf-8"), re.M) if fonte.exists() else []
    if len(titoli) != len(conteggi):
        titoli = [f"sezione {i}" for i in range(1, len(conteggi) + 1)]
    return list(zip(titoli, conteggi))


async def un_modulo(mdl, corso: str, mod: str) -> str:
    sez = previste(corso, mod)
    slides = json.loads((PROD / corso / "_bozze" / f"{mod}.json").read_text(encoding="utf-8"))["slides"]
    elenco_sez = "\n".join(f"{i}. {t}" for i, (t, _) in enumerate(sez, 1))
    elenco_sl = "\n".join(f"{s['id']} — {s['titolo']}: {' '.join(s['testo'].split()[:70])}" for s in slides)
    out = await mdl.chiama([
        {"role": "system", "content": "Assegni ogni slide di un corso alla sezione del programma che tratta in prevalenza. "
                                      "Rispondi solo col JSON richiesto, una voce per ogni slide, sezione = numero dell'elenco."},
        {"role": "user", "content": f"SEZIONI DEL MODULO:\n{elenco_sez}\n\nSLIDE:\n{elenco_sl}"}], SCHEMA, max_tokens=16000)
    conta = [0] * len(sez)
    for a in out["assegnazioni"]:
        if 1 <= a["sezione"] <= len(sez):
            conta[a["sezione"] - 1] += 1
    esito, righe = "VERDE", []
    for i, ((t, att), got) in enumerate(zip(sez, conta), 1):
        segno = ""
        if got == 0 or got < math.ceil(att / 2):
            esito, segno = "ROSSO", "  ← ROSSO"
        elif abs(got - att) >= 2:
            esito = "GIALLO" if esito == "VERDE" else esito
            segno = "  ← giallo"
        righe.append(f"   {i:2d}. {t[:60]:60s} previste {att}  trovate {got}{segno}")
    return f"[{mod}] {esito}\n" + "\n".join(righe)


async def main() -> None:
    corso, moduli = sys.argv[1], sys.argv[2:]
    env = O.carica_env()
    mdl = O.Modello(O.client_azure(env), env, {"input": 0, "output": 0, "chiamate": 0})
    esiti = await asyncio.gather(*(un_modulo(mdl, corso, m) for m in moduli))
    print("\n".join(esiti))
    sys.exit(1 if any("] ROSSO" in e for e in esiti) else 0)

asyncio.run(main())
