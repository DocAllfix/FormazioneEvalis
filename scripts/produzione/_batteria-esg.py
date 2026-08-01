# Batteria di pronuncia ESG (FAD-ESG-02): sintetizza le frasi di
# produzione/fadesg02/_test-pronuncia/frasi.txt con lo STESSO motore, voce e glossario
# della produzione, così ciò che si ascolta è ciò che uscirà davvero nelle 540 slide.
import sys, io, json, zipfile
from pathlib import Path
sys.path.insert(0, "scripts/produzione")
import azure_tts as A

CORSO = sys.argv[1] if len(sys.argv) > 1 else "fadesg02"
BASE = Path(f"produzione/{CORSO}/_test-pronuncia")
gloss = json.loads(Path(f"produzione/{CORSO}/glossario-tts.json").read_text(encoding="utf-8"))
tts = A.BatchTTS(A.carica_env()); cfg = tts.cfg

def wrap(inner):
    sil = (f'<mstts:silence type="Sentenceboundary-exact" value="{cfg["sil_frase"]}"/>'
           f'<mstts:silence type="Comma-exact" value="{cfg["sil_virgola"]}"/>')
    return (f'<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" '
            f'xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="it-IT"><voice name="{tts.voce}">{sil}'
            f'<prosody rate="{cfg["rate"]}" pitch="{cfg["pitch"]}">{inner}</prosody><break time="600ms"/></voice></speak>')

frasi, gruppo = [], ""
for riga in BASE.joinpath("frasi.txt").read_text(encoding="utf-8").splitlines():
    r = riga.strip()
    if r.startswith("##"): gruppo = r.lstrip("# ").strip(); continue
    if not r or r.startswith("#"): continue
    frasi.append((gruppo, r))

ssmls, etichette = [], []
for i, (g, testo) in enumerate(frasi, 1):
    parlato = A.con_glossario(testo, gloss)
    parlato = A.con_lingua(parlato, gloss.get("lingua_en", []))
    ssmls.append(wrap(parlato)); etichette.append(f"{i:02d}")
    print(f"{i:02d}. [{g[:26]}] {parlato[:92]}")

print(f"\nsintetizzo {len(ssmls)} frasi…")
data = tts.sintetizza(f"batteria-{CORSO}-r1", ssmls, f"batteria pronuncia {CORSO}")
with zipfile.ZipFile(io.BytesIO(data)) as z:
    wavs = sorted(n for n in z.namelist() if n.lower().endswith(".wav"))
    for wavname, tag in zip(wavs, etichette):
        (BASE / f"{CORSO}_{tag}.wav").write_bytes(z.read(wavname))
print(f"FATTO: {len(wavs)} clip in {BASE}")
