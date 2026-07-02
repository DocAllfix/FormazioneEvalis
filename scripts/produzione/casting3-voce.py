#!/usr/bin/env python3
"""Casting v3 — tripla esplorazione su un solo pod:
  FASE 1  XTTS: 58 studio speaker classificati per PROFONDITA' (F0 mediana) -> provini top 4
  FASE 2  Chatterbox: voci predefinite (clip studio) -> F0 -> le 3-4 piu' profonde recitano in it
  FASE 3  Qwen3-TTS voice design: voce CREATA da descrizione testuale (QWEN_VOICE_DESC)
Ogni fase e' indipendente (try/except): un fallimento non blocca le altre.
Output -> R2 pilot/casting3/ : wav + f0-ranking.json + log.
"""

import json
import os
import re
import subprocess
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

W = Path("/workspace/casting3")
OUT = W / "out"
OUT.mkdir(parents=True, exist_ok=True)
RESULTS = {"fasi": {}}

def respell(text: str) -> str:
    text = re.sub(r"\bauditor\b", "àuditor", text, flags=re.IGNORECASE)
    text = re.sub(r"\baudit\b", "àudit", text, flags=re.IGNORECASE)
    return text

PROVINO = respell("L'audit è un processo sistematico, indipendente e documentato.")
SCRIPT_FULL = respell(
    "Benvenuto in questo corso di certificazione per auditor di sistemi di gestione. "
    "L'audit è un processo sistematico, indipendente e documentato, che raccoglie evidenze "
    "oggettive e le valuta con obiettività. In questo percorso imparerai a pianificare un "
    "programma di audit, a condurre le attività sul campo, e a formulare risultanze solide, "
    "basate su criteri chiari e verificabili."
)

import numpy as np
import soundfile as sf
import librosa

def f0_median(wav_path: str) -> float:
    """F0 mediana in Hz (pyin, range voce umana). Più basso = più profondo."""
    y, sr = librosa.load(wav_path, sr=16000, mono=True)
    f0, voiced, _ = librosa.pyin(y, fmin=60, fmax=300, sr=sr)
    vals = f0[~np.isnan(f0)]
    return round(float(np.median(vals)), 1) if len(vals) else 0.0

PAUSE_S = 0.55
SAMPLE_RATE = 24000

def concat_with_pauses(pieces_f32, sr=SAMPLE_RATE):
    pause = np.zeros(int(PAUSE_S * sr), dtype=np.float32)
    out = []
    for i, p in enumerate(pieces_f32):
        out.append(p)
        if i < len(pieces_f32) - 1:
            out.append(pause)
    return np.concatenate(out)

def sentences_of(text):
    return [s.rstrip(".…").strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]

# PHASE (env): "1"|"2"|"3"|"all" — per girare ogni fase nel SUO venv isolato
# (i tre stack hanno versioni di transformers incompatibili tra loro: mai stesso env).
PHASE = os.environ.get("PHASE", "all")

# ============ FASE 1 — XTTS profondità ============
if PHASE in ("1", "all"):
  try:
    print("== FASE 1: XTTS classifica profondità ==")
    os.environ["COQUI_TOS_AGREED"] = "1"
    from TTS.api import TTS

    tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to("cuda")
    XP = {"temperature": 0.7, "repetition_penalty": 9.0, "top_k": 50, "top_p": 0.85, "speed": 0.96}

    def gen_xtts(text, speaker, out_path):
        pieces = [np.asarray(tts.tts(text=s, speaker=speaker, language="it", **XP), dtype=np.float32)
                  for s in sentences_of(text)]
        sf.write(out_path, concat_with_pauses(pieces), SAMPLE_RATE)

    speakers = sorted(tts.synthesizer.tts_model.speaker_manager.speakers.keys())
    snip = W / "snip"; snip.mkdir(exist_ok=True)
    f0s = {}
    for i, sp in enumerate(speakers):
        try:
            p = snip / f"{sp.replace(' ', '_')}.wav"
            if not p.exists():
                gen_xtts(PROVINO, sp, str(p))
            f0s[sp] = f0_median(str(p))
            print(f"[{i+1}/{len(speakers)}] {sp}: {f0s[sp]} Hz")
        except Exception as e:
            print(f"[{i+1}/{len(speakers)}] {sp}: ERRORE {e}")

    deep = sorted((kv for kv in f0s.items() if kv[1] > 0), key=lambda kv: kv[1])
    RESULTS["fasi"]["xtts_f0"] = deep
    top_deep = [sp for sp, _ in deep[:4]]
    print(f"TOP 4 PROFONDE XTTS: {[(sp, f0s[sp]) for sp in top_deep]}")
    for sp in top_deep:
        gen_xtts(SCRIPT_FULL, sp, str(OUT / f"xtts-deep-{sp.replace(' ', '_')}.wav"))
        print(f"provino completo: xtts-deep-{sp.replace(' ', '_')}.wav ({f0s[sp]} Hz)")
  except Exception as e:
    print(f"FASE 1 FALLITA: {e}")

