# Fedeltà delle CIFRE scritte sulle slide (tabelle, numeri, grafici, testi) alla fonte del committente.
# I layout calcolo/simulatore prendono i dati dalla fonte e si saltano; tutto il resto lo scrive il
# modello. Una cifra sulla slide è giustificata se è un numero della fonte del modulo o del parlato
# di QUELLA slide, o un suo arrotondamento o una conversione per mille (stadio stretto di
# _numeri-parlato.py). Anni, numeri di norma e numeri sotto 13 senza decimali non si controllano.
# Uso: python scripts/produzione/_numeri-slide.py <corso> [mNN ...]   — esce con 1 se resta un dubbio
import glob, json, re, sys
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8")
src = open("scripts/produzione/_numeri-parlato.py", encoding="utf-8").read().split("async def giudica")[0]
exec(src.split("corso = sys.argv[1]")[0])   # numeri_del_testo, numeri_della_fonte, stretto

corso = sys.argv[1]
moduli = [a for a in sys.argv[2:] if re.fullmatch(r"m\d\d", a)]
base = Path(f"produzione/{corso}")
cop = {s["id"]: s["testo"] for s in json.loads((base / "copioni.json").read_text(encoding="utf-8"))["slides"]}
NORME = re.compile(r"(?:ISO(?:/IEC)?|UNI|EN|PAS|IEC)\s*\d[\d\-:.]*|\b(?:19|20)\d\d\b|\bAR[456]\b|\bR-\d+[A-Z]?|HFC-\d+[a-z]?|\b[A-Z]{1,3}\d\b|Scope\s*\d|\bcategori[ae]\s+\d+(?:\s*(?:e|-|–)\s*\d+)?|\bs\d{3}\b|\bm\d\d\b|\bModulo\s+\d+|\b\d{1,2}\.\d(?:\.\d)*\b")


def stringhe(v, fuori):
    if isinstance(v, str): fuori.append(v)
    elif isinstance(v, list):
        for x in v: stringhe(x, fuori)
    elif isinstance(v, dict):
        for k, x in v.items():
            if k not in ("id", "layout", "modNum", "prossimo", "label", "footer"): stringhe(x, fuori)
    elif isinstance(v, (int, float)) and not isinstance(v, bool): fuori.append(str(v).replace(".", ","))
    return fuori


dubbi = tot = 0
for f in sorted(glob.glob(str(base / "_slide-src" / f"{corso}-m*-contenuti.json"))):
    mod = re.search(r"-(m\d\d)-", f).group(1)
    if moduli and mod not in moduli: continue
    F = numeri_della_fonte((base / "_fonte" / f"{mod}.txt").read_text(encoding="utf-8"))
    for x in json.load(open(f, encoding="utf-8")):
        if x["layout"] in ("calcolo", "simulatore"): continue
        P = {v for v, d, _, _ in numeri_del_testo(cop.get(x["id"], "")) if v == v}
        testo = " · ".join(stringhe(x, []))
        testo = NORME.sub(" ", testo)
        for m in re.finditer(r"(?<![\w.,])\d{1,3}(?:\.\d{3})+(?:,\d+)?(?![\w])|(?<![\w.,])\d+(?:,\d+)?(?![\w])", testo):
            g = m.group(0); v = float(g.replace(".", "").replace(",", ".")); dec = len(g.split(",")[1]) if "," in g else 0
            if dec == 0 and v < 13: continue
            tot += 1
            if stretto(v, dec, F | P) is None:
                dubbi += 1
                print(f"  ? {x['id']} [{x['layout']}] «{g}» — …{testo[max(0, m.start() - 60):m.end() + 40]}…")
print(f"TOTALE: {tot} cifre sulle slide · {dubbi} senza riscontro nella fonte o nel parlato")
sys.exit(1 if dubbi else 0)
