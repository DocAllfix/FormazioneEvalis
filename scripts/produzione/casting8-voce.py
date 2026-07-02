#!/usr/bin/env python3
"""Casting v8 — regole PER-MOTORE (lezione v7: la punteggiatura è veleno solo per XTTS):
  XTTS:   frase-per-frase <=213, punto finale VIA, gap 0.28s
  F5:     punteggiatura INTEGRALE (il finetune la usa), speed 0.78, blocchi 2-3 frasi, gap 0.15s
  VoxCPM: punteggiatura INTEGRALE, blocchi 2-3 frasi, cfg alto (meno "ehm"), gap 0.15s + pron-test
  Qwen:   punteggiatura INTEGRALE, blocchi 2-3 frasi, gap 0.15s + pron-test
  PREP:   riferimento "intelligente": finestra 10s a massima energia SENZA esitazioni
          (le candidate si trascrivono e si scartano quelle con ehm/mmm)
PHASE: prep | xtts | f5 | voxcpm | qwenclone
"""

import os
import re
import subprocess
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
PHASE = os.environ.get("PHASE", "prep")

W = Path("/workspace/c8")
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

# frasi per il test di pronuncia (3 riscritture: scegli a orecchio quale funziona per-motore)
PRON_VARIANTS = {
    "A-accento": "L'àudit viene condotto da un àuditor qualificato e indipendente.",
    "B-normale": "L'audit viene condotto da un auditor qualificato e indipendente.",
    "C-sillabe": "L'àudit viene condotto da un àudi-tor qualificato e indipendente.",
}

def sentences_213(text, strip_dot=True):
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
    return [x.rstrip(".…").strip() if strip_dot else x for x in out if x]

def blocks_with_punct(text, lo=120, hi=280):
    """Blocchi 2-3 frasi CON punteggiatura integrale (per i motori LLM)."""
    sents = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]
    out, cur = [], ""
    for s in sents:
        cand = f"{cur} {s}".strip()
        if cur and len(cand) > hi:
            out.append(cur); cur = s
        else:
            cur = cand
        if len(cur) >= lo and len(cur) >= 150:
            out.append(cur); cur = ""
    if cur:
        out.append(cur)
    return out

def postproc(pieces, sr, gap_s):
    gap = np.zeros(int(gap_s * sr), dtype=np.float32)
    fade_n = int(0.06 * sr)
    outp = []
    for i, p in enumerate(pieces):
        p = np.asarray(p, dtype=np.float32).squeeze()
        idx = np.where(np.abs(p) > (np.max(np.abs(p)) or 1) * 10 ** (-55 / 20))[0]
        if len(idx):
            p = p[max(0, idx[0] - int(0.02 * sr)):]
        if len(p) > fade_n:
            p[-fade_n:] *= np.linspace(1, 0, fade_n, dtype=np.float32)
        r = float(np.sqrt(np.mean(p ** 2))) or 1e-9
        outp.append(p * (0.05 / r))
        if i < len(pieces) - 1:
            outp.append(gap)
    audio = np.concatenate(outp)
    if sr != SR_OUT:
        audio = librosa.resample(audio, orig_sr=sr, target_sr=SR_OUT)
    return audio.astype(np.float32)

def push():
    subprocess.run(["rclone", "copy", "--s3-no-check-bucket", str(OUT),
                    "r2:evalis-produzione/pilot/casting8/"], check=True)

# ================= PREP: riferimento SENZA esitazioni =================
if PHASE == "prep":
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", RAW, "-af",
                    "afftdn=nf=-25,silenceremove=start_periods=1:start_threshold=-38dB:"
                    "stop_periods=-1:stop_threshold=-38dB:stop_duration=0.35,"
                    "loudnorm=I=-20:TP=-2", "-ar", "24000", "-ac", "1", CLEAN], check=True)
    y, sr = librosa.load(CLEAN, sr=24000, mono=True)
    win = 10 * sr
    from faster_whisper import WhisperModel
    m = WhisperModel("small", device="cuda", compute_type="float16")

    def transcribe(seg):
        sf.write("/tmp/w.wav", seg, sr)
        segs, _ = m.transcribe("/tmp/w.wav", language="it")
        return " ".join(s.text.strip() for s in segs)

    FILLER = re.compile(r"\b(ehm+|uhm+|mmm+|ehh+|mh+)\b", re.IGNORECASE)
    cands = []
    if len(y) > win:
        rms = np.array([np.sqrt(np.mean(y[i:i+win] ** 2)) for i in range(0, len(y) - win, sr)])
        for k in np.argsort(rms)[::-1][:4]:  # le 4 finestre a più energia
            seg = y[k * sr: k * sr + win]
            txt = transcribe(seg)
            fillers = len(FILLER.findall(txt))
            words = len(txt.split())
            cands.append((fillers, -words, k * sr, txt))
            print(f"finestra @{k}s: {words} parole, {fillers} esitazioni -> {txt[:70]}")
        cands.sort()
        _, _, start, best_txt = cands[0]
        seg = y[start:start + win]
    else:
        seg, best_txt = y, transcribe(y)
    sf.write(REF10, seg, sr)
    REFTXT.write_text(best_txt, encoding="utf-8")
    print("PREP OK · ref scelto:", best_txt[:100])

