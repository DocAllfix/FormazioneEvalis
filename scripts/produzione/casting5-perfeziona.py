#!/usr/bin/env python3
"""Casting v5 — perfezionamento delle varianti A e D (le preferite) sulla voce cliente.
Fix analitici applicati (diagnosi 2026-07-02):
  1. CHUNK 2-3 frasi (150-260 char, mai frammenti <60) -> prosodia continua, niente parole isolate
  2. giunti con CROSSFADE 30ms + RUMORE D'AMBIENTE (-55dB) al posto del silenzio digitale
  3. pause VARIABILI per punteggiatura (0.40s dopo '.', 0.45s dopo '?!', 0.25s dopo ':')
  4. normalizzazione RMS per chunk -> niente picchi/urla
  5. temperatura 0.70 fissa + repetition_penalty >=9 per entrambe (anti-urla, anti-balbettii)
Output -> R2 pilot/casting4/: clientvoice-A2-perfezionata.wav, clientvoice-D2-perfezionata.wav
"""

import os
import re
import subprocess
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

W = Path("/workspace/c4")
OUT = W / "out"
OUT.mkdir(parents=True, exist_ok=True)
CLEAN = str(W / "voce-clean.wav")  # già prodotto dalla v4

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

import numpy as np
import soundfile as sf

SR = 24000
FADE = int(0.03 * SR)          # crossfade 30ms
NOISE_DB = -55.0               # rumore d'ambiente nelle pause
PAUSES = {".": 0.40, "!": 0.45, "?": 0.45, ":": 0.25, ";": 0.30}

def chunks_of(text, lo=60, hi=260):
    """Frasi raggruppate in blocchi 150-260 char; nessun blocco sotto `lo`."""
    sents = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]
    out, cur = [], ""
    for s in sents:
        if cur and len(cur) + len(s) + 1 > hi:
            out.append(cur)
            cur = s
        else:
            cur = f"{cur} {s}".strip()
        if len(cur) >= lo * 2 and len(cur) >= 150:
            out.append(cur)
            cur = ""
    if cur:
        if out and len(cur) < lo:
            out[-1] = f"{out[-1]} {cur}"
        else:
            out.append(cur)
    return out

def room_tone(seconds):
    return (10 ** (NOISE_DB / 20) * np.random.randn(int(seconds * SR))).astype(np.float32)

def xfade_concat(pieces):
    """Concatena con crossfade 30ms tra elementi consecutivi."""
    out = pieces[0]
    for p in pieces[1:]:
        if len(out) >= FADE and len(p) >= FADE:
            fade_out = out[-FADE:] * np.linspace(1, 0, FADE, dtype=np.float32)
            fade_in = p[:FADE] * np.linspace(0, 1, FADE, dtype=np.float32)
            out = np.concatenate([out[:-FADE], fade_out + fade_in, p[FADE:]])
        else:
            out = np.concatenate([out, p])
    return out

def rms_normalize(x, target=0.05):
    r = float(np.sqrt(np.mean(x ** 2))) or 1e-9
    return (x * (target / r)).astype(np.float32)

os.environ["COQUI_TOS_AGREED"] = "1"
from TTS.api import TTS

tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to("cuda")

VARIANTS = {
    "A2-perfezionata": {"temperature": 0.70, "repetition_penalty": 9.5, "top_k": 50, "top_p": 0.85, "speed": 0.96},
    "D2-perfezionata": {"temperature": 0.70, "repetition_penalty": 9.0, "top_k": 50, "top_p": 0.85, "speed": 0.96,
                        "gpt_cond_len": 30, "gpt_cond_chunk_len": 6},
}

blocks = chunks_of(SCRIPT)
print(f"blocchi: {len(blocks)} (lunghezze: {[len(b) for b in blocks]})")

for name, P in VARIANTS.items():
    pieces = []
    for i, block in enumerate(blocks):
        end_punct = block.rstrip()[-1] if block.rstrip()[-1] in PAUSES else "."
        text = block.rstrip(".…").strip()          # il '.' finale NON si legge (bug XTTS)
        wav = np.asarray(tts.tts(text=text, speaker_wav=CLEAN, language="it", **P), dtype=np.float32)
        pieces.append(rms_normalize(wav))
        if i < len(blocks) - 1:
            pieces.append(room_tone(PAUSES[end_punct]))
    audio = xfade_concat(pieces)
    sf.write(str(OUT / f"clientvoice-{name}.wav"), audio, SR)
    print(f"provino completo: clientvoice-{name}.wav")

subprocess.run(["rclone", "copy", "--s3-no-check-bucket", str(OUT), "r2:evalis-produzione/pilot/casting4/"], check=True)
print("=== CASTING5 FINITO — output su R2 pilot/casting4/ ===")
