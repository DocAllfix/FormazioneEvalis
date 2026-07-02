#!/usr/bin/env python3
"""Casting v6 — fix analitici post-ascolto (2026-07-02 sera):
XTTS: NIENTE rumore sintetico; trim del silenzio residuo per blocco + pausa corta (0.28s)
      con micro-fade -> pause esatte, mai doppie, nessun "blocco".
F5:   riferimento = segmento parlato più pulito ~10s (F5 vuole <=15s) + ref_text accurato
      su QUEL segmento; speed 1.0; generazione a blocchi 2-3 frasi -> durata stimata stabile.
Env PHASE: xtts | f5 | all. Output -> R2 pilot/casting6/: clientvoice-{A3,D3,F5v2}.wav
"""

import os
import re
import subprocess
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
PHASE = os.environ.get("PHASE", "all")

W = Path("/workspace/c6")
OUT = W / "out"
OUT.mkdir(parents=True, exist_ok=True)
RAW = str(W / "voce-cliente.wav")
CLEAN = str(W / "voce-clean.wav")
REF10 = str(W / "voce-ref10.wav")

import numpy as np
import soundfile as sf
import librosa

# --- pulizia base (come v4/v5) ---
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", RAW, "-af",
                "afftdn=nf=-25,silenceremove=start_periods=1:start_threshold=-38dB:"
                "stop_periods=-1:stop_threshold=-38dB:stop_duration=0.35,"
                "loudnorm=I=-20:TP=-2", "-ar", "24000", "-ac", "1", CLEAN], check=True)

# --- segmento più pulito ~10s per F5: finestra a massima energia parlata ---
y, sr = librosa.load(CLEAN, sr=24000, mono=True)
win = 10 * sr
if len(y) > win:
    rms = np.array([np.sqrt(np.mean(y[i:i+win] ** 2)) for i in range(0, len(y) - win, sr // 2)])
    start = int(np.argmax(rms)) * (sr // 2)
    seg = y[start:start + win]
else:
    seg = y
sf.write(REF10, seg, sr)
print(f"ref10: {len(seg)/sr:.1f}s (finestra a massima energia)")

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

SR = 24000
GAP_S = 0.28
FADE = int(0.015 * SR)  # 15ms

def chunks_of(text, lo=60, hi=260):
    sents = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]
    out, cur = [], ""
    for s in sents:
        if cur and len(cur) + len(s) + 1 > hi:
            out.append(cur); cur = s
        else:
            cur = f"{cur} {s}".strip()
        if len(cur) >= 150:
            out.append(cur); cur = ""
    if cur:
        if out and len(cur) < lo: out[-1] = f"{out[-1]} {cur}"
        else: out.append(cur)
    return out

def trim_silence(x, top_db=40):
    t, _ = librosa.effects.trim(x, top_db=top_db)
    return t

def join_natural(pieces):
    """trim silenzi residui + gap esatto 0.28s + micro-fade (niente rumore sintetico)."""
    gap = np.zeros(int(GAP_S * SR), dtype=np.float32)
    out = []
    for i, p in enumerate(pieces):
        p = trim_silence(np.asarray(p, dtype=np.float32))
        p[:FADE] *= np.linspace(0, 1, FADE, dtype=np.float32)
        p[-FADE:] *= np.linspace(1, 0, FADE, dtype=np.float32)
        out.append(p)
        if i < len(pieces) - 1:
            out.append(gap)
    return np.concatenate(out)

def rms_norm(x, target=0.05):
    r = float(np.sqrt(np.mean(x ** 2))) or 1e-9
    return (x * (target / r)).astype(np.float32)

blocks = chunks_of(SCRIPT)
print(f"blocchi: {len(blocks)}")

if PHASE in ("xtts", "all"):
    os.environ["COQUI_TOS_AGREED"] = "1"
    from TTS.api import TTS

    tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to("cuda")
    for name, P in {
        "A3": {"temperature": 0.70, "repetition_penalty": 9.5, "top_k": 50, "top_p": 0.85, "speed": 0.96},
        "D3": {"temperature": 0.70, "repetition_penalty": 9.0, "top_k": 50, "top_p": 0.85, "speed": 0.96,
               "gpt_cond_len": 30, "gpt_cond_chunk_len": 6},
    }.items():
        pieces = [rms_norm(np.asarray(
                      tts.tts(text=b.rstrip(".…").strip(), speaker_wav=CLEAN, language="it", **P),
                      dtype=np.float32)) for b in blocks]
        sf.write(str(OUT / f"clientvoice-{name}.wav"), join_natural(pieces), SR)
        print(f"provino completo: clientvoice-{name}.wav")

if PHASE in ("f5", "all"):
    print("== F5: ref_text accurato sul segmento 10s ==")
    from faster_whisper import WhisperModel

    wm = WhisperModel("small", device="cuda", compute_type="float16")
    segs, _ = wm.transcribe(REF10, language="it")
    REF_TEXT = " ".join(s.text.strip() for s in segs)
    print("REF10-TEXT:", REF_TEXT)
    del wm

    from huggingface_hub import HfApi, hf_hub_download

    files = HfApi().list_repo_files("alien79/F5-TTS-italian")
    best = max((f for f in files if f.endswith((".safetensors", ".pt"))),
               key=lambda n: int(re.search(r"(\d+)", n).group(1)) if re.search(r"(\d+)", n) else 0)
    ck = hf_hub_download("alien79/F5-TTS-italian", best)
    vn = next((f for f in files if f.endswith("vocab.txt")), None)
    vocab = hf_hub_download("alien79/F5-TTS-italian", vn) if vn else ""

    from f5_tts.api import F5TTS

    f5 = F5TTS(ckpt_file=ck, vocab_file=vocab)
    pieces = []
    for b in blocks:
        wav, f5sr, _ = f5.infer(ref_file=REF10, ref_text=REF_TEXT, gen_text=b,
                                nfe_step=64, cfg_strength=2.0, sway_sampling_coef=-1.0,
                                speed=1.0, remove_silence=False)
        w = np.asarray(wav, dtype=np.float32)
        if f5sr != SR:
            w = librosa.resample(w, orig_sr=f5sr, target_sr=SR)
        pieces.append(rms_norm(w))
    sf.write(str(OUT / "clientvoice-F5v2.wav"), join_natural(pieces), SR)
    print("provino completo: clientvoice-F5v2.wav")

subprocess.run(["rclone", "copy", "--s3-no-check-bucket", str(OUT), "r2:evalis-produzione/pilot/casting6/"], check=True)
print("=== CASTING6 FINITO — output su R2 pilot/casting6/ ===")
