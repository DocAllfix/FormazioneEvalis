# Round 6 — parole inglesi via <lang en-US> (marcello Multilingual). Confrontiamo con le versioni
# italiane/IPA precedenti per scegliere caso per caso. MCP resta IPA (già buono).
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
  "claude":   f'{EN("Claude")} è l\'assistente di intelligenza artificiale che useremo in questo corso.',
  "prompt_token": f'Un {EN("prompt")} ben scritto riduce il numero di {EN("token")} e migliora la risposta.',
  "template": f'Conviene salvare il {EN("prompt")} come {EN("template")} riutilizzabile per il team.',
  "workflow": f'Un {EN("workflow")} agentico coordina più passaggi in automatico, con punti di conferma.',
  "project_kb": f'Dentro un {EN("Project")} raccogliamo una {EN("knowledge base")} condivisa e aggiornata.',
  "baseline":  f'Senza una {EN("baseline")} non puoi misurare il ritorno sull\'investimento.',
  "cutoff":    f'Ogni modello ha un {EN("knowledge cutoff")}, cioè una data limite dell\'addestramento.',
  "onboarding": f'L\'{EN("onboarding")} del team parte dalla libreria condivisa dei prompt.',
  "api_mcp":   f'Con le {EN("API")} e il protocollo <phoneme alphabet="ipa" ph="ˌɛmme ˌtʃi ˈpi">MCP</phoneme> colleghiamo strumenti esterni.',
}
ssmls, tags = [], []
for tag, inner in casi.items():
    ssmls.append(wrap(inner)); tags.append(tag); print(f"  {tag}")
data = tts.sintetizza("test-pron-ia-r6", ssmls, "test parole inglesi round 6")
out = Path("produzione/_test-pronuncia-ia")
with zipfile.ZipFile(io.BytesIO(data)) as z:
    for wavname, tag in zip(sorted(n for n in z.namelist() if n.lower().endswith(".wav")), tags):
        (out / f"round6_{tag}.wav").write_bytes(z.read(wavname)); print(f"round6_{tag}.wav")
print("FATTO")
