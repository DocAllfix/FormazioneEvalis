#!/usr/bin/env python3
"""v12 — IL TEST DEFINITIVO: XTTS vs VoxCPM, ~3 minuti a testa, produzione-realistico.
Regole COMPLETE per entrambi (ricetta v11, glossario numeri, regola redazionale: audit
mai a freddo) + CRONOMETRO (carico modello / generazione / rapporto vs durata audio).
PHASE: xtts12 | vox12. REF a /workspace/c8/ref24.wav (EL1). Output + timing su R2.
"""

import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, "/workspace")
PHASE = os.environ.get("PHASE")

import numpy as np
import soundfile as sf

from tts_ricetta import (SR, XTTS_PARAMS, applica_glossario, cuci, frasi_ricetta,
                         postproc_frase, respell, seed_frase)

OUT = Path("/workspace/c8/out")
OUT.mkdir(parents=True, exist_ok=True)
REF = "/workspace/c8/ref24.wav"

GLOSSARIO = {"map": {"ISO 19011": "ISO diciannove milaundici", "2026": "duemila ventisei"}}

# ~390 parole ≈ 3:10 — regola redazionale rispettata: "audit" arriva DOPO il riscaldamento
SCRIPT_RAW = (
    "Benvenuto, e grazie per aver scelto questo percorso di certificazione. In questa lezione "
    "costruiamo le fondamenta di tutto il corso: capiremo che cosa significa verificare con "
    "metodo, e perché questa competenza è così richiesta dalle organizzazioni. Partiamo dalla "
    "domanda centrale. Che cos'è un audit? La norma ISO 19011, nella sua edizione del 2026, lo "
    "definisce come un processo sistematico, indipendente e documentato, che serve a ottenere "
    "evidenze oggettive e a valutarle con obiettività, per determinare in quale misura i criteri "
    "di riferimento sono soddisfatti. Sembra una definizione densa, e lo è. Ma dentro ci sono "
    "quattro idee che devi fare tue. Prima idea: sistematico. Un audit non è un giro in azienda "
    "a guardarsi intorno, e non è un'ispezione a sorpresa fatta d'istinto. È un processo "
    "pianificato, con obiettivi definiti prima di cominciare, un campo di applicazione "
    "delimitato, un metodo, e una sequenza di attività che si ripete in modo coerente. Se due "
    "auditor competenti esaminano lo stesso processo con gli stessi criteri, dovrebbero arrivare "
    "a conclusioni simili. Seconda idea: indipendente. Chi conduce l'audit non deve giudicare il "
    "proprio lavoro. L'indipendenza può avere gradi diversi, ma il principio è sempre lo stesso: "
    "il giudizio deve essere libero da conflitti di interesse e da pressioni. Un responsabile di "
    "produzione che valuta il proprio reparto non sta facendo un audit: sta facendo "
    "un'autovalutazione. Utile, ma è un'altra cosa. Terza idea: documentato. Tutto ciò che "
    "l'audit fa e trova deve lasciare traccia: il piano, le evidenze raccolte, le risultanze, le "
    "conclusioni. Perché? Perché il valore di un audit sta nella possibilità di verificarlo. "
    "Quarta idea, la più importante: evidenze oggettive. L'evidenza oggettiva è un dato che "
    "supporta l'esistenza o la veridicità di qualcosa: un documento, una registrazione, una "
    "misura, un'osservazione diretta e verificabile. Se durante una verifica il responsabile "
    "della manutenzione ti dice che i carrelli vengono controllati ogni mese, quella è una "
    "dichiarazione. Diventa evidenza quando la incroci con qualcosa di verificabile: i rapporti "
    "firmati, il registro degli interventi, l'etichetta di controllo. L'auditor lavora così: "
    "ascolta le persone, e poi cerca il riscontro. È qui che si gioca la differenza tra un "
    "professionista e un dilettante. Ricapitolando: un processo sistematico, indipendente, "
    "documentato, fondato su evidenze oggettive. Nella prossima lezione vedremo perché le "
    "organizzazioni investono in tutto questo."
)
SCRIPT = respell(applica_glossario(SCRIPT_RAW, GLOSSARIO))

# ref_text esatto del riferimento EL1, stessa grafia dello script (per il fix in-context Vox)
REF_TEXT = respell(
    "Benvenuto in questo percorso di formazione. In ogni lezione analizzeremo insieme i concetti "
    "fondamentali, con esempi concreti e un linguaggio chiaro. L'audit è uno strumento di "
    "fiducia: l'auditor raccoglie le evidenze, le confronta con i criteri di riferimento, e "
    "formula le proprie conclusioni con metodo e con calma. Prenditi il tempo necessario per "
    "ogni passaggio. La qualità di un lavoro si costruisce così: un'osservazione precisa, una "
    "domanda ben posta, una verifica alla volta. Cominciamo."
)

def save_timing(name, t_load, t_gen, audio_s):
    data = {"caricamento_modello_s": round(t_load, 1), "generazione_s": round(t_gen, 1),
            "audio_s": round(audio_s, 1), "x_realtime": round(audio_s / t_gen, 2)}
    (OUT / f"{name}-timing.json").write_text(json.dumps(data, indent=2), encoding="utf-8")
    print(f"TIMING {name}: load {data['caricamento_modello_s']}s · gen {data['generazione_s']}s "
          f"· audio {data['audio_s']}s · {data['x_realtime']}x realtime")

if PHASE == "xtts12":
    os.environ["COQUI_TOS_AGREED"] = "1"
    import torch
    from TTS.api import TTS

    t0 = time.time()
    tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to("cuda")
    t_load = time.time() - t0
    t0 = time.time()
    pieces = []
    for frase in frasi_ricetta(SCRIPT):
        torch.manual_seed(seed_frase("v12-xtts", frase, 0))
        wav = tts.tts(text=frase, speaker_wav=REF, language="it", **XTTS_PARAMS)
        pieces.append(postproc_frase(wav))
    audio = cuci(pieces)
    t_gen = time.time() - t0
    sf.write(str(OUT / "v12-xtts.wav"), audio, SR)
    save_timing("v12-xtts", t_load, t_gen, len(audio) / SR)
    print("provino completo: v12-xtts.wav")

if PHASE == "vox12":
    import librosa
    from voxcpm import VoxCPM

    t0 = time.time()
    model = VoxCPM.from_pretrained("openbmb/VoxCPM2", load_denoiser=False, device="cuda")
    t_load = time.time() - t0
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

    t0 = time.time()
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
    t_gen = time.time() - t0
    if sr_v != SR:
        audio = librosa.resample(audio, orig_sr=sr_v, target_sr=SR)
    sf.write(str(OUT / "v12-voxcpm.wav"), audio.astype(np.float32), SR)
    save_timing("v12-voxcpm", t_load, t_gen, len(audio) / SR)
    print("provino completo: v12-voxcpm.wav")

subprocess.run(["rclone", "copy", "--s3-no-check-bucket", str(OUT),
                "r2:evalis-produzione/pilot/casting8/"], check=True)
print(f"=== FASE {PHASE} FINITA ===")
