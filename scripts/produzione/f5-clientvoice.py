#!/usr/bin/env python3
"""F5-TTS (finetune ITALIANO community) sulla voce del cliente — 2 varianti qualità.
Gira in venv dedicato (v5) in PARALLELO alle varianti XTTS sullo stesso pod.
Config da ricerca 2026: nfe 32 = sweet spot, nfe 64 = qualità commerciale;
sway_sampling -1.0 e cfg_strength 2.0 (default consigliati); ref_text da Whisper.
Output -> R2 pilot/casting4/: clientvoice-F5-nfe32.wav, clientvoice-F5-nfe64.wav
"""

import re
import subprocess
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

W = Path("/workspace/f5")
OUT = W / "out"
OUT.mkdir(parents=True, exist_ok=True)
RAW = str(W / "voce-cliente.wav")
CLEAN = str(W / "voce-clean.wav")

# pulizia riferimento (identica alla v4: confronto ad armi pari)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", RAW, "-af",
                "afftdn=nf=-25,silenceremove=start_periods=1:start_threshold=-38dB:"
                "stop_periods=-1:stop_threshold=-38dB:stop_duration=0.35,"
                "loudnorm=I=-20:TP=-2", "-ar", "24000", "-ac", "1", CLEAN], check=True)

print("== trascrizione riferimento (ref_text, essenziale per F5) ==")
from faster_whisper import WhisperModel

wm = WhisperModel("small", device="cuda", compute_type="float16")
segs, _ = wm.transcribe(CLEAN, language="it")
REF_TEXT = " ".join(s.text.strip() for s in segs)
print("REF-TEXT:", REF_TEXT[:120], "...")
del wm  # libera VRAM

def respell(t):
    t = re.sub(r"\bauditor\b", "àuditor", t, flags=re.IGNORECASE)
    return re.sub(r"\baudit\b", "àudit", t, flags=re.IGNORECASE)

SCRIPT = respell(
    "Benvenuto in questo corso di certificazione per auditor di sistemi di gestione. "
    "Che cos'è un audit? Partiamo da come lo definisce la norma, e poi smontiamo la definizione "
    "pezzo per pezzo, perché ogni parola è lì per una ragione. L'audit è un processo sistematico, "
    "indipendente e documentato, che serve a ottenere evidenze oggettive e a valutarle con "
    "obiettività, per determinare in quale misura certi criteri di riferimento sono soddisfatti. "
    "Sembra una frase densa, e lo è. Ma dentro ci sono quattro idee importanti. Prima idea: "
    "sistematico. Un audit non è un giro in azienda a guardarsi intorno, e non è un'ispezione a "
    "sorpresa fatta d'istinto. È un processo pianificato, con obiettivi definiti prima di "
    "cominciare, un campo di applicazione delimitato, un metodo, e una sequenza di attività che "
    "si ripete in modo coerente da un audit all'altro. Seconda idea: indipendente. Chi conduce "
    "l'audit non deve giudicare il proprio lavoro. Il giudizio deve essere libero da conflitti "
    "di interesse e da pressioni. Terza idea: documentato. Tutto ciò che l'audit fa e trova deve "
    "lasciare traccia: il piano, le evidenze raccolte, le risultanze, le conclusioni. E quarta "
    "idea, la più importante: evidenze oggettive. È qui che si gioca la differenza tra un "
    "professionista e un dilettante."
)

print("== checkpoint italiano da HuggingFace (SOLO il più alto — il repo ne ha ~18, disco limitato) ==")
from huggingface_hub import HfApi, hf_hub_download

def step_of(name):
    m = re.search(r"(\d+)", name)
    return int(m.group(1)) if m else 0

files = HfApi().list_repo_files("alien79/F5-TTS-italian")
weights = [f for f in files if f.endswith((".safetensors", ".pt"))]
best = max(weights, key=step_of)
ck = Path(hf_hub_download("alien79/F5-TTS-italian", best))
vocab_name = next((f for f in files if f.endswith("vocab.txt")), None)
vocab = Path(hf_hub_download("alien79/F5-TTS-italian", vocab_name)) if vocab_name else None
print("ckpt scelto (step più alto):", ck.name, "| vocab:", vocab)

from f5_tts.api import F5TTS

f5 = F5TTS(ckpt_file=str(ck), vocab_file=str(vocab) if vocab else "")
for nfe in (32, 64):
    out = OUT / f"clientvoice-F5-nfe{nfe}.wav"
    f5.infer(ref_file=CLEAN, ref_text=REF_TEXT, gen_text=SCRIPT,
             nfe_step=nfe, cfg_strength=2.0, sway_sampling_coef=-1.0,
             speed=0.95, remove_silence=False, file_wave=str(out))
    print(f"provino completo: {out.name}")

subprocess.run(["rclone", "copy", "--s3-no-check-bucket", str(OUT), "r2:evalis-produzione/pilot/casting4/"], check=True)
print("=== F5 FINITO — output su R2 pilot/casting4/ ===")
