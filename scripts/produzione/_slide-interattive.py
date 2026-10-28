# Slide INTERATTIVE di un corso (esercitazioni del committente e calcolatori a formula fissa): dopo
# _converti-slide-src.py sostituisce, nei _slide-src/<corso>-<mNN>-contenuti.json, le slide elencate in
# produzione/<corso>/_esercizi-interattivi.json con il layout esercizio o calcolatore di build-slide.mjs.
#   "slide": esercitazioni complete e calcolatori, definiti per intero;
#   "casi":  una prova per CASO, sulla prima slide del caso: { "<id>": { "da": "<id esercitazione>", "campo": N } }
#            riusa il campo N dell'esercitazione (stessa domanda, opzioni, risposte e spiegazione).
# Il kicker resta quello della slide convertita; ogni slide indicata deve esistere (altrimenti si ferma).
# Idempotente: rilanciarlo riscrive le stesse slide.
# Uso: python scripts/produzione/_slide-interattive.py <corso>
import json, sys
from pathlib import Path

corso = sys.argv[1]
dati = json.loads(Path(f"produzione/{corso}/_esercizi-interattivi.json").read_text(encoding="utf-8"))
voci = dict(dati["slide"])
for sid, c in dati.get("casi", {}).items():
    if sid in voci:
        sys.exit(f"{sid}: già usata da un'esercitazione completa")
    if "campi" in c:  # domanda propria del caso (es. «quale attività viene subito dopo?»)
        voci[sid] = {k: v for k, v in c.items() if k in ("titolo", "intro", "campi", "kicker")}
        continue
    es = dati["slide"][c["da"]]
    campo = es["campi"][c["campo"]]
    voci[sid] = {"titolo": c.get("titolo") or f"Prova tu: {campo['h']}", "intro": c.get("intro") or es["intro"], "campi": [campo],
                 **({"kicker": c["kicker"]} if c.get("kicker") else {})}
fatte = set()
for f in sorted(Path(f"produzione/{corso}/_slide-src").glob(f"{corso}-m*-contenuti.json")):
    contenuti = json.loads(f.read_text(encoding="utf-8"))
    cambiate = 0
    for i, s in enumerate(contenuti):
        x = voci.get(s["id"])
        if not x:
            continue
        contenuti[i] = {"id": s["id"], "layout": x.get("layout", "esercizio"), "kicker": s.get("kicker", ""), "ref": "Prova tu",
                        **{k: v for k, v in x.items() if k != "layout"}}  # un kicker del caso vince su quello convertito
        fatte.add(s["id"]); cambiate += 1
    if cambiate:
        f.write_text(json.dumps(contenuti, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"  {f.name}: {cambiate} slide interattive")
mancanti = sorted(set(voci) - fatte)
if mancanti:
    sys.exit(f"slide interattive senza posto nei contenuti: {mancanti}")
print(f"FATTO: {len(fatte)} slide interattive")
