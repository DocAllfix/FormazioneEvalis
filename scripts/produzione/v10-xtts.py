#!/usr/bin/env python3
"""v10 — primo consumo REALE di tts_ricetta.py: stesso script, 3 riferimenti ElevenLabs.
Env: REF_WAV (path riferimento già 24k mono), OUT_NAME. Output -> R2 pilot/casting8/.
"""

import os
import subprocess
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, "/workspace")

import soundfile as sf
from tts_ricetta import SR, genera_slide_xtts, respell

REF = os.environ["REF_WAV"]
OUT_NAME = os.environ["OUT_NAME"]
OUT = Path("/workspace/c8/out")
OUT.mkdir(parents=True, exist_ok=True)

SCRIPT = (
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

os.environ["COQUI_TOS_AGREED"] = "1"
from TTS.api import TTS

tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to("cuda")
audio = genera_slide_xtts(tts, slide_id=OUT_NAME, testo=SCRIPT, speaker_wav=REF)
sf.write(str(OUT / f"{OUT_NAME}.wav"), audio, SR)
print(f"provino completo: {OUT_NAME}.wav")
subprocess.run(["rclone", "copy", "--s3-no-check-bucket", str(OUT),
                "r2:evalis-produzione/pilot/casting8/"], check=True)
