#!/usr/bin/env python3
"""Revisione semantica (livello 2) di moduli GIÀ dentro copioni.json.

L'orchestratore la esegue sulle bozze che genera lui; un corso costruito per altra via
(per esempio l'aggiornamento di edizione, aggiorna-edizione.py) deve poterla ricevere
lo stesso: stesso contratto, stessa sezione di norma, stesso schema di uscita.

Uso: python scripts/produzione/revisione-modulo.py <corso> m03 m04 …
Esito: produzione/<corso>/_log/<mNN>.revisione.json (+ riepilogo a schermo)
"""
from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
import orchestratore as O  # noqa: E402


async def revisiona(corso: str, moduli: list[str]) -> None:
    env = O.carica_env()
    client = O.client_azure(env)
    contratto = (O.REPO / "docs/produzione-corsi/REVISIONE-MERITO.md").read_text(encoding="utf-8")
    cop = O.leggi_json(O.PROD / corso / "copioni.json")
    sem = asyncio.Semaphore(4)

    async def uno(mod: str) -> None:
        slides = [s for s in cop["slides"] if s["id"].split("_")[1] == mod]
        if not slides:
            print(f"[{mod}] nessuna slide"); return
        pacchetto = O.genera_pacchetto(corso, mod)
        async with sem:
            mdl = O.Modello(client, env, {"input": 0, "output": 0, "chiamate": 0})
            rev = await O.revisione_semantica(mdl, mod, contratto, O.sezione_norma(pacchetto),
                                              O.blocco_skeleton(pacchetto), {"slides": slides})
        O.scrivi_atomico(O.PROD / corso / "_log" / f"{mod}.revisione.json",
                         json.dumps(rev, ensure_ascii=False, indent=1) + "\n")
        seg = rev.get("segnalazioni", [])
        alte = [s for s in seg if s.get("gravita") == "alta"]
        medie = [s for s in seg if s.get("gravita") == "media"]
        print(f"[{mod}] {rev.get('esito')} — {len(alte)} alte, {len(medie)} medie, {len(seg)} totali")
        for s in alte + medie[:3]:
            print(f"    {s.get('gravita','?'):6} [{s.get('slide','-')}] {str(s.get('problema',''))[:150]}")

    await asyncio.gather(*(uno(m) for m in moduli))


if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit("Uso: revisione-modulo.py <corso> <mNN> [<mNN> …]")
    asyncio.run(revisiona(sys.argv[1], sys.argv[2:]))
