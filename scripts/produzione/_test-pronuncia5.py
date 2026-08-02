# Round 5 — solo API, 3 approcci nuovi. Marcello è Multilingual: proviamo a dirla in INGLESE.
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
S = "Con le {} colleghiamo strumenti esterni in sicurezza."
casi = {
  "api_A_lang_en_natural": S.format('<lang xml:lang="en-US">API</lang>'),
  "api_B_lang_en_spelled": S.format('<lang xml:lang="en-US"><say-as interpret-as="characters">API</say-as></lang>'),
  "api_C_it_virgole": S.format('a, pi, i'),
}
ssmls, tags = [], []
for tag, inner in casi.items():
    ssmls.append(wrap(inner)); tags.append(tag); print(f"  {tag}")
data = tts.sintetizza("test-pron-ia-r5", ssmls, "test API round 5")
out = Path("produzione/_test-pronuncia-ia")
with zipfile.ZipFile(io.BytesIO(data)) as z:
    for wavname, tag in zip(sorted(n for n in z.namelist() if n.lower().endswith(".wav")), tags):
        (out / f"round5_{tag}.wav").write_bytes(z.read(wavname)); print(f"round5_{tag}.wav")
print("FATTO")
