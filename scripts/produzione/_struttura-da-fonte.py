# Costruisce le tabelle di produzione/<corso>/struttura.md (moduli + argomenti slide per slide) a
# partire dalla fonte estratta dagli HTML del committente (_fonte/mNN.txt: una sezione "## SEZIONE"
# per sezione dell'unità, una riga "### SCHERMATA" per schermata).
# Le slide di ogni modulo si ripartiscono fra le sezioni in proporzione alle schermate (resti più
# alti, minimo 2 per sezione): è la ripartizione VINCOLANTE che gen-pacchetto-html passa
# all'orchestratore. L'intestazione del file (riferimenti, verifiche, note) si scrive a mano.
# Uso: python scripts/produzione/_struttura-da-fonte.py <corso>   → stampa su stdout
import re, sys
from pathlib import Path

# durata dell'unità → (minuti di contenuto, slide): +1,5% sui minuti legali, ~4,5 min a slide
BUDGET = {"2 ore": (122, 27), "2 ore e 30": (152, 34), "3 ore": (183, 41)}

corso = sys.argv[1]
moduli = []
for f in sorted(Path(f"produzione/{corso}/_fonte").glob("m[0-9][0-9].txt")):
    righe = f.read_text(encoding="utf-8").splitlines()
    m = re.match(r"# UNITÀ (\d+) — (.+) \((.+)\)$", righe[0])
    n, titolo, ore = int(m[1]), m[2], m[3]
    sezioni = []
    for r in righe:
        if s := re.match(r"## SEZIONE \d+ — (.+)$", r):
            sezioni.append([s[1], []])
        elif s := re.match(r"### SCHERMATA \d+ — (.+) \[[^\]]+\]$", r):
            sezioni[-1][1].append(s[1])
    minuti, slide = BUDGET[ore]
    # la prima schermata di ogni sezione è il suo frontespizio (stesso titolo): non è un argomento
    for s in sezioni:
        if s[1] and s[1][0] == s[0]:
            s[1] = s[1][1:]
    pesi = [max(1, len(s[1])) for s in sezioni]
    quote = [max(2.0, slide * p / sum(pesi)) for p in pesi]
    scala = slide / sum(quote)
    quote = [max(2.0, q * scala) for q in quote]
    interi = [int(q) for q in quote]
    resti = sorted(range(len(quote)), key=lambda i: quote[i] - interi[i], reverse=True)
    i = 0
    while sum(interi) < slide:
        interi[resti[i % len(resti)]] += 1
        i += 1
    while sum(interi) > slide:
        j = max(range(len(interi)), key=lambda k: interi[k] - quote[k])
        interi[j] -= 1
    assert sum(interi) == slide and min(interi) >= 2, (n, interi)
    moduli.append((n, titolo, minuti, slide, sezioni, interi))

print("| Mod | Titolo | Copre (fonte HTML) | Durata | Slide |\n|---|---|---|---|---|")
for n, titolo, minuti, slide, sezioni, _ in moduli:
    print(f"| M{n} | {titolo} | {'; '.join(s[0] for s in sezioni)} | {minuti} min | {slide} |")
tm, ts = sum(m[2] for m in moduli), sum(m[3] for m in moduli)
print(f"\n**Totale: {tm:,} min ({tm // 60}h {tm % 60}m) · {ts} slide.**\n".replace(",", "."))
print("## Argomenti per modulo (slide per slide)\n")
for n, titolo, minuti, slide, sezioni, interi in moduli:
    print(f"### M{n} — {titolo} ({slide} slide)")
    for k, ((sez, schermate), q) in enumerate(zip(sezioni, interi)):
        testa = ("Benvenuto e apertura del corso. " if n == 1 else "Bentornato e mappa dell'unità. ") if k == 0 else ""
        coda = ((" Chiusura del corso e preparazione all'esame finale." if n == len(moduli) else " Verso il checkpoint.") if k == len(sezioni) - 1 else "")
        print(f"- {testa}{sez}: {'; '.join(schermate)}.{coda} — {q} slide")
    print()
