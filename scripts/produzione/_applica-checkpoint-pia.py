# Applica produzione/fadpia01/_checkpoint-esercitazioni.json ai checkpoint di copioni.json: sostituisce le
# domande indicate e aggiunge le voci delle esercitazioni del committente (strada A). Per ogni domanda
# la slide di riferimento è la prima del modulo che contiene la frase «cerca» (se non c'è, si ferma: la
# narrazione deve sostenere la risposta). Le opzioni si rimescolano con un seme fisso, così la risposta
# corretta non sta sempre in prima posizione. Idempotente: una domanda già presente non si ripete.
# Uso: python scripts/produzione/_applica-checkpoint-pia.py
import json, random, sys
from pathlib import Path

CORSO = "fadpia01"
cp = Path(f"produzione/{CORSO}/copioni.json")
c = json.loads(cp.read_text(encoding="utf-8"))
voci = json.loads(Path(f"produzione/{CORSO}/_checkpoint-esercitazioni.json").read_text(encoding="utf-8"))
caso = random.Random(11493)


def slide_di(mod: str, frase: str) -> str:
    for s in c["slides"]:
        if s["id"].split("_")[1] == mod and frase.lower() in s["testo"].lower():
            return s["id"].split("_")[-1]
    sys.exit(f"{mod}: nessuna slide contiene «{frase}»: la risposta non è sostenuta dalla narrazione")


def domanda(mod: str, d: dict) -> dict:
    giusta = d["opzioni"][d["corretta"]]
    opz = d["opzioni"][:]
    caso.shuffle(opz)
    return {"q": d["q"], "opzioni": opz, "corretta": opz.index(giusta), "tipo": d["tipo"], "slide": slide_di(mod, d["cerca"])}


for mod, d in voci["sostituisci"].items():
    banca = c["checkpoint"][mod]["banca"]
    ix = [i for i, q in enumerate(banca) if q["q"] == d["vecchia"]]
    if ix:
        banca[ix[0]] = domanda(mod, d)
        print(f"{mod}: sostituita «{d['vecchia'][:50]}»")
    elif not any(q["q"] == d["q"] for q in banca):
        sys.exit(f"{mod}: domanda da sostituire non trovata")

for mod, lista in voci["aggiungi"].items():
    banca = c["checkpoint"][mod]["banca"]
    nuove = [domanda(mod, d) for d in lista if not any(q["q"] == d["q"] for q in banca)]
    banca.extend(nuove)
    print(f"{mod}: +{len(nuove)} → {len(banca)} domande")

cp.write_text(json.dumps(c, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
