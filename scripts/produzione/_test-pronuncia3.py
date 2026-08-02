# Round 3: soluzioni DIVERSE per gli ultimi 4 difficili.
#  - baseline -> "linea di base" (testo italiano)
#  - API, HTML -> <say-as interpret-as="characters"> (sillabazione nativa Azure)
#  - AI Act -> testo fonetico "ei ai act"
#  - MCP resta IPA (già buono)
import sys, io, zipfile
from pathlib import Path
sys.path.insert(0, "scripts/produzione")
import azure_tts as A

tts = A.BatchTTS(A.carica_env())
cfg = tts.cfg

def wrap(inner):
    sil = (f'<mstts:silence type="Sentenceboundary-exact" value="{cfg["sil_frase"]}"/>'
           f'<mstts:silence type="Comma-exact" value="{cfg["sil_virgola"]}"/>'
           f'<mstts:silence type="Semicolon-exact" value="{cfg["sil_pv"]}"/>')
    corpo = f'<prosody rate="{cfg["rate"]}" pitch="{cfg["pitch"]}">{inner}</prosody>'
    return (f'<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" '
            f'xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="it-IT">'
            f'<voice name="{tts.voce}">{sil}{corpo}<break time="1000ms"/></voice></speak>')

SAY = '<say-as interpret-as="characters">{}</say-as>'
casi = {
  "07_baseline_it": "Senza una linea di base non puoi misurare il erre o i di un'iniziativa.",
  "11_api_sayas": f"Con le {SAY.format('API')} e il protocollo <phoneme alphabet=\"ipa\" ph=\"ˌɛmme ˌtʃi ˈpi\">MCP</phoneme> colleghiamo strumenti esterni in sicurezza.",
  "14_aiact_fonetico": "L'ei ai act richiede un livello adeguato di alfabetizzazione in materia di I.A..",
  "15_html_sayas": f"Uno strumento {SAY.format('HTML')} d'ufficio può salvare i dati in locale, senza inviarli da nessuna parte.",
}
ssmls, tags = [], []
for tag, inner in casi.items():
    ssmls.append(wrap(inner)); tags.append(tag)
    print(f"  {tag}")

data = tts.sintetizza("test-pron-ia-r3", ssmls, "test pronuncia IA round 3")
out = Path("produzione/_test-pronuncia-ia")
with zipfile.ZipFile(io.BytesIO(data)) as z:
    names = sorted(n for n in z.namelist() if n.lower().endswith(".wav"))
    for wavname, tag in zip(names, tags):
        (out / f"round3_{tag}.wav").write_bytes(z.read(wavname))
        print(f"round3_{tag}.wav")
print("FATTO")
