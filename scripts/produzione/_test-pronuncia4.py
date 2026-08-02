# Round 4: ultimi due. ROI -> "ritorno sull'investimento". API -> 2 varianti da scegliere.
import sys, io, zipfile
from pathlib import Path
sys.path.insert(0, "scripts/produzione")
import azure_tts as A
tts = A.BatchTTS(A.carica_env()); cfg = tts.cfg

def wrap(inner):
    sil = (f'<mstts:silence type="Sentenceboundary-exact" value="{cfg["sil_frase"]}"/>'
           f'<mstts:silence type="Comma-exact" value="{cfg["sil_virgola"]}"/>'
           f'<mstts:silence type="Semicolon-exact" value="{cfg["sil_pv"]}"/>')
    return (f'<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" '
            f'xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="it-IT"><voice name="{tts.voce}">{sil}'
            f'<prosody rate="{cfg["rate"]}" pitch="{cfg["pitch"]}">{inner}</prosody><break time="1000ms"/></voice></speak>')

MCP = '<phoneme alphabet="ipa" ph="ˌɛmme ˌtʃi ˈpi">MCP</phoneme>'
casi = {
  "07_roi_italiano": "Senza una linea di base non puoi misurare il ritorno sull'investimento di un'iniziativa.",
  "11_api_inglese": f'Con le <phoneme alphabet="ipa" ph="ˌeɪpiˈaɪ">API</phoneme> e il protocollo {MCP} colleghiamo strumenti esterni in sicurezza.',
  "11_api_italiano_pause": f'Con le a<break time="70ms"/>pi<break time="70ms"/>i e il protocollo {MCP} colleghiamo strumenti esterni in sicurezza.',
}
ssmls, tags = [], []
for tag, inner in casi.items():
    ssmls.append(wrap(inner)); tags.append(tag); print(f"  {tag}")
data = tts.sintetizza("test-pron-ia-r4", ssmls, "test pronuncia IA round 4")
out = Path("produzione/_test-pronuncia-ia")
with zipfile.ZipFile(io.BytesIO(data)) as z:
    for wavname, tag in zip(sorted(n for n in z.namelist() if n.lower().endswith(".wav")), tags):
        (out / f"round4_{tag}.wav").write_bytes(z.read(wavname)); print(f"round4_{tag}.wav")
print("FATTO")
