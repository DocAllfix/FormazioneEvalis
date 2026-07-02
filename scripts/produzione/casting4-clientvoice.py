#!/usr/bin/env python3
"""Casting v4 — voce ORIGINALE del cliente su XTTS, al meglio delle possibilità:
riferimento RIPULITO (denoise+trim) + 4 varianti di parametri sullo stesso script (~2 min).
Output -> R2 pilot/casting4/: clientvoice-A..D.wav + params.json
"""

import json
import os
import re
import subprocess
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

W = Path("/workspace/c4")
OUT = W / "out"
OUT.mkdir(parents=True, exist_ok=True)
RAW = str(W / "voce-cliente.wav")        # preparato dal bootstrap (mp3 -> wav)
CLEAN = str(W / "voce-clean.wav")

# --- pulizia riferimento: denoise + taglio silenzi + loudness ---
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", RAW, "-af",
                "afftdn=nf=-25,silenceremove=start_periods=1:start_threshold=-38dB:"
                "stop_periods=-1:stop_threshold=-38dB:stop_duration=0.35,"
                "loudnorm=I=-20:TP=-2", "-ar", "24000", "-ac", "1", CLEAN], check=True)
print("riferimento ripulito:",
      subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                      "-of", "csv=p=0", CLEAN], capture_output=True, text=True).stdout.strip(), "s")

def respell(t):
    t = re.sub(r"\bauditor\b", "àuditor", t, flags=re.IGNORECASE)
    return re.sub(r"\baudit\b", "àudit", t, flags=re.IGNORECASE)

# ~2 minuti di script (dal copione s002, ~240 parole)
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

import numpy as np
import soundfile as sf

os.environ["COQUI_TOS_AGREED"] = "1"
from TTS.api import TTS

tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to("cuda")
SR = 24000

VARIANTS = {
    "A-stabile":  {"temperature": 0.65, "repetition_penalty": 9.0, "top_k": 50, "top_p": 0.85, "speed": 0.96, "pause": 0.55},
    "B-vivace":   {"temperature": 0.82, "repetition_penalty": 7.0, "top_k": 60, "top_p": 0.90, "speed": 1.00, "pause": 0.50},
    "C-posato":   {"temperature": 0.70, "repetition_penalty": 9.0, "top_k": 50, "top_p": 0.85, "speed": 0.92, "pause": 0.65},
    "D-fedele":   {"temperature": 0.70, "repetition_penalty": 8.0, "top_k": 50, "top_p": 0.85, "speed": 0.96, "pause": 0.55,
                   "gpt_cond_len": 30, "gpt_cond_chunk_len": 6},
}

sentences = [s.rstrip(".…").strip() for s in re.split(r"(?<=[.!?])\s+", SCRIPT) if s.strip()]
for name, P in VARIANTS.items():
    pause = np.zeros(int(P["pause"] * SR), dtype=np.float32)
    kw = {k: v for k, v in P.items() if k != "pause"}
    pieces = []
    for i, s in enumerate(sentences):
        wav = tts.tts(text=s, speaker_wav=CLEAN, language="it", **kw)
        pieces.append(np.asarray(wav, dtype=np.float32))
        if i < len(sentences) - 1:
            pieces.append(pause)
    sf.write(str(OUT / f"clientvoice-{name}.wav"), np.concatenate(pieces), SR)
    print(f"provino completo: clientvoice-{name}.wav")

(OUT / "params.json").write_text(json.dumps(VARIANTS, indent=2), encoding="utf-8")
subprocess.run(["rclone", "copy", "--s3-no-check-bucket", str(OUT), "r2:evalis-produzione/pilot/casting4/"], check=True)
print("=== CASTING4 FINITO — output su R2 pilot/casting4/ ===")
