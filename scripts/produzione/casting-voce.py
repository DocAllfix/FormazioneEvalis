#!/usr/bin/env python3
"""Casting voce narrante (niente clonazione): trova tra i 58 studio speaker di XTTS
i timbri più SIMILI alla voce del cliente (voce di riferimento usata SOLO come metro
di paragone matematico, mai clonata), genera i provini a tema audit per i migliori
+ Kokoro im_nicola, e carica tutto su R2 con la classifica di somiglianza.

Gira sul pod (GPU). Env: R2 via rclone già configurato dal bootstrap.
Output R2: pilot/casting/{xtts-<speaker>.wav, kokoro-im_nicola.wav, ranking.json}
"""

import json
import os
import re
import subprocess
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

W = Path("/workspace/casting")
W.mkdir(parents=True, exist_ok=True)
OUT = W / "out"
OUT.mkdir(exist_ok=True)
CLIENT_REF = "/workspace/casting/voce-cliente.wav"  # preparato dal bootstrap
TOP_N = 5

# --- testi (tema audit, con le pronunce volute: audìt / auditòr) ---
def respell(text: str) -> str:
    text = re.sub(r"\bauditor\b", "auditòr", text, flags=re.IGNORECASE)
    text = re.sub(r"\baudit\b", "audìt", text, flags=re.IGNORECASE)
    return text

PROVINO = respell("L'audit è un processo sistematico, indipendente e documentato.")
SCRIPT_FULL = respell(
    "Benvenuto in questo corso di certificazione per auditor di sistemi di gestione. "
    "L'audit è un processo sistematico, indipendente e documentato, che raccoglie evidenze "
    "oggettive e le valuta con obiettività. In questo percorso imparerai a pianificare un "
    "programma di audit, a condurre le attività sul campo, e a formulare risultanze solide, "
    "basate su criteri chiari e verificabili."
)

print(f"PROVINO: {PROVINO}")
print(f"SCRIPT:  {SCRIPT_FULL}")

# --- XTTS ---
os.environ["COQUI_TOS_AGREED"] = "1"
from TTS.api import TTS  # noqa: E402

tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to("cuda")
speakers = sorted(tts.synthesizer.tts_model.speaker_manager.speakers.keys())
print(f"Studio speakers XTTS: {len(speakers)}")

# --- metro di somiglianza (resemblyzer) ---
from resemblyzer import VoiceEncoder, preprocess_wav  # noqa: E402

encoder = VoiceEncoder()
ref_embed = encoder.embed_utterance(preprocess_wav(CLIENT_REF))

import numpy as np  # noqa: E402
import soundfile as sf  # noqa: E402

def similarity(wav_path: str) -> float:
    emb = encoder.embed_utterance(preprocess_wav(wav_path))
    return float(np.dot(ref_embed, emb) / (np.linalg.norm(ref_embed) * np.linalg.norm(emb)))

# Accortezze anti-difetto (analisi pilota + Gemini): sintesi FRASE-PER-FRASE con pausa
# programmata tra le frasi (niente artefatti ai giunti, niente limite 213 char) e
# parametri anti-loop (repetition_penalty alta contro le ripetizioni "attention collapse").
XTTS_PARAMS = {"temperature": 0.7, "repetition_penalty": 9.0, "top_k": 50, "top_p": 0.85}
PAUSE_S = 0.4
SAMPLE_RATE = 24000

def gen_xtts(text: str, speaker: str, out_path: str) -> None:
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]
    pieces = []
    pause = np.zeros(int(PAUSE_S * SAMPLE_RATE), dtype=np.float32)
    for i, sent in enumerate(sentences):
        wav = tts.tts(text=sent, speaker=speaker, language="it", **XTTS_PARAMS)
        pieces.append(np.asarray(wav, dtype=np.float32))
        if i < len(sentences) - 1:
            pieces.append(pause)
    sf.write(out_path, np.concatenate(pieces), SAMPLE_RATE)

# --- fase 1: provino corto per OGNI speaker + punteggio ---
scores = {}
snip_dir = W / "snippets"
snip_dir.mkdir(exist_ok=True)
for i, sp in enumerate(speakers):
    out = snip_dir / f"{sp.replace(' ', '_')}.wav"
    try:
        if not out.exists():
            gen_xtts(PROVINO, sp, str(out))
        scores[sp] = round(similarity(str(out)), 4)
        print(f"[{i+1}/{len(speakers)}] {sp}: {scores[sp]}")
    except Exception as e:  # uno speaker rotto non ferma il casting
        print(f"[{i+1}/{len(speakers)}] {sp}: ERRORE {e}")

ranking = sorted(scores.items(), key=lambda kv: -kv[1])
top = [sp for sp, _ in ranking[:TOP_N]]
print(f"\nTOP {TOP_N} per somiglianza col cliente: {top}")

# --- fase 2: script completo per i finalisti ---
for sp in top:
    out = OUT / f"xtts-{sp.replace(' ', '_')}.wav"
    gen_xtts(SCRIPT_FULL, sp, str(out))
    print(f"provino completo: {out.name} (sim {scores[sp]})")

# --- Kokoro im_nicola (l'unico maschile italiano) ---
try:
    from kokoro import KPipeline
    import soundfile as sf

    pipe = KPipeline(lang_code="i")
    chunks = [audio for _, _, audio in pipe(SCRIPT_FULL, voice="im_nicola")]
    kout = OUT / "kokoro-im_nicola.wav"
    sf.write(str(kout), np.concatenate(chunks), 24000)
    kscore = round(similarity(str(kout)), 4)
    ranking.append(("kokoro-im_nicola", kscore))
    print(f"provino completo: kokoro-im_nicola.wav (sim {kscore})")
except Exception as e:
    print(f"KOKORO FALLITO: {e}")

(OUT / "ranking.json").write_text(
    json.dumps({"clientRef": "voce usata SOLO come metro di somiglianza, mai clonata",
                "provinoText": PROVINO, "scriptText": SCRIPT_FULL,
                "ranking": ranking}, ensure_ascii=False, indent=2),
    encoding="utf-8",
)
subprocess.run(["rclone", "copy", "--s3-no-check-bucket", str(OUT), "r2:evalis-produzione/pilot/casting/"], check=True)
print("\n=== CASTING FINITO — output su R2 pilot/casting/ ===")
