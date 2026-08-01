# Scioglimento W7 sui copioni Energy: SOLO le forme che la batteria di pronuncia ha bocciato
# all'ascolto (imperativo + pronome enclitico, gerundio + "ti"). I participi che il linter
# non sa distinguere ("consumi concentrati", "impianti fermati", "chilowatt impegnati")
# restano: sono italiano corretto e cambiarli peggiorerebbe il testo.
# Ogni sostituzione è ancorata alla slide: se non trova l'ancora, si ferma.
import json, sys
from pathlib import Path

FIX = [
    ("m01_s019", "verificane la validità e assicurati che sia coerente",
                 "verifica la validità e controlla che sia coerente"),
    ("m01_s039", "chiediti quale soggetto", "chiedi a te stesso quale soggetto"),
    ("m01_s040", "chiediti quale attore", "chiedi a te stesso quale attore"),
    ("m02_s016", "Se divergono molto, fermati.", "Se divergono molto, non andare avanti."),
    ("m03_s023", "prima chiediti qual è", "prima chiedi a te stesso qual è"),
    ("m03_s037", "Chiediti se quel numero", "Chiedi a te stesso se quel numero"),
    ("m03_s043", "Fermati un momento su ciò che è successo.",
                 "Osserva un momento ciò che è successo."),
    ("m03_s050", "Chiediti rispetto a che cosa", "Chiedi a te stesso rispetto a che cosa"),
    ("m03_s050", "Chiediti se quel rapporto sia stabile", "Verifica se quel rapporto sia stabile"),
    ("m03_s050", "Chiediti se nel corso dell'anno", "Controlla se nel corso dell'anno"),
    ("m04_s026", "Chiediti se quell'utenza", "Chiedi a te stesso se quell'utenza"),
    ("m05_s024", "Chiediti in che posizione", "Chiedi a te stesso in che posizione"),
    ("m08_s021", "Fermati un momento sulla distanza", "Osserva un momento la distanza"),
    ("m08_s053", "chiudendo il percorso e preparandoti al passaggio successivo",
                 "chiudendo il percorso e aprendo il passaggio successivo"),
    ("m10_s023", "fermati e verifica che cosa comprende", "non accettarlo e verifica che cosa comprende"),
    ("m10_s023", "Chiediti sempre se il numero", "Chiedi sempre a te stesso se il numero"),
    ("m10_s054", "domandati sempre a quale grandezza", "chiedi sempre a te stesso a quale grandezza"),
]

path = Path("produzione/fadeen02/copioni.json")
c = json.loads(path.read_text(encoding="utf-8"))
per_id = {s["id"]: s for s in c["slides"]}
fatti, mancati = 0, []
for coda, vecchio, nuovo in FIX:
    s = per_id.get(f"fadeen02_{coda}")
    if s is None or vecchio not in s["testo"]:
        mancati.append((coda, vecchio[:45])); continue
    s["testo"] = s["testo"].replace(vecchio, nuovo, 1)
    fatti += 1

if mancati:
    print("ANCORE NON TROVATE (nessuna modifica scritta):")
    for coda, v in mancati:
        print(f"  {coda}: {v}…")
    sys.exit(1)

path.write_text(json.dumps(c, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"{fatti}/{len(FIX)} sostituzioni applicate")
