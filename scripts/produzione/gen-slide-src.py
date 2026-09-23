#!/usr/bin/env python3
"""Contenuti slide dai copioni (FASE 5b): per ogni slide del modulo produce il blocco
visivo che accompagna il parlato — layout, kicker, titolo, lead, punti — nel formato
_slide-src/<corso>-<mNN>-contenuti.json atteso da build-slide.mjs.

Regole vincolanti (verdetti già presi sui corsi precedenti):
  - la slide è SUPPORTO VISIVO, mai la trascrizione del parlato: poche parole, dense;
  - VARIETÀ dei layout: "punti" al massimo un terzo delle slide, il resto distribuito
    su cards, numeri, confronto, flusso, definizione, split, evidenza, timeline, tabella;
  - densità contenuta: l'altezza naturale deve restare sotto ~1100px (invariante anti-taglio);
  - niente simboli decorativi, niente emoji, italiano professionale.

Uso: python scripts/produzione/gen-slide-src.py <corso> [--moduli m01,m02] [--parallel 5]
"""
from __future__ import annotations
import argparse, asyncio, json, sys
from pathlib import Path
sys.path.insert(0, "scripts/produzione")
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
import orchestratore as O

REPO = Path(__file__).resolve().parents[2]
PROD = REPO / "produzione"
BLOCCO = 9  # slide per chiamata

LAYOUT = ["apertura", "punti", "cards", "numeri", "confronto", "flusso", "definizione",
          "split", "evidenza", "timeline", "tabella", "chiusura"]

SISTEMA = """Sei il progettista delle slide di un corso video professionale in italiano.
Ogni slide accompagna un relatore che parla: la slide NON ripete il parlato, ne fissa
l'ossatura visiva con poche parole dense che restano impresse.

REGOLE
1. VARIETÀ: usa layout diversi. "punti" non più di un terzo delle slide del blocco.
   Alterna cards, numeri, confronto, flusso, definizione, split, evidenza, timeline, tabella.
2. DENSITÀ BASSA: al massimo 4 voci per elenco; ogni voce 3-14 parole. Lead 20-45 parole.
   Titolo 4-12 parole. Mai muri di testo: la slide deve restare leggibile a colpo d'occhio.
3. Italiano professionale, niente emoji, niente simboli decorativi, niente punti esclamativi.
4. Il titolo dice la cosa, non la annuncia ("Le quattro condizioni della tassonomia",
   non "Parliamo della tassonomia").
5. I contenuti devono derivare dal parlato di QUELLA slide, mai da altre.

FORMATO per slide (JSON):
 apertura/chiusura: {id, layout, kicker, titolo, lead}
 punti/cards:       {id, layout, kicker, titolo, lead, punti:[{h,d}]}
 confronto:         {id, layout, kicker, titolo, lead, colonne:[{h,voci:[...]},{h,voci:[...]}]}
 numeri:            {id, layout, kicker, titolo, lead, numeri:[{n,eti}]}
 flusso/timeline:   {id, layout, kicker, titolo, lead, passi:[{h,d}]}
 definizione:       {id, layout, kicker, titolo, lead, termine, spiegazione}
 split/evidenza:    {id, layout, kicker, titolo, lead, punti:[{h,d}]}
 tabella:           {id, layout, kicker, titolo, lead, intestazioni:[...], righe:[[...]]}
Rispondi SOLO con {"slides":[...]}."""


async def genera_modulo(mdl, corso: str, mod: str, slides: list[dict]) -> list[dict]:
    out: list[dict] = []
    for i in range(0, len(slides), BLOCCO):
        blocco = slides[i:i + BLOCCO]
        fatti = ", ".join(s["layout"] for s in out[-6:]) or "nessuna"
        utente = (f"Modulo {mod}. Slide {i+1}-{i+len(blocco)} di {len(slides)}.\n"
                  f"Layout delle ultime slide già fatte: {fatti} (varia rispetto a queste).\n\n"
                  + "\n\n".join(f"--- SLIDE {s['id']} · titolo: {s.get('titolo','')}\n"
                                f"PARLATO: {s.get('testo','')[:2600]}" for s in blocco))
        r = await mdl.chiama([{"role": "system", "content": SISTEMA},
                              {"role": "user", "content": utente}],
                             {"type": "json_object"})
        dati = (r if isinstance(r, dict) else json.loads(r))["slides"]
        for s, d in zip(blocco, dati):
            d["id"] = s["id"]                       # l'id è quello canonico, mai inventato
            if d.get("layout") not in LAYOUT: d["layout"] = "punti"
            out.append(d)
        print(f"  [{mod}] {len(out)}/{len(slides)} slide")
    return out


async def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("corso"); ap.add_argument("--moduli"); ap.add_argument("--parallel", type=int, default=5)
    a = ap.parse_args()
    env = O.carica_env(); client = O.client_azure(env)
    cop = json.loads((PROD / a.corso / "copioni.json").read_text(encoding="utf-8"))
    moduli = a.moduli.split(",") if a.moduli else sorted({s["id"].split("_")[1] for s in cop["slides"]})
    dest = PROD / a.corso / "_slide-src"; dest.mkdir(parents=True, exist_ok=True)
    sem = asyncio.Semaphore(a.parallel)

    async def uno(mod: str):
        f = dest / f"{a.corso}-{mod}-contenuti.json"
        slides = [s for s in cop["slides"] if s["id"].split("_")[1] == mod]
        esistenti = {d["id"]: d for d in json.loads(f.read_text(encoding="utf-8"))} if f.exists() else {}
        if len(esistenti) == len(slides):
            print(f"  [{mod}] già fatto"); return
        # ripresa per SLIDE, non solo per modulo: un corso su nuova edizione parte con i
        # blocchi già pronti delle slide rimaste identiche e fa generare solo le altre.
        mancanti = [s for s in slides if s["id"] not in esistenti]
        async with sem:
            mdl = O.Modello(client, env, {"input": 0, "output": 0, "chiamate": 0})
            dati = await genera_modulo(mdl, a.corso, mod, mancanti)
            esistenti.update({d["id"]: d for d in dati})
            ordinati = [esistenti[s["id"]] for s in slides if s["id"] in esistenti]
            f.write_text(json.dumps(ordinati, ensure_ascii=False, indent=1), encoding="utf-8")
            print(f"  [{mod}] SCRITTO {len(ordinati)} slide ({len(dati)} nuove)")

    await asyncio.gather(*(uno(m) for m in moduli))
    print("FATTO")

asyncio.run(main())
