# Ripara le voci di slide in cui il titoletto è la frase TAGLIATA e la riga sotto la ripete
# intera ("Supporti esterni dentro la" / "Supporti esterni dentro la valutazione"): a schermo
# la frase compare due volte, la prima mozzata. Succede quando il generatore riempie sia `h`
# sia `d` partendo dallo stesso testo. Si tiene la versione INTERA, una volta sola.
# Uso: python scripts/produzione/_ripara-troncature.py <corso> [<corso> ...] [--prova]
import json, glob, sys

sys.stdout.reconfigure(encoding="utf-8")
corsi = [a for a in sys.argv[1:] if not a.startswith("--")]
prova = "--prova" in sys.argv
CHIAVI = ("numeri", "tappe", "cards", "punti", "passi", "voci")

for corso in corsi:
    riparate, slide_tocche = 0, set()
    for f in sorted(glob.glob(f"produzione/{corso}/_slide-src/*.json")):
        dati = json.load(open(f, encoding="utf-8"))
        for s in dati:
            for k in CHIAVI:
                for v in (s.get(k) or []):
                    if not isinstance(v, dict): continue
                    h, d = (v.get("h") or "").strip(), (v.get("d") or "").strip()
                    if not h or not d or h == d: continue
                    if d.startswith(h) or h.startswith(d):
                        v["h"], v["d"] = (d if len(d) > len(h) else h), ""
                        riparate += 1; slide_tocche.add(s["id"])
        if not prova:
            json.dump(dati, open(f, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{corso}: {riparate} voci riparate su {len(slide_tocche)} slide")
    for sid in sorted(slide_tocche): print(f"  {sid}")
