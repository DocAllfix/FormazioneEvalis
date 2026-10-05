# Batteria di pronuncia di un corso: sintetizza produzione/<corso>/_test-pronuncia/frasi.txt con lo
# STESSO percorso della produzione (azure_tts.ssml_slide: glossario, lessico fonetico IPA del catalogo
# + del corso, parole inglesi, voce e parametri marcello-v2), così ciò che si ascolta è ciò che uscirà
# nelle slide. Le clip vanno in mp3 (leggere) in _test-pronuncia/ascolta/.
# Uso: python scripts/produzione/_batteria-corso.py <corso>
import io, json, subprocess, sys, zipfile
from pathlib import Path
sys.path.insert(0, "scripts/produzione")
import azure_tts as A

CORSO = sys.argv[1]
BASE = Path(f"produzione/{CORSO}/_test-pronuncia")
OUT = BASE / "ascolta"; OUT.mkdir(parents=True, exist_ok=True)
gloss = json.loads(Path(f"produzione/{CORSO}/glossario-tts.json").read_text(encoding="utf-8"))
lessico = {**A.carica_lessico(), **gloss.get("lessico", {})}
lingua = gloss.get("lingua_en", [])
tts = A.BatchTTS(A.carica_env())

frasi, gruppo = [], ""
for riga in (BASE / "frasi.txt").read_text(encoding="utf-8").splitlines():
    r = riga.strip()
    if r.startswith("##"): gruppo = r.lstrip("# ").strip(); continue
    if r and not r.startswith("#"): frasi.append((gruppo, r))

ssml = []
for i, (g, testo) in enumerate(frasi, 1):
    parlato = A.con_glossario(testo, gloss)
    ssml.append(A.ssml_slide(parlato, tts.voce, tts.cfg, lessico, lingua))
    print(f"{i:02d}. [{g}] {parlato}")
data = tts.sintetizza(f"batteria-{CORSO}", ssml, f"batteria pronuncia {CORSO}")
with zipfile.ZipFile(io.BytesIO(data)) as z:
    wavs = sorted(n for n in z.namelist() if n.lower().endswith(".wav"))
    for i, nome in enumerate(wavs, 1):
        mp3 = OUT / f"{i:02d}.mp3"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "wav", "-i", "pipe:0", "-b:a", "96k", str(mp3)],
                       input=z.read(nome), check=True)
print(f"FATTO: {len(wavs)} clip in {OUT}")
