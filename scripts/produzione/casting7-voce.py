#!/usr/bin/env python3
"""Casting v7 — gli ultimi 4: VoxCPM2-clone, Qwen3-clone, Azzurra, Sibilia.
TRATTAMENTO IDENTICO PER TUTTI (lezioni v4-v6):
  - respell àudit/àuditor + frasi MAI oltre 213 char (limite XTTS ma buona norma ovunque)
  - punto finale MAI nel testo (nessun "punto" letto), frase-per-frase
  - trim SOLO in testa (soglia dolce 55dB), coda con fade 60ms (mai parole mangiate)
  - gap esatto 0.28s, RMS uniforme
  - italiani (Azzurra/Sibilia): GENDER CHECK su 1 frase prima del provino completo
PHASE: prep | azzurra | sibilia | voxcpm | qwenclone
"""

import json
import os
import re
import subprocess
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
PHASE = os.environ.get("PHASE", "prep")

W = Path("/workspace/c7")
OUT = W / "out"
OUT.mkdir(parents=True, exist_ok=True)
RAW = str(W / "voce-cliente.wav")
CLEAN = str(W / "voce-clean.wav")
REF10 = str(W / "voce-ref10.wav")
REFTXT = W / "ref-text.txt"

import numpy as np
import soundfile as sf
import librosa

SR_OUT = 24000
GAP_S = 0.28
FADE_TAIL = 0.06

def respell(t):
    t = re.sub(r"\bauditor\b", "àuditor", t, flags=re.IGNORECASE)
    return re.sub(r"\baudit\b", "àudit", t, flags=re.IGNORECASE)

SCRIPT = respell(
    "Benvenuto in questo corso di certificazione per auditor di sistemi di gestione. "
    "Che cos'è un audit? Partiamo da come lo definisce la norma, e poi smontiamo la definizione "
    "pezzo per pezzo, perché ogni parola è lì per una ragione. L'audit è un processo sistematico, "
    "indipendente e documentato, che serve a ottenere evidenze oggettive e a valutarle con "
    "obiettività. Sembra una frase densa, e lo è. Ma dentro ci sono quattro idee importanti. "
    "Prima idea: sistematico. Un audit non è un giro in azienda a guardarsi intorno. "
    "È un processo pianificato, con obiettivi definiti prima di cominciare, e una sequenza di "
    "attività che si ripete in modo coerente. Seconda idea: indipendente. Chi conduce l'audit "
    "non deve giudicare il proprio lavoro. Terza idea: documentato. Tutto ciò che l'audit fa e "
    "trova deve lasciare traccia. E quarta idea, la più importante: evidenze oggettive. "
    "È qui che si gioca la differenza tra un professionista e un dilettante."
)
GENDER_TEST = "L'àudit è un processo sistematico, indipendente e documentato"

def sentences_213(text):
    """Frasi <=213 char (le lunghe si spezzano all'ultima virgola utile), SENZA punto finale."""
    sents = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]
    out = []
    for s in sents:
        while len(s) > 213:
            cut = s.rfind(",", 0, 213)
            if cut < 60:
                cut = 213
            out.append(s[:cut].strip())
            s = s[cut + 1:].strip()
        out.append(s)
    return [x.rstrip(".…").strip() for x in out if x]

def postproc(pieces, sr):
    """trim testa dolce + fade coda + gap esatto + RMS uniforme, resample a 24k."""
    gap = np.zeros(int(GAP_S * sr), dtype=np.float32)
    fade_n = int(FADE_TAIL * sr)
    outp = []
    for i, p in enumerate(pieces):
        p = np.asarray(p, dtype=np.float32).squeeze()
        idx = np.where(np.abs(p) > np.max(np.abs(p)) * 10 ** (-55 / 20))[0]
        if len(idx):
            p = p[max(0, idx[0] - int(0.02 * sr)):]
        if len(p) > fade_n:
            p[-fade_n:] *= np.linspace(1, 0, fade_n, dtype=np.float32)
        r = float(np.sqrt(np.mean(p ** 2))) or 1e-9
        p = p * (0.05 / r)
        outp.append(p)
        if i < len(pieces) - 1:
            outp.append(gap)
    audio = np.concatenate(outp)
    if sr != SR_OUT:
        audio = librosa.resample(audio, orig_sr=sr, target_sr=SR_OUT)
    return audio.astype(np.float32)

def f0_of(audio, sr):
    f0, _, _ = librosa.pyin(np.asarray(audio, dtype=np.float32).squeeze(),
                            fmin=60, fmax=350, sr=sr)
    v = f0[~np.isnan(f0)]
    return round(float(np.median(v)), 1) if len(v) else 0.0

def push():
    subprocess.run(["rclone", "copy", "--s3-no-check-bucket", str(OUT),
                    "r2:evalis-produzione/pilot/casting7/"], check=True)