# ================= XTTS (ricetta) =================
if PHASE == "xtts":
  try:
    os.environ["COQUI_TOS_AGREED"] = "1"
    from TTS.api import TTS

    tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to("cuda")
    P = {"temperature": 0.70, "repetition_penalty": 9.0, "top_k": 50, "top_p": 0.85,
         "speed": 0.96, "gpt_cond_len": 30, "gpt_cond_chunk_len": 6}
    pieces = [tts.tts(text=s, speaker_wav=CLEAN, language="it", **P)
              for s in sentences_213(SCRIPT, strip_dot=True)]
    sf.write(str(OUT / "v8-xtts.wav"), postproc(pieces, 24000, 0.28), SR_OUT)
    print("provino completo: v8-xtts.wav")
    push()
  except Exception as e:
    print(f"XTTS FALLITA: {e}")

# ================= F5 (punteggiatura + freno) =================
if PHASE == "f5":
  try:
    from huggingface_hub import HfApi, hf_hub_download

    files = HfApi().list_repo_files("alien79/F5-TTS-italian")
    best = max((f for f in files if f.endswith((".safetensors", ".pt"))),
               key=lambda n: int(re.search(r"(\d+)", n).group(1)) if re.search(r"(\d+)", n) else 0)
    ck = hf_hub_download("alien79/F5-TTS-italian", best)
    vn = next((f for f in files if f.endswith("vocab.txt")), None)
    vocab = hf_hub_download("alien79/F5-TTS-italian", vn) if vn else ""
    from f5_tts.api import F5TTS

    f5 = F5TTS(ckpt_file=ck, vocab_file=vocab)
    ref_text = REFTXT.read_text(encoding="utf-8")
    pieces = []
    sr5 = 24000
    for b in blocks_with_punct(SCRIPT):
        wav, sr5, _ = f5.infer(ref_file=REF10, ref_text=ref_text, gen_text=b,
                               nfe_step=64, cfg_strength=2.0, sway_sampling_coef=-1.0,
                               speed=0.78, remove_silence=False)
        pieces.append(wav)
    sf.write(str(OUT / "v8-f5.wav"), postproc(pieces, sr5, 0.15), SR_OUT)
    print("provino completo: v8-f5.wav")
    push()
  except Exception as e:
    print(f"F5 FALLITA: {e}")

# ================= VOXCPM (punteggiatura + cfg alto + pron test) =================
if PHASE == "voxcpm":
  try:
    from voxcpm import VoxCPM

    model = VoxCPM.from_pretrained("openbmb/VoxCPM2", load_denoiser=False)
    ref_text = REFTXT.read_text(encoding="utf-8")
    sr_v = model.tts_model.sample_rate

    def gen(text, cfg=3.0):
        return model.generate(text=text, prompt_wav_path=REF10, prompt_text=ref_text,
                              reference_wav_path=REF10, cfg_value=cfg)

    pieces = [gen(b) for b in blocks_with_punct(SCRIPT)]
    sf.write(str(OUT / "v8-voxcpm.wav"), postproc(pieces, sr_v, 0.15), SR_OUT)
    print("provino completo: v8-voxcpm.wav")
    for tag, sent in PRON_VARIANTS.items():
        sf.write(str(OUT / f"v8-voxcpm-pron-{tag}.wav"), postproc([gen(sent)], sr_v, 0.15), SR_OUT)
        print(f"pron test: v8-voxcpm-pron-{tag}.wav")
    push()
  except Exception as e:
    print(f"VOXCPM FALLITA: {e}")

# ================= QWEN CLONE (punteggiatura + pron test) =================
if PHASE == "qwenclone":
  try:
    import torch
    from qwen_tts import Qwen3TTSModel

    qm = Qwen3TTSModel.from_pretrained("Qwen/Qwen3-TTS-12Hz-1.7B-Base",
                                       device_map="cuda:0", dtype=torch.bfloat16,
                                       attn_implementation="sdpa")
    ref_text = REFTXT.read_text(encoding="utf-8")

    def gen(text):
        wavs, sr_q = qm.generate_voice_clone(text=text, language="Italian",
                                             ref_audio=REF10, ref_text=ref_text)
        w = wavs[0] if isinstance(wavs, (list, tuple)) else wavs
        return np.asarray(w, dtype=np.float32).squeeze(), sr_q

    pieces = []
    sr_q = 24000
    for b in blocks_with_punct(SCRIPT):
        w, sr_q = gen(b)
        pieces.append(w)
    sf.write(str(OUT / "v8-qwen.wav"), postproc(pieces, sr_q, 0.15), SR_OUT)
    print("provino completo: v8-qwen.wav")
    for tag, sent in PRON_VARIANTS.items():
        w, sr_q = gen(sent)
        sf.write(str(OUT / f"v8-qwen-pron-{tag}.wav"), postproc([w], sr_q, 0.15), SR_OUT)
        print(f"pron test: v8-qwen-pron-{tag}.wav")
    push()
  except Exception as e:
    print(f"QWENCLONE FALLITA: {e}")

print(f"=== FASE {PHASE} FINITA ===")
