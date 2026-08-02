# Test pronuncia IA (marcello-v2): sintetizza le frasi di produzione/_test-pronuncia-ia/frasi.txt
# applicando il glossario del corso. Round 1 = parole "grezze" (il glossario non forza ancora
# Claude/prompt/token...), per sentire la pronuncia nativa. Output: round1_NN.wav.
import sys, json, io, zipfile, re
from pathlib import Path
sys.path.insert(0, "scripts/produzione")
import azure_tts as A

env = A.carica_env()
gloss = json.load(open("produzione/fadai01/glossario-tts.json", encoding="utf-8"))
frasi = []
for line in open("produzione/_test-pronuncia-ia/frasi.txt", encoding="utf-8"):
    line = line.strip()
    if "|" in line and line[:1].isdigit():
        frasi.append(line.split("|", 1)[1].strip())
print(f"{len(frasi)} frasi")

tts = A.BatchTTS(env)
ssmls = []
for i, f in enumerate(frasi, 1):
    spoken = A.con_glossario(f, gloss)
    ssmls.append(A.ssml_slide(spoken, tts.voce, tts.cfg, None))
    print(f"  {i:02d} -> {spoken[:88]}")

print("sintesi in corso (batch Azure: submit + poll)...")
data = tts.sintetizza("test-pron-ia-r1", ssmls, "test pronuncia IA round 1")
out = Path("produzione/_test-pronuncia-ia")
with zipfile.ZipFile(io.BytesIO(data)) as z:
    names = sorted(n for n in z.namelist() if n.lower().endswith(".wav"))
    for i, n in enumerate(names, 1):
        (out / f"round1_{i:02d}.wav").write_bytes(z.read(n))
print(f"FATTO: {len(names)} wav in {out}/ (round1_NN.wav)")
