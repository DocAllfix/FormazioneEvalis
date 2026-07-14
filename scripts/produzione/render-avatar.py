#!/usr/bin/env python3
"""Worker render avatar (una GPU = uno shard): audio lockato + video-base -> clips/<id>.mp4.

Uso:
  python scripts/produzione/render-avatar.py <corso> --shard produzione/<corso>/shards/gpu-0.txt \
      --base produzione/asset/base-neo2.mp4 [--mock] [--batch 16] [--purge-local]

Era Azure/R2: i wav vivono in audio/mNN/<id>.wav; se assenti in locale vengono scaricati
on-demand da R2 (env R2_AUDIO_REMOTE, es. r2:evalis-produzione/audio-master). audio-map.json
viene da gen-audio-map.mjs (registri _log) e porta {duration, sha}.

Pipeline per ID (job atomico, idempotente):
  1. skip se esiste clips/<id>.mp4.ok (già renderizzato E validato);
  2. GATE IDENTITÀ AUDIO: sha256(wav) == sha del registro (l'audio che entra nel mux è
     ESATTAMENTE quello lockato e QA-parola-per-parola; becca anche download corrotti);
  3. render: MuseTalk (reale, batch, preparation una sola volta per base) o mock (ffmpeg);
  4. mux con tag -metadata comment=<id> (barriera anti-mescolamento #2);
  5. GATE (QA-PRE-LIVE §B.1): durata = durata audio ±0.3s, stream video con frame, tag corretto;
  6. scrive clips/<id>.mp4.ok {duration, sha256}; se R2_REMOTE è settato, rclone copyto di
     clip + .ok su {R2_REMOTE}/avatar-clips/<corso>/; con --purge-local la clip locale si
     elimina dopo l'upload verificato (dischi pod piccoli).
Un fallimento = quella clip resta senza .ok; make-shards la rimette in lista al giro dopo.
"""

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # console Windows cp1252
sys.path.insert(0, str(Path(__file__).parent))
from naturalizza import naturalizza  # noqa: E402

FFMPEG = os.environ.get("FFMPEG", "ffmpeg")
FFPROBE = os.environ.get("FFPROBE", "ffprobe")
ROOT = Path(os.environ.get("PRODUZIONE_ROOT", "produzione"))
MUSETALK_DIR = Path(os.environ.get("MUSETALK_DIR", "/workspace/MuseTalk"))
DURATION_TOL = 0.3


def read_json(p: Path, fallback=None):
    if not p.exists():
        if fallback is not None:
            return fallback
        sys.exit(f"File mancante: {p}")
    return json.loads(p.read_text(encoding="utf-8"))


def probe(args_: list[str]) -> str:
    return subprocess.run([FFPROBE, "-v", "error", *args_], capture_output=True, text=True, check=True).stdout.strip()


def probe_duration(p: Path) -> float:
    return round(float(probe(["-show_entries", "format=duration", "-of", "csv=p=0", str(p)])), 3)


def wav_path(base_dir: Path, sid: str) -> Path:
    mod = re.search(r"_(m\d\d)_", sid).group(1)
    return base_dir / "audio" / mod / f"{sid}.wav"


def fetch_wav(base_dir: Path, corso: str, sid: str) -> Path:
    """Wav locale in audio/mNN/; se assente lo scarica da R2 (R2_AUDIO_REMOTE)."""
    wav = wav_path(base_dir, sid)
    if wav.exists():
        return wav
    remote = os.environ.get("R2_AUDIO_REMOTE")
    if not remote:
        sys.exit(f"ERRORE: wav mancante per {sid} ({wav}) e R2_AUDIO_REMOTE non settato")
    wav.parent.mkdir(parents=True, exist_ok=True)
    mod = wav.parent.name
    subprocess.run(["rclone", "copyto", f"{remote}/{corso}/audio/{mod}/{sid}.wav", str(wav)], check=True)
    if not wav.exists():
        sys.exit(f"ERRORE: download R2 fallito per {sid}")
    return wav


def make_pingpong(base: Path, out: Path) -> None:
    """Base in avanti + all'indietro concatenati: il loop non ha giunta visibile."""
    if out.exists():
        return
    subprocess.run(
        [FFMPEG, "-v", "error", "-y", "-i", str(base),
         "-filter_complex", "[0:v]split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1[v]",
         "-map", "[v]", "-an", "-c:v", "libx264", "-crf", "18", "-preset", "fast", str(out)],
        check=True,
    )


def mux_with_id(video_in: Path, wav: Path, sid: str, out: Path) -> None:
    """Mux video renderizzato + audio originale, tag ID nei metadati, faststart per lo streaming."""
    subprocess.run(
        [FFMPEG, "-v", "error", "-y", "-i", str(video_in), "-i", str(wav),
         "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "128k",
         "-metadata", f"comment={sid}", "-movflags", "+faststart", "-shortest", str(out)],
        check=True,
    )


