# Round 2 test pronuncia: solo le frasi da correggere, con glossario (map) + fonemi IPA (lessico).
import sys, json, io, zipfile
from pathlib import Path
sys.path.insert(0, "scripts/produzione")
import azure_tts as A

DA_RIFARE = [4, 7, 8, 10, 11, 12, 14, 15]  # numeri delle frasi problematiche
g = json.load(open("produzione/fadai01/glossario-tts.json", encoding="utf-8"))
gloss = {"map": g["map"]}
lessico = g["lessico"]

frasi = {}
for line in open("produzione/_test-pronuncia-ia/frasi.txt", encoding="utf-8"):
    line = line.strip()
    if "|" in line and line[:1].isdigit():
        n, t = line.split("|", 1)
        frasi[int(n.strip())] = t.strip()

tts = A.BatchTTS(env := A.carica_env())
ssmls, idx = [], []
for n in DA_RIFARE:
    spoken = A.con_glossario(frasi[n], gloss)
    ssmls.append(A.ssml_slide(spoken, tts.voce, tts.cfg, lessico))
    idx.append(n)
    print(f"  frase {n:02d} -> {spoken[:88]}")

print("sintesi round 2...")
data = tts.sintetizza("test-pron-ia-r2", ssmls, "test pronuncia IA round 2")
out = Path("produzione/_test-pronuncia-ia")
with zipfile.ZipFile(io.BytesIO(data)) as z:
    names = sorted(n for n in z.namelist() if n.lower().endswith(".wav"))
    for wavname, n in zip(names, idx):
        (out / f"round2_frase{n:02d}.wav").write_bytes(z.read(wavname))
        print(f"round2_frase{n:02d}.wav")
print("FATTO")
