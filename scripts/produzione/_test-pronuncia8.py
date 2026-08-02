# Round 8 — verifica W7: quali gerundi/imperativi+enclitico marcello sbaglia davvero?
# imperativi comuni (sospetti falsi positivi): fermati, ricordati
# gerundio+enclitico (trappola documentata -ndo+pron): collegandola, facendolo, affidandoti, sfruttandone
import sys, io, zipfile
from pathlib import Path
sys.path.insert(0, "scripts/produzione")
import azure_tts as A
tts = A.BatchTTS(A.carica_env()); cfg = tts.cfg
def wrap(inner):
    sil = (f'<mstts:silence type="Sentenceboundary-exact" value="{cfg["sil_frase"]}"/>'
           f'<mstts:silence type="Comma-exact" value="{cfg["sil_virgola"]}"/>')
    return (f'<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" '
            f'xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="it-IT"><voice name="{tts.voce}">{sil}'
            f'<prosody rate="{cfg["rate"]}" pitch="{cfg["pitch"]}">{inner}</prosody><break time="1000ms"/></voice></speak>')
casi = {
  "fermati":     "Fermati un momento e rileggi la risposta prima di usarla.",
  "ricordati":   "Ricordati di verificare sempre le fonti prima di decidere.",
  "collegandola": "Analizzi la richiesta collegandola agli obiettivi del progetto.",
  "facendolo":   "Puoi migliorare il risultato facendolo revisionare da un collega.",
  "affidandoti": "Non perdere il senso critico affidandoti solo al modello.",
  "sfruttandone": "Organizzi il lavoro sfruttandone i punti di forza.",
}
ssmls, tags = [], []
for tag, inner in casi.items():
    ssmls.append(wrap(inner)); tags.append(tag); print(f"  {tag}")
data = tts.sintetizza("test-pron-ia-r8", ssmls, "verifica W7 gerundi/imperativi")
out = Path("produzione/_test-pronuncia-ia")
with zipfile.ZipFile(io.BytesIO(data)) as z:
    for wavname, tag in zip(sorted(n for n in z.namelist() if n.lower().endswith(".wav")), tags):
        (out / f"round8_{tag}.wav").write_bytes(z.read(wavname)); print(f"round8_{tag}.wav")
print("FATTO")
