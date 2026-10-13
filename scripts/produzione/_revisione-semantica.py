#!/usr/bin/env python3
"""Revisore semantico dell'orchestratore, lanciato da solo su bozze che non ci sono passate (moduli
fermati dai gate di lunghezza e poi snelliti a mano). Legge e segnala, non riscrive: le segnalazioni
si chiudono a mano. Scrive l'esito in _log/<mNN>.state.json (campo semantica).
Uso: python scripts/produzione/_revisione-semantica.py <corso> <mNN> [<mNN> ...]"""
import asyncio, json, sys
sys.path.insert(0, "scripts/produzione")
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
import orchestratore as O

corso, moduli = sys.argv[1], sys.argv[2:]


async def main():
    env = O.carica_env(); client = O.client_azure(env)
    contratto = (O.REPO / "docs/produzione-corsi/REVISIONE-MERITO.md").read_text(encoding="utf-8")  # come l'orchestratore

    async def uno(mod):
        bozza = O.leggi_json(O.PROD / corso / "_bozze" / f"{mod}.json")
        pacchetto = O.genera_pacchetto(corso, mod)
        mdl = O.Modello(client, env, {"input": 0, "output": 0, "chiamate": 0})
        rev = await O.revisione_semantica(mdl, mod, contratto, O.sezione_norma(pacchetto), O.blocco_skeleton(pacchetto), bozza)
        st = O.leggi_json(O.stato_path(corso, mod), {"modulo": mod})
        st["semantica"] = rev
        O.salva_stato(corso, mod, st)
        print(f"\n[{mod}] {rev['esito']} · {len(rev['segnalazioni'])} segnalazioni")
        for s in rev["segnalazioni"]:
            print(f"  {s['slide']} [{s['gravita']}] {s['problema']}\n     FONTE: {s['riferimento_norma']}")

    await asyncio.gather(*(uno(m) for m in moduli))

asyncio.run(main())
