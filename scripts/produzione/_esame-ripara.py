# Riparazione dell'esame finale generato: due difetti sistematici del modello.
#  1) apostrofi mangiati negli articoli elisi ("dell energia" -> "dell'energia"): il modello
#     interpreta troppo alla larga la regola "niente simboli", che vale per il PARLATO.
#  2) risposta corretta quasi sempre in prima posizione: chi tira a indovinare sulla prima
#     opzione passerebbe l'esame. Le opzioni vengono ruotate per distribuire l'indice giusto.
# Uso: python _esame-ripara.py <corso>
import sys, json, re
from pathlib import Path

# "un" è ESCLUSO di proposito: "un anno" è corretto senza apostrofo, "un'impresa" no —
# la scelta dipende dal genere e non si può decidere con una regola meccanica.
ELISI = re.compile(r"\b(l|dell|nell|all|dall|sull|quest|quell|d)\s+(?=[aeiouAEIOU])")
UN_DUBBIO = re.compile(r"\bun\s+(?=[aeiouAEIOU])")

corso = sys.argv[1]
path = Path(f"produzione/{corso}/copioni.json")
c = json.loads(path.read_text(encoding="utf-8"))
banca = c["esameFinale"]["banca"]

# 1 — apostrofi
n_ap, dubbi = 0, []
for i, q in enumerate(banca):
    def fix(t: str) -> str:
        global n_ap
        nuovo, k = ELISI.subn(lambda m: m.group(1) + "'", t)
        n_ap += k
        return nuovo
    q["q"] = fix(q["q"])
    q["opzioni"] = [fix(o) for o in q["opzioni"]]
    for m in UN_DUBBIO.finditer(q["q"] + " " + " ".join(q["opzioni"])):
        dubbi.append(f"  d{i+1:02d}: …un {(q['q'] + ' ' + ' '.join(q['opzioni']))[m.end():m.end()+22]}…")

# 2 — rotazione delle opzioni: l'indice corretto gira 0,1,2,3,0,1,2,3…
for i, q in enumerate(banca):
    testo_giusto = q["opzioni"][q["corretta"]]      # si tiene il TESTO, non l'indice
    voluto = i % 4
    delta = (voluto - q["corretta"]) % 4
    if delta:
        opz = q["opzioni"]
        q["opzioni"] = [opz[(j - delta) % 4] for j in range(4)]
        q["corretta"] = voluto
    # la risposta giusta deve restare la stessa frase di prima, solo spostata
    assert q["opzioni"][q["corretta"]] == testo_giusto, f"rotazione errata sulla domanda {i+1}"
    assert sorted(q["opzioni"]) == sorted(set(q["opzioni"])), f"opzioni duplicate sulla domanda {i+1}"

path.write_text(json.dumps(c, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
from collections import Counter
print(f"{corso}: {n_ap} apostrofi ripristinati · distribuzione corrette "
      f"{dict(sorted(Counter(q['corretta'] for q in banca).items()))}")
if dubbi:
    print(f'DA GUARDARE A MANO ({len(dubbi)} casi "un" + vocale, il genere decide l\'apostrofo):')
    for d in dubbi[:12]:
        print(d)
