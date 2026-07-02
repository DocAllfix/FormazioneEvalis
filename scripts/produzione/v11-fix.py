#!/usr/bin/env python3
"""v11 — i due aggiustamenti chirurgici post-v9el:
  XTTS  : ricetta v9el + VIRGOLA FINALE su ogni frase (anti-ingoio/anti-accento storto
          sull'ultima parola) + frasi corte STANDALONE (le pause retoriche restano)
  VOXCPM: fix IN-CONTEXT — riferimento EL1 INTERO (contiene àudit/àuditor letti bene)
          + ref_text ESATTO con la stessa grafia dello script -> pronuncia stabile dal 1° blocco
PHASE: xtts11 | vox11. REF a /workspace/c8/ref24.wav (EL1 loudnorm 24k, dal driver).
"""

import os
import re
import subprocess
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, "/workspace")
PHASE = os.environ.get("PHASE")

import numpy as np
import soundfile as sf

from tts_ricetta import SR, XTTS_PARAMS, postproc_frase, cuci, respell, seed_frase

OUT = Path("/workspace/c8/out")
OUT.mkdir(parents=True, exist_ok=True)
REF = "/workspace/c8/ref24.wav"

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

# ref_text ESATTO del riferimento EL1 (il paragrafo che gli abbiamo fatto leggere),
# con la STESSA grafia dello script (àudit/àuditor) -> mappa grafia->pronuncia in-context
REF_TEXT = respell(
    "Benvenuto in questo percorso di formazione. In ogni lezione analizzeremo insieme i concetti "
    "fondamentali, con esempi concreti e un linguaggio chiaro. L'audit è uno strumento di "
    "fiducia: l'auditor raccoglie le evidenze, le confronta con i criteri di riferimento, e "
    "formula le proprie conclusioni con metodo e con calma. Prenditi il tempo necessario per "
    "ogni passaggio. La qualità di un lavoro si costruisce così: un'osservazione precisa, una "
    "domanda ben posta, una verifica alla volta. Cominciamo."
)

def frasi_v11(text: str) -> list[str]:
    """v11: frase-per-frase (NIENTE fusione: le corte restano standalone col loro beat),
    <=213 char, punto/'…' via, e VIRGOLA FINALE aggiunta a ogni frase che non
    termina già con punteggiatura ('?'/'!' restano com'erano)."""
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
    fixed = []
    for x in out:
        x = x.rstrip(".…").strip()
        if x and x[-1] not in "?!,":
            x += ","          # segnale di continuazione: articolazione piena dell'ultima parola
        fixed.append(x)
    return [x for x in fixed if x.rstrip(",")]

if PHASE == "xtts11":
    os.environ["COQUI_TOS_AGREED"] = "1"
    import torch
    from TTS.api import TTS

    tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to("cuda")
    pieces = []
    for i, frase in enumerate(frasi_v11(SCRIPT)):
        torch.manual_seed(seed_frase("v11-xtts", frase, 0))
        wav = tts.tts(text=frase, speaker_wav=REF, language="it", **XTTS_PARAMS)
        pieces.append(postproc_frase(wav))
    sf.write(str(OUT / "v11-xtts.wav"), cuci(pieces), SR)
    print("provino completo: v11-xtts.wav")

if PHASE == "vox11":
    import librosa
    from voxcpm import VoxCPM

    model = VoxCPM.from_pretrained("openbmb/VoxCPM2", load_denoiser=False, device="cuda")
    sr_v = model.tts_model.sample_rate

    def blocks(text, lo=120, hi=280):
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

    pieces = []
    for b in blocks(SCRIPT):
        wav = model.generate(text=b, prompt_wav_path=REF, prompt_text=REF_TEXT,
                             reference_wav_path=REF, cfg_value=3.0)
        p = np.asarray(wav, dtype=np.float32).squeeze()
        peak = float(np.max(np.abs(p))) or 1.0
        idx = np.where(np.abs(p) > peak * 10 ** (-55 / 20))[0]
        if len(idx):
            p = p[max(0, idx[0] - int(0.02 * sr_v)):]
        fade = int(0.06 * sr_v)
        if len(p) > fade:
            p[-fade:] *= np.linspace(1, 0, fade, dtype=np.float32)
        r = float(np.sqrt(np.mean(p ** 2))) or 1e-9
        pieces.append(p * (0.05 / r))
    gap = np.zeros(int(0.15 * sr_v), dtype=np.float32)
    outp = []
    for i, p in enumerate(pieces):
        outp.append(p)
        if i < len(pieces) - 1:
            outp.append(gap)
    audio = np.concatenate(outp)
    if sr_v != SR:
        audio = librosa.resample(audio, orig_sr=sr_v, target_sr=SR)
    sf.write(str(OUT / "v11-voxcpm.wav"), audio.astype(np.float32), SR)
    print("provino completo: v11-voxcpm.wav")

subprocess.run(["rclone", "copy", "--s3-no-check-bucket", str(OUT),
                "r2:evalis-produzione/pilot/casting8/"], check=True)
print(f"=== FASE {PHASE} FINITA ===")