# ================= PREP =================
if PHASE == "prep":
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", RAW, "-af",
                    "afftdn=nf=-25,silenceremove=start_periods=1:start_threshold=-38dB:"
                    "stop_periods=-1:stop_threshold=-38dB:stop_duration=0.35,"
                    "loudnorm=I=-20:TP=-2", "-ar", "24000", "-ac", "1", CLEAN], check=True)
    y, sr = librosa.load(CLEAN, sr=24000, mono=True)
    win = 10 * sr
    if len(y) > win:
        rms = np.array([np.sqrt(np.mean(y[i:i+win] ** 2)) for i in range(0, len(y) - win, sr // 2)])
        start = int(np.argmax(rms)) * (sr // 2)
        y = y[start:start + win]
    sf.write(REF10, y, sr)
    from faster_whisper import WhisperModel
    m = WhisperModel("small", device="cuda", compute_type="float16")
    segs, _ = m.transcribe(REF10, language="it")
    REFTXT.write_text(" ".join(s.text.strip() for s in segs), encoding="utf-8")
    print("PREP OK · ref10 + ref-text:", REFTXT.read_text(encoding="utf-8")[:100])

# ================= AZZURRA =================
if PHASE == "azzurra":
  try:
    import torch
    from transformers import CsmForConditionalGeneration, AutoProcessor

    proc = AutoProcessor.from_pretrained("cartesia/azzurra-voice")
    model = CsmForConditionalGeneration.from_pretrained("cartesia/azzurra-voice").to("cuda")

    def gen(text):
        conv = [{"role": "user", "content": [{"type": "text", "text": text}]}]
        ins = proc.apply_chat_template(conv, tokenize=True, return_dict=True).to("cuda")
        return model.generate(**ins, output_audio=True)[0].cpu().numpy()

    test = gen(GENDER_TEST)
    hz = f0_of(test, 24000)
    print(f"AZZURRA GENDER CHECK: {hz} Hz -> {'MASCHILE' if hz < 165 else 'FEMMINILE'}")
    if hz >= 165:
        print("AZZURRA ESCLUSA (voce femminile)")
    else:
        pieces = [gen(s) for s in sentences_213(SCRIPT)]
        sf.write(str(OUT / "azzurra.wav"), postproc(pieces, 24000), SR_OUT)
        print("provino completo: azzurra.wav")
    push()
  except Exception as e:
    print(f"AZZURRA FALLITA: {e}")

# ================= SIBILIA =================
if PHASE == "sibilia":
  try:
    from transformers import pipeline
    import torch

    pipe = pipeline("text-to-speech", model="DeepMount00/Sibilia-TTS",
                    device="cuda", torch_dtype=torch.bfloat16, trust_remote_code=True)
    r = pipe(GENDER_TEST)
    audio, sr = np.asarray(r["audio"]).squeeze(), r["sampling_rate"]
    hz = f0_of(audio, sr)
    print(f"SIBILIA GENDER CHECK: {hz} Hz -> {'MASCHILE' if hz < 165 else 'FEMMINILE'}")
    if hz >= 165:
        print("SIBILIA ESCLUSA (voce femminile)")
    else:
        pieces = [np.asarray(pipe(s)["audio"]).squeeze() for s in sentences_213(SCRIPT)]
        sf.write(str(OUT / "sibilia.wav"), postproc(pieces, sr), SR_OUT)
        print("provino completo: sibilia.wav")
    push()
  except Exception as e:
    print(f"SIBILIA FALLITA: {e} (API da verificare via SSH)")

# ================= VOXCPM2 CLONE =================
if PHASE == "voxcpm":
  try:
    from voxcpm import VoxCPM

    model = VoxCPM.from_pretrained("openbmb/VoxCPM2", load_denoiser=False)
    ref_text = REFTXT.read_text(encoding="utf-8")
    sr = model.tts_model.sample_rate
    pieces = [model.generate(text=s, prompt_wav_path=REF10, prompt_text=ref_text,
                             reference_wav_path=REF10) for s in sentences_213(SCRIPT)]
    sf.write(str(OUT / "voxcpm2-clone.wav"), postproc(pieces, sr), SR_OUT)
    print("provino completo: voxcpm2-clone.wav")
    push()
  except Exception as e:
    print(f"VOXCPM FALLITA: {e}")

# ================= QWEN3 CLONE =================
if PHASE == "qwenclone":
  try:
    import torch
    from qwen_tts import Qwen3TTSModel

    qm = Qwen3TTSModel.from_pretrained("Qwen/Qwen3-TTS-12Hz-1.7B-Base",
                                       device_map="cuda:0", dtype=torch.bfloat16,
                                       attn_implementation="sdpa")
    ref_text = REFTXT.read_text(encoding="utf-8")
    pieces = []
    sr_q = 24000
    for s in sentences_213(SCRIPT):
        wavs, sr_q = qm.generate_voice_clone(text=s, language="Italian",
                                             ref_audio=REF10, ref_text=ref_text)
        w = wavs[0] if isinstance(wavs, (list, tuple)) else wavs
        pieces.append(np.asarray(w, dtype=np.float32).squeeze())
    sf.write(str(OUT / "qwen3-clone.wav"), postproc(pieces, sr_q), SR_OUT)
    print("provino completo: qwen3-clone.wav")
    push()
  except Exception as e:
    print(f"QWENCLONE FALLITA: {e}")

print(f"=== FASE {PHASE} FINITA ===")
