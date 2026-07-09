#!/usr/bin/env python3
"""Controllo ortografico COMPLETO dei copioni contro un dizionario italiano reale
(Hunspell it_IT via spylls) — complementa il gate E9 del linter, che è una lista
curata di parole sempre-accentate. Qui si valida OGNI parola.

Logica anti-falso-positivo:
- parola nel dizionario -> ok
- parola nella whitelist (termini tecnici/inglesi/nomi propri) -> ok
- parola sconosciuta MA una sua variante accentata è nel dizionario -> ERRORE accento
  (es. "perche" -> "perché", "attivita" -> "attività": altissima confidenza)
- parola sconosciuta e nessuna variante accentata valida -> AVVISO da rivedere
  (o è un termine da aggiungere in whitelist, o è un refuso vero)

Uso: python scripts/produzione/spellcheck.py <corso> [--modulo mNN] [--strict]
  --strict: gli AVVISI diventano errori (exit 1) — utile prima del LOCK
Exit 1 se ci sono ERRORI accento (o avvisi con --strict).
"""
import os, sys, json, re, itertools
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

corso = sys.argv[1] if len(sys.argv) > 1 else None
modulo = sys.argv[sys.argv.index("--modulo") + 1] if "--modulo" in sys.argv else None
strict = "--strict" in sys.argv
if not corso:
    sys.exit("Uso: spellcheck.py <corso> [--modulo mNN] [--strict]")

from spylls.hunspell import Dictionary
DICT = Dictionary.from_files(str(Path(__file__).parent / "dict" / "it_IT"))

# whitelist: termini tecnici, sigle, prestiti inglesi, nomi propri ammessi (minuscolo)
WL_PATH = Path(__file__).parent / "spellcheck-whitelist.txt"
WHITELIST = set()
if WL_PATH.exists():
    WHITELIST = {w.strip().lower() for w in WL_PATH.read_text(encoding="utf-8").splitlines()
                 if w.strip() and not w.startswith("#")}

VOCALI = {"a": "àá", "e": "èé", "i": "ìí", "o": "òó", "u": "ùú"}

def varianti_accentate(w):
    """Genera le varianti con UN accento aggiunto (le parole italiane hanno un accento)."""
    posizioni = [(i, c) for i, c in enumerate(w) if c in VOCALI]
    for i, c in posizioni:
        for acc in VOCALI[c]:
            yield w[:i] + acc + w[i + 1:]

def in_dict(w):
    try:
        return bool(DICT.lookup(w))
    except Exception:
        return False

# PRODUZIONE_ROOT: stessa convenzione di lib.mjs (staging root dell'orchestratore)
base = Path(os.environ.get("PRODUZIONE_ROOT", "produzione")) / corso
copioni = json.loads((base / "copioni.json").read_text(encoding="utf-8"))

errori, avvisi = [], []
parola_re = re.compile(r"[a-zàèéìíòóùúA-ZÀÈÉÌÒÙ]+(?:'[a-zàèéìíòóùú]+)?")
visti_avviso = {}

for s in copioni["slides"]:
    if modulo and f"_{modulo}_" not in s["id"]:
        continue
    for m in parola_re.finditer(s["testo"]):
        tok = m.group(0)
        # gestisce l'apostrofo: "dell'audit" -> valuta "audit"
        w = tok.split("'")[-1] if "'" in tok else tok
        wl = w.lower()
        if len(wl) < 3 or wl in WHITELIST or in_dict(w) or in_dict(wl):
            continue
        # variante accentata valida? -> errore accento
        acc = next((v for v in varianti_accentate(wl) if in_dict(v)), None)
        if acc:
            errori.append((s["id"], w, acc))
        else:
            visti_avviso[wl] = visti_avviso.get(wl, 0) + 1

for sid, w, acc in errori:
    print(f"  ERRORE ORTO [{sid}] accento mancante: \"{w}\" -> \"{acc}\"")
if visti_avviso:
    print(f"\n  {len(visti_avviso)} parole non nel dizionario (rivedere o aggiungere a whitelist):")
    for w, n in sorted(visti_avviso.items(), key=lambda x: -x[1]):
        print(f"    {w} (x{n})")

n = sum(1 for s in copioni["slides"] if not modulo or f"_{modulo}_" in s["id"])
print(f"\n{n} slide · {len(errori)} ERRORI accento · {len(visti_avviso)} parole fuori dizionario")
if errori or (strict and visti_avviso):
    print("SPELLCHECK FALLITO.")
    sys.exit(1)
print("SPELLCHECK OK.")