# ============ FASE 2 — Chatterbox voci predefinite ============
if PHASE in ("2", "all"):
  try:
    print("== FASE 2: Chatterbox voci predefinite ==")
    vdir = Path("/workspace/cb-voices")
    if not vdir.exists():
        subprocess.run(["git", "clone", "-q", "--depth", "1",
                        "https://github.com/devnen/Chatterbox-TTS-Server.git", "/workspace/cbserver"], check=True)
        (vdir).mkdir(exist_ok=True)
        src = Path("/workspace/cbserver/voices")
        for f in src.glob("*.wav"):
            (vdir / f.name).write_bytes(f.read_bytes())
    clips = sorted(vdir.glob("*.wav"))
    print(f"voci predefinite trovate: {[c.stem for c in clips]}")
    cf0 = {c.stem: f0_median(str(c)) for c in clips}
    RESULTS["fasi"]["chatterbox_f0"] = sorted(cf0.items(), key=lambda kv: kv[1])
    deep_clips = [c for c, hz in sorted(cf0.items(), key=lambda kv: kv[1]) if hz > 0][:4]
    print(f"le 4 più profonde: {[(c, cf0[c]) for c in deep_clips]}")

    from chatterbox.mtl_tts import ChatterboxMultilingualTTS
    import torch
    cb = ChatterboxMultilingualTTS.from_pretrained(device="cuda")
    for name in deep_clips:
        pieces = []
        for s in sentences_of(SCRIPT_FULL):
            wav = cb.generate(s, language_id="it", audio_prompt_path=str(vdir / f"{name}.wav"),
                              exaggeration=0.4, cfg_weight=0.4)
            pieces.append(wav.squeeze(0).cpu().numpy().astype(np.float32))
        sf.write(str(OUT / f"chatterbox-{name}.wav"),
                 concat_with_pauses(pieces, cb.sr), cb.sr)
        print(f"provino completo: chatterbox-{name}.wav ({cf0[name]} Hz)")
  except Exception as e:
    print(f"FASE 2 FALLITA: {e}")

# ============ FASE 3 — Qwen3-TTS voice design ============
if PHASE in ("3", "all"):
  try:
    print("== FASE 3: Qwen3 voice design ==")
    DESC = os.environ.get("QWEN_VOICE_DESC",
        "Voce maschile italiana adulta, circa cinquantacinque anni, profonda e calda, "
        "autorevole e rassicurante, dizione chiara, ritmo posato da docente universitario.")
    from qwen_tts import Qwen3TTSModel  # tentativo API ufficiale

    qm = Qwen3TTSModel.from_pretrained("Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign", device_map="cuda")
    wav, sr = qm.generate_voice_design(text=SCRIPT_FULL, language="Italian", instruct=DESC)
    # l'API restituisce una LISTA di chunk audio: si concatenano prima del write
    audio = np.concatenate([np.asarray(c, dtype=np.float32).squeeze() for c in wav]) \
        if isinstance(wav, (list, tuple)) else np.asarray(wav, dtype=np.float32).squeeze()
    sf.write(str(OUT / "qwen-design-docente.wav"), audio, sr)
    print("provino completo: qwen-design-docente.wav")
  except Exception as e:
    print(f"FASE 3 FALLITA: {e} — (API Qwen da verificare via SSH)")

(OUT / "f0-ranking.json").write_text(json.dumps(RESULTS, ensure_ascii=False, indent=2), encoding="utf-8")
subprocess.run(["rclone", "copy", "--s3-no-check-bucket", str(OUT), "r2:evalis-produzione/pilot/casting3/"], check=True)
print("=== CASTING3 FINITO — output su R2 pilot/casting3/ ===")
