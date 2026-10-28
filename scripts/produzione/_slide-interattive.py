# Slide INTERATTIVE di un corso (esercitazioni del committente e calcolatori a formula fissa): dopo
# _converti-slide-src.py sostituisce, nei _slide-src/<corso>-<mNN>-contenuti.json, le slide elencate in
# produzione/<corso>/_esercizi-interattivi.json con il layout esercizio o calcolatore di build-slide.mjs.
# Il kicker resta quello della slide convertita; ogni slide indicata deve esistere (altrimenti si ferma).
# Idempotente: rilanciarlo riscrive le stesse slide.
# Uso: python scripts/produzione/_slide-interattive.py <corso>
import json, sys
from pathlib import Path

corso = sys.argv[1]
voci = json.loads(Path(f"produzione/{corso}/_esercizi-interattivi.json").read_text(encoding="utf-8"))["slide"]
fatte = set()
for f in sorted(Path(f"produzione/{corso}/_slide-src").glob(f"{corso}-m*-contenuti.json")):
    dati = json.loads(f.read_text(encoding="utf-8"))
    cambiate = 0
    for i, s in enumerate(dati):
        x = voci.get(s["id"])
        if not x:
            continue
        dati[i] = {"id": s["id"], "layout": x.get("layout", "esercizio"), "kicker": s.get("kicker", ""), "ref": "Prova tu",
                   **{k: v for k, v in x.items() if k != "layout"}}
        fatte.add(s["id"]); cambiate += 1
    if cambiate:
        f.write_text(json.dumps(dati, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"  {f.name}: {cambiate} slide interattive")
mancanti = sorted(set(voci) - fatte)
if mancanti:
    sys.exit(f"slide interattive senza posto nei contenuti: {mancanti}")
print(f"FATTO: {len(fatte)} slide interattive")
