# Round 7 — SOLO i 3 bocciati in en-US: prompt / onboarding / knowledge.
# prompt -> nativo piano (round1 ok). onboarding -> "inserimento". knowledge base -> "base di conoscenza".
# knowledge cutoff -> "cutoff" da solo en-US (knowledge tolto). Project/baseline restano en-US (già ok).
import sys, io, zipfile
from pathlib import Path
sys.path.insert(0, "scripts/produzione")
import azure_tts as A
tts = A.BatchTTS(A.carica_env()); cfg = tts.cfg
def EN(w): return f'<lang xml:lang="en-US">{w}</lang>'
def wrap(inner):
    sil = (f'<mstts:silence type="Sentenceboundary-exact" value="{cfg["sil_frase"]}"/>'
           f'<mstts:silence type="Comma-exact" value="{cfg["sil_virgola"]}"/>')
    return (f'<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" '
            f'xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="it-IT"><voice name="{tts.voce}">{sil}'
            f'<prosody rate="{cfg["rate"]}" pitch="{cfg["pitch"]}">{inner}</prosody><break time="1000ms"/></voice></speak>')
casi = {
  "prompt_nativo":    'Un prompt ben scritto riduce il numero di token e migliora la risposta del modello.',
  "onboarding_inserimento": 'L\'inserimento del nuovo collaboratore parte dalla libreria condivisa dei prompt.',
  "onboarding_nativo": 'L\'onboarding del team parte dalla libreria condivisa dei prompt.',
  "kb_base_conoscenza": f'Dentro un {EN("Project")} raccogliamo una base di conoscenza condivisa e aggiornata.',
  "kb_nativo":         f'Dentro un {EN("Project")} raccogliamo una knowledge base condivisa e aggiornata.',
  "cutoff_solo_en":    f'Ogni modello ha un {EN("cutoff")}, cioè una data limite dell\'addestramento.',
  "cutoff_descritto":  'Ogni modello ha una data limite di addestramento, oltre la quale non conosce i fatti nuovi.',
}
ssmls, tags = [], []
for tag, inner in casi.items():
    ssmls.append(wrap(inner)); tags.append(tag); print(f"  {tag}")
data = tts.sintetizza("test-pron-ia-r7", ssmls, "test round 7 prompt/onboarding/knowledge")
out = Path("produzione/_test-pronuncia-ia")
with zipfile.ZipFile(io.BytesIO(data)) as z:
    for wavname, tag in zip(sorted(n for n in z.namelist() if n.lower().endswith(".wav")), tags):
        (out / f"round7_{tag}.wav").write_bytes(z.read(wavname)); print(f"round7_{tag}.wav")
print("FATTO")
