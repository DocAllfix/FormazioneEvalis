#!/usr/bin/env python3
"""Genera l'audio dei copioni (fase AUDIO-PRIMA) e aggiorna audio-map.json.

Uso:
  python scripts/produzione/gen-audio.py <corso> --mock                 # dry-run locale (silenzio a durata prevista)
  python scripts/produzione/gen-audio.py <corso> --engine xtts --ref produzione/asset/voce-riferimento.wav
  python scripts/produzione/gen-audio.py <corso> --engine cosyvoice --ref ... --only 19011_m01_s002

Idempotente: salta gli ID il cui wav esiste ed è già in audio-map (usa --force per rigenerare).
La normalizzazione del testo (numeri/sigle -> forma parlata) usa glossario-tts.json se presente;
la STESSA normalizzazione è usata da qa-audio.py per il round-trip Whisper.
"""

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # console Windows cp1252

FFMPEG = os.environ.get("FFMPEG", "ffmpeg")
FFPROBE = os.environ.get("FFPROBE", "ffprobe")
ROOT = Path(os.environ.get("PRODUZIONE_ROOT", "produzione"))


def read_json(p: Path, fallback=None):
    if not p.exists():
        if fallback is not None:
            return fallback
        sys.exit(f"File mancante: {p}")
    return json.loads(p.read_text(encoding="utf-8"))


def write_json(p: Path, data):
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def sha256(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def probe_duration(p: Path) -> float:
    out = subprocess.run(
        [FFPROBE, "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)],
        capture_output=True, text=True, check=True,
    ).stdout.strip()
    d = float(out)
    if d <= 0:
        raise ValueError(f"durata non valida per {p}: {out}")
    return round(d, 3)


def normalize_text(text: str, glossario: dict) -> str:
    """Applica il glossario di pronuncia (chiavi più lunghe prima, match case-sensitive)."""
    for k in sorted(glossario.get("map", {}), key=len, reverse=True):
        text = text.replace(k, glossario["map"][k])
    return text


def gen_mock(text: str, words_per_sec: float, out: Path) -> None:
    """Dry-run: silenzio della durata prevista dal budget (collauda la catena, zero GPU)."""
    words = len(text.split())
    seconds = max(1.0, round(words / words_per_sec, 2))
    subprocess.run(
        [FFMPEG, "-v", "error", "-y", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono",
         "-t", str(seconds), "-c:a", "pcm_s16le", str(out)],
        check=True,
    )


def gen_xtts(text: str, ref: str, out: Path) -> None:
    """XTTS v2 (coqui-tts). Import locale alla funzione: il mock non richiede torch."""
    from TTS.api import TTS  # pip install coqui-tts

    global _XTTS
    if "_XTTS" not in globals():
        _XTTS = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to("cuda")
    _XTTS.tts_to_file(text=text, speaker_wav=ref, language="it", file_path=str(out))


def gen_cosyvoice(text: str, ref: str, out: Path) -> None:
    """CosyVoice2 zero-shot. Richiede il repo CosyVoice nel PYTHONPATH (pod-setup.sh).
    COSYVOICE_REF_TEXT (env) = trascrizione del sample di riferimento: migliora molto la
    qualità dello zero-shot (il pilota la produce con Whisper sul sample stesso)."""
    import torchaudio
    from cosyvoice.cli.cosyvoice import CosyVoice2
    from cosyvoice.utils.file_utils import load_wav

    global _COSY, _COSY_REF
    if "_COSY" not in globals():
        _COSY = CosyVoice2(os.environ.get("COSYVOICE_MODEL_DIR", "pretrained_models/CosyVoice2-0.5B"))
        _COSY_REF = load_wav(ref, 16000)
    ref_text = os.environ.get("COSYVOICE_REF_TEXT", "")
    chunks = [c["tts_speech"] for c in _COSY.inference_zero_shot(text, ref_text, _COSY_REF, stream=False)]
    import torch
    torchaudio.save(str(out), torch.cat(chunks, dim=1), _COSY.sample_rate)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("corso")
    ap.add_argument("--mock", action="store_true")
    ap.add_argument("--engine", choices=["xtts", "cosyvoice"])
    ap.add_argument("--ref", help="wav di riferimento della voce clonata")
    ap.add_argument("--only", help="ID separati da virgola (default: tutti)")
    ap.add_argument("--force", action="store_true", help="rigenera anche gli ID già mappati")
    args = ap.parse_args()

    if not args.mock and not args.engine:
        sys.exit("Serve --mock oppure --engine xtts|cosyvoice")
    if args.engine and not args.ref:
        sys.exit("--engine richiede --ref <voce-riferimento.wav>")

    base = ROOT / args.corso
    copioni = read_json(base / "copioni.json")
    ids = [s["id"] for s in copioni["slides"]]
    if len(ids) != len(set(ids)):
        sys.exit(f"ERRORE: ID duplicati nei copioni: {[i for i in ids if ids.count(i) > 1][:3]}")
    wrong = [i for i in ids if not i.startswith(args.corso + "_")]
    if wrong:
        sys.exit(f"ERRORE: ID di un altro corso in questi copioni: {wrong[:3]}")
    glossario = read_json(base / "glossario-tts.json", fallback={"map": {}})
    audio_map = read_json(base / "audio-map.json", fallback={})
    wps = copioni.get("budget", {}).get("paroleAlSecondoProvvisorio", 2.4)
    only = set(args.only.split(",")) if args.only else None
    audio_dir = base / "audio"
    audio_dir.mkdir(parents=True, exist_ok=True)

    done = skipped = 0
    for slide in copioni["slides"]:
        sid = slide["id"]
        if only and sid not in only:
            continue
        wav = audio_dir / f"{sid}.wav"
        if not args.force and sid in audio_map and wav.exists():
            skipped += 1
            continue

        text = normalize_text(slide["testo"], glossario)
        print(f"~ {sid} ({len(text.split())} parole) ...", flush=True)
        if args.mock:
            gen_mock(text, wps, wav)
        elif args.engine == "xtts":
            gen_xtts(text, args.ref, wav)
        else:
            gen_cosyvoice(text, args.ref, wav)

        audio_map[sid] = {
            "duration": probe_duration(wav),
            "sha256": sha256(wav),
            "words": len(text.split()),
            "engine": "mock" if args.mock else args.engine,
        }
        write_json(base / "audio-map.json", audio_map)  # salvataggio incrementale (ripartibile)
        done += 1
        print(f"  ok {audio_map[sid]['duration']}s")

    total = sum(v["duration"] for v in audio_map.values())
    print(f"\nOK · generati {done}, saltati {skipped} · audio-map: {len(audio_map)} voci · totale {total:.0f}s (~{total/60:.1f} min)")


if __name__ == "__main__":
    main()
