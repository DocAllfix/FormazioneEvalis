#!/usr/bin/env python3
"""Gate QA audio (QA-PRE-LIVE §B.2): Whisper round-trip vs copione + silenzi + loudness.

Uso:
  python scripts/produzione/qa-audio.py <corso>              # completo (richiede faster-whisper, pod)
  python scripts/produzione/qa-audio.py <corso> --skip-asr   # solo silenzi+loudness (dry-run locale)

Scrive la sezione "audio" di qa-report.json: per ID -> PASS | FLAGGED (+ motivi).
FLAGGED non blocca la pipeline: finisce nella lista di revisione umana (QA-PRE-LIVE §D).
Il confronto ASR usa la STESSA normalizzazione glossario di gen-audio.py (niente falsi positivi).
"""

import argparse
import difflib
import json
import os
import re
import subprocess
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # console Windows cp1252

FFMPEG = os.environ.get("FFMPEG", "ffmpeg")
ROOT = Path(os.environ.get("PRODUZIONE_ROOT", "produzione"))

SIM_THRESHOLD = 0.80      # similarità minima trascrizione/copione
MAX_SILENCE_S = 2.5       # silenzio interno anomalo
LUFS_RANGE = (-30.0, -10.0)  # loudness integrata accettabile (uniformata poi in render)


def read_json(p: Path, fallback=None):
    if not p.exists():
        if fallback is not None:
            return fallback
        sys.exit(f"File mancante: {p}")
    return json.loads(p.read_text(encoding="utf-8"))


def normalize_for_compare(text: str) -> str:
    """Riduce copione e trascrizione a parole confrontabili (minuscole, niente punteggiatura)."""
    text = text.lower()
    text = re.sub(r"[^\wàèéìòù\s]", " ", text)
    return " ".join(text.split())


def apply_glossario(text: str, glossario: dict) -> str:
    for k in sorted(glossario.get("map", {}), key=len, reverse=True):
        text = text.replace(k, glossario["map"][k])
    return text


def detect_silences(wav: Path) -> list[float]:
    """Durate dei silenzi INTERNI (esclude coda finale) via ffmpeg silencedetect."""
    proc = subprocess.run(
        [FFMPEG, "-v", "info", "-i", str(wav), "-af", "silencedetect=noise=-35dB:d=1.0", "-f", "null", "-"],
        capture_output=True, text=True,
    )
    durs = [float(m) for m in re.findall(r"silence_duration:\s*([\d.]+)", proc.stderr)]
    ends = [float(m) for m in re.findall(r"silence_end:\s*([\d.]+)", proc.stderr)]
    total = None
    m = re.search(r"time=(\d+):(\d+):([\d.]+)", proc.stderr)
    if m:
        total = int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3))
    # un silenzio che termina alla fine del file è la coda, non un buco nel parlato
    if total and durs and ends and abs(ends[-1] - total) < 0.5:
        durs = durs[:-1]
    return durs


def measure_lufs(wav: Path) -> float | None:
    proc = subprocess.run(
        [FFMPEG, "-v", "info", "-i", str(wav), "-af", "ebur128", "-f", "null", "-"],
        capture_output=True, text=True,
    )
    m = re.findall(r"I:\s*(-?[\d.]+)\s*LUFS", proc.stderr)
    return float(m[-1]) if m else None


def transcribe(wav: Path, model) -> str:
    segments, _info = model.transcribe(str(wav), language="it", beam_size=5)
    return " ".join(s.text for s in segments)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("corso")
    ap.add_argument("--skip-asr", action="store_true")
    ap.add_argument("--model", default="large-v3", help="modello faster-whisper")
    ap.add_argument("--only", help="ID separati da virgola")
    args = ap.parse_args()

    base = ROOT / args.corso
    copioni = read_json(base / "copioni.json")
    glossario = read_json(base / "glossario-tts.json", fallback={"map": {}})
    audio_map = read_json(base / "audio-map.json")
    report = read_json(base / "qa-report.json", fallback={})
    testo_by_id = {s["id"]: s["testo"] for s in copioni["slides"]}
    only = set(args.only.split(",")) if args.only else None

    model = None
    if not args.skip_asr:
        from faster_whisper import WhisperModel  # pip install faster-whisper

        model = WhisperModel(args.model, device="cuda", compute_type="float16")

    audio_section = report.get("audio", {})
    flagged = 0
    for sid in audio_map:
        if only and sid not in only:
            continue
        wav = base / "audio" / f"{sid}.wav"
        if not wav.exists():
            sys.exit(f"ERRORE: {sid} in audio-map ma wav mancante: {wav}")

        problems = []
        silences = detect_silences(wav)
        bad_sil = [d for d in silences if d > MAX_SILENCE_S]
        if bad_sil:
            problems.append(f"silenzi interni anomali: {[round(d,1) for d in bad_sil]}s")

        lufs = measure_lufs(wav)
        if lufs is not None and not (LUFS_RANGE[0] <= lufs <= LUFS_RANGE[1]):
            problems.append(f"loudness fuori range: {lufs} LUFS")

        similarity = None
        if model:
            expected = normalize_for_compare(apply_glossario(testo_by_id[sid], glossario))
            got = normalize_for_compare(transcribe(wav, model))
            similarity = round(difflib.SequenceMatcher(None, expected, got).ratio(), 3)
            if similarity < SIM_THRESHOLD:
                problems.append(f"similarità trascrizione bassa: {similarity}")

        status = "FLAGGED" if problems else "PASS"
        flagged += status == "FLAGGED"
        audio_section[sid] = {"status": status, "similarity": similarity, "lufs": lufs, "problems": problems}
        print(f"{'⚠' if problems else '·'} {sid}: {status}" + (f" — {'; '.join(problems)}" if problems else ""))

    report["audio"] = audio_section
    (base / "qa-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"\nOK · {len(audio_section)} verificati, {flagged} FLAGGED → qa-report.json")
    if args.skip_asr:
        print("NOTA: --skip-asr attivo, il round-trip Whisper NON è stato eseguito (farlo sul pod).")


if __name__ == "__main__":
    main()