def render_mock(wav: Path, sid: str, out: Path) -> None:
    """Dry-run locale: video sintetico della durata dell'audio (collauda gate/idempotenza).
    Durata esplicita con -t: la sorgente lavfi è infinita, -shortest non basta."""
    dur = probe_duration(wav)
    with tempfile.TemporaryDirectory() as td:
        raw = Path(td) / "raw.mp4"
        subprocess.run(
            [FFMPEG, "-v", "error", "-y", "-f", "lavfi", "-i", "color=c=0x284261:s=320x180:r=10",
             "-t", str(dur), "-c:v", "libx264", "-preset", "ultrafast", "-an", str(raw)],
            check=True,
        )
        mux_with_id(raw, wav, sid, out)


def render_musetalk_batch(ids: list[str], base_pingpong: Path, base_dir: Path, clips_dir: Path, batch: int) -> None:
    """Render REALE: un'unica invocazione MuseTalk per tutte le clip dello shard
    (i modelli si caricano una volta; l'avatar si prepara una volta: preparation=True
    solo alla prima esecuzione con questo base, poi riusato con preparation=False)."""
    avatar_id = f"evalis_{base_pingpong.stem}"
    prepared = (MUSETALK_DIR / "results" / "v15" / "avatars" / avatar_id).exists()
    cfg = {
        avatar_id: {
            "preparation": not prepared,
            "bbox_shift": int(os.environ.get("MUSETALK_BBOX_SHIFT", "-7")),
            "video_path": str(base_pingpong.resolve()),
            "audio_clips": {sid: str(wav_path(base_dir, sid).resolve()) for sid in ids},
        }
    }
    cfg_file = clips_dir / "_musetalk-config.yaml"
    lines = []
    for aid, a in cfg.items():
        lines += [f"{aid}:", f"  preparation: {a['preparation']}", f"  bbox_shift: {a['bbox_shift']}",
                  f"  video_path: {a['video_path']}", "  audio_clips:"]
        lines += [f"    {k}: {v}" for k, v in a["audio_clips"].items()]
    cfg_file.write_text("\n".join(lines) + "\n", encoding="utf-8")

    # parametri di naturalezza (ricetta 2026, env-driven): meno over-articulation, bordi stabili.
    # La bbox FISSA e' iniettata da patch-musetalk.py; qui passiamo margini/parsing/fps.
    extra = ["--extra_margin", os.environ.get("MUSETALK_EXTRA_MARGIN", "8"),
             "--parsing_mode", os.environ.get("MUSETALK_PARSING_MODE", "jaw"),
             "--left_cheek_width", os.environ.get("MUSETALK_CHEEK", "90"),
             "--right_cheek_width", os.environ.get("MUSETALK_CHEEK", "90"),
             "--fps", "25"]
    # stdin=DEVNULL: se l'avatar esiste MuseTalk chiede "re-create? (y/n)" via input() e
    # senza tty va in EOFError. Con l'avatar prep-una-volta questo non capita, ma blindiamo.
    subprocess.run(
        [sys.executable, "-m", "scripts.realtime_inference",
         "--inference_config", str(cfg_file.resolve()),
         "--batch_size", str(batch), "--version", "v15", *extra],
        cwd=MUSETALK_DIR, check=True, stdin=subprocess.DEVNULL,
    )
    # gli output MuseTalk (results/v15/avatars/<avatar_id>/vid_output/<sid>.mp4) si spostano in clips/
    out_dir = MUSETALK_DIR / "results" / "v15" / "avatars" / avatar_id / "vid_output"
    for sid in ids:
        src = out_dir / f"{sid}.mp4"
        if src.exists():
            shutil.move(str(src), str(clips_dir / f"{sid}.raw.mp4"))


def validate(sid: str, mp4: Path, expected: float) -> list[str]:
    problems = []
    dur = probe_duration(mp4)
    if abs(dur - expected) > DURATION_TOL:
        problems.append(f"durata {dur}s vs attesa {expected}s (tolleranza {DURATION_TOL}s)")
    v = probe(["-select_streams", "v:0", "-count_packets", "-show_entries",
               "stream=nb_read_packets", "-of", "csv=p=0", str(mp4)])
    if not v or int(v) <= 0:
        problems.append("nessun frame video")
    tag = probe(["-show_entries", "format_tags=comment", "-of", "csv=p=0", str(mp4)])
    if tag != sid:
        problems.append(f"tag ID nel file = '{tag}', atteso '{sid}'")
    return problems


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("corso")
    ap.add_argument("--shard", help="file con un ID per riga (da make-shards)")
    ap.add_argument("--only", help="ID separati da virgola (alternativa a --shard)")
    ap.add_argument("--base", help="video-base dell'avatar (obbligatorio senza --mock)")
    ap.add_argument("--mock", action="store_true")
    ap.add_argument("--batch", type=int, default=16)
    ap.add_argument("--purge-local", action="store_true",
                    help="elimina la clip locale dopo l'upload R2 verificato (dischi pod piccoli)")
    args = ap.parse_args()
    if not args.mock and not args.base:
        sys.exit("Serve --base <video-base> (oppure --mock per il dry-run)")

    base_dir = ROOT / args.corso
    audio_map = read_json(base_dir / "audio-map.json")
    clips_dir = base_dir / "clips"
    clips_dir.mkdir(parents=True, exist_ok=True)

    if args.shard:
        ids = [l.strip() for l in Path(args.shard).read_text().splitlines() if l.strip()]
    elif args.only:
        ids = args.only.split(",")
    else:
        sys.exit("Serve --shard oppure --only")

    todo = []
    for sid in ids:
        if (clips_dir / f"{sid}.mp4.ok").exists():
            print(f"· {sid}: già validata, salto")
            continue
        if sid not in audio_map:
            sys.exit(f"ERRORE: {sid} non è in audio-map.json (render SOLO dopo il lock audio)")
        wav = fetch_wav(base_dir, args.corso, sid)
        # GATE IDENTITÀ: l'audio che entra nel mux è ESATTAMENTE quello lockato dal registro
        sha_atteso = audio_map[sid].get("sha")
        if sha_atteso and hashlib.sha256(wav.read_bytes()).hexdigest() != sha_atteso:
            sys.exit(f"ERRORE: sha del wav di {sid} DIVERSO dal registro (file alterato o download corrotto)")
        todo.append(sid)
    if not todo:
        print("Niente da fare.")
        return

    if not args.mock:
        base = Path(args.base)
        pingpong = base.with_name(base.stem + "-pingpong.mp4")
        make_pingpong(base, pingpong)
        print(f"Render MuseTalk di {len(todo)} clip (batch {args.batch}) ...")
        render_musetalk_batch(todo, pingpong, base_dir, clips_dir, args.batch)

    ok = failed = 0
    for sid in todo:
        wav = wav_path(base_dir, sid)
        out = clips_dir / f"{sid}.mp4"
        try:
            if args.mock:
                render_mock(wav, sid, out)
            else:
                raw = clips_dir / f"{sid}.raw.mp4"
                if not raw.exists():
                    raise RuntimeError("output MuseTalk mancante")
                # NATURALIZZA: gate-silenzi NITIDO (frame base reale dove l'audio e' muto) +
                # mux audio + tag + NVENC. NIENTE deflicker/sharpen di default (sfocano la bocca,
                # bocciati dall'utente): la nitidezza viene dalla bbox fissa + GFPGAN al render.
                pingpong = Path(args.base).with_name(Path(args.base).stem + "-pingpong.mp4")
                naturalizza(raw, pingpong, wav, sid, out,
                            deflicker=os.environ.get("NAT_DEFLICKER", "0") == "1",
                            sharpen=float(os.environ.get("NAT_SHARPEN", "0")))
                raw.unlink()

            problems = validate(sid, out, audio_map[sid]["duration"])
            if problems:
                raise RuntimeError("; ".join(problems))

            ok_data = {"duration": probe_duration(out),
                       "sha256": hashlib.sha256(out.read_bytes()).hexdigest()}
            ok_file = clips_dir / f"{sid}.mp4.ok"
            ok_file.write_text(json.dumps(ok_data) + "\n", encoding="utf-8")
            remote = os.environ.get("R2_REMOTE")
            if remote:
                dest = f"{remote}/avatar-clips/{args.corso}"
                subprocess.run(["rclone", "copyto", str(out), f"{dest}/{sid}.mp4"], check=True)
                subprocess.run(["rclone", "copyto", str(ok_file), f"{dest}/{sid}.mp4.ok"], check=True)
                if args.purge_local:
                    out.unlink()  # il .ok locale resta: è il marcatore di idempotenza
            ok += 1
            print(f"✓ {sid}: PASS ({ok_data['duration']}s)")
        except Exception as e:  # job atomico: un errore = una clip, non ferma lo shard
            failed += 1
            print(f"✗ {sid}: FAILED — {e}")
            for f in (out, clips_dir / f"{sid}.mp4.ok"):
                if f.exists():
                    f.unlink()

    print(f"\nOK · {ok} validate, {failed} FAILED (rilanciare make-shards + questo worker per i retry)")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
