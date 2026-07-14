#!/usr/bin/env python3
"""Post-processing di naturalezza per una clip avatar MuseTalk (usato dal worker e
testabile in locale). Pipeline:
  1. GATE SILENZI dall'ENERGIA del wav (RMS per frame a 25fps): dove l'audio e' silenzio
     rimette il frame del video-base (bocca a riposo reale) -> niente "bocca che mastica"
     nei silenzi. Robusto: non dipende dal word.json, guarda l'audio vero.
  2. deflicker (toglie il micro-tremolio) + unsharp (nitidezza, compensa i 256px) = ricetta P3.
  3. mux con l'audio + tag comment=<id>; encode NVENC se disponibile, altrimenti libx264.
Il video-base ping-pong DEVE essere frame-allineato con la clip renderizzata (offset 0:
MuseTalk parte dal frame 0 del base ping-pong; verificato).

Uso CLI (test locale):
  python naturalizza.py <clip_render.mp4> <base_pingpong.mp4> <id> <out.mp4> [--rms-db -45] [--min-ms 150]
"""
from __future__ import annotations
import argparse, os, subprocess, sys, wave
from pathlib import Path

FFMPEG = os.environ.get("FFMPEG", "ffmpeg"); FFPROBE = os.environ.get("FFPROBE", "ffprobe")
FPS = 25


def _rms_per_frame(wav_path: Path) -> list[float]:
    """RMS (0..1) per finestra di 1/25 s letta dal wav (mono/stereo, 16-bit)."""
    import numpy as np
    with wave.open(str(wav_path)) as w:
        n, sr, sw, ch = w.getnframes(), w.getframerate(), w.getsampwidth(), w.getnchannels()
        raw = w.readframes(n)
    dtype = {1: np.int8, 2: np.int16, 4: np.int32}[sw]
    a = np.frombuffer(raw, dtype=dtype).astype(np.float64)
    if ch > 1:
        a = a.reshape(-1, ch).mean(axis=1)
    if a.size:
        a /= float(np.iinfo(dtype).max)
    step = sr / FPS
    out = []
    for i in range(int(len(a) / step) + 1):
        seg = a[int(i * step):int((i + 1) * step)]
        out.append(float((seg ** 2).mean() ** 0.5) if seg.size else 0.0)
    return out


def silenzi(wav_path: Path, rms_db: float, min_ms: int, margine_ms: int = 40) -> list[tuple[float, float]]:
    """Finestre (s) dove l'audio e' sotto soglia per >= min_ms, con margine interno."""
    import numpy as np
    rms = _rms_per_frame(wav_path)
    soglia = 10 ** (rms_db / 20)
    sil = [r < soglia for r in rms]
    wins, i, n = [], 0, len(sil)
    while i < n:
        if sil[i]:
            j = i
            while j < n and sil[j]:
                j += 1
            a, b = i / FPS, j / FPS
            if (b - a) * 1000 >= min_ms:
                a2, b2 = a + margine_ms / 1000, b - margine_ms / 1000
                if b2 > a2:
                    wins.append((a2, b2))
            i = j
        else:
            i += 1
    return wins


def _nvenc_disponibile() -> bool:
    try:
        out = subprocess.run([FFMPEG, "-hide_banner", "-encoders"], capture_output=True, text=True).stdout
        return "h264_nvenc" in out
    except Exception:
        return False


def naturalizza(clip: Path, base_pingpong: Path, wav: Path, sid: str, out: Path,
                rms_db: float = -45.0, min_ms: int = 150, deflicker: bool = False,
                sharpen: float = 0.0) -> None:
    """Default = SOLO gate-silenzi (nitido): l'utente ha bocciato deflicker/sharpen (sfocano
    la bocca). deflicker/sharpen restano opzionali via parametro per casi specifici."""
    wins = silenzi(wav, rms_db, min_ms)
    vf = []
    filtri = f"[0:v][1:v]overlay=enable='{'+'.join(f'between(t,{a:.3f},{b:.3f})' for a,b in wins)}'[g]" if wins \
        else "[0:v]null[g]"
    # ordine ottimale (ricerca 2026): deflicker globale + atadenoise (flicker LOCALE denti)
    # poi unsharp LEGGERO per ULTIMO. Il gate-silenzi (overlay base) e' gia' applicato in [g].
    post = []
    if deflicker:
        post.append("deflicker=size=5:mode=am")
        post.append("atadenoise=0a=0.02:0b=0.04:1a=0.02:1b=0.04:s=9")
    if sharpen > 0:
        post.append(f"unsharp=5:5:{sharpen}:5:5:0.0")
    fc = filtri + (f";[g]{','.join(post)}[v]" if post else "")
    vmap = "[v]" if post else "[g]"
    encoders = []
    if _nvenc_disponibile():
        encoders.append(["-c:v", "h264_nvenc", "-preset", "p5", "-cq", "20"])
    encoders.append(["-c:v", "libx264", "-crf", "18", "-preset", "fast"])  # fallback sempre
    ultimo = None
    for venc in encoders:  # prova NVENC, se il pod non lo supporta ripiega su x264
        r = subprocess.run(
            [FFMPEG, "-v", "error", "-y", "-i", str(clip), "-i", str(base_pingpong), "-i", str(wav),
             "-filter_complex", fc, "-map", vmap, "-map", "2:a:0",
             *venc, "-c:a", "aac", "-b:a", "128k",
             "-metadata", f"comment={sid}", "-movflags", "+faststart", "-shortest", str(out)],
            capture_output=True, text=True)
        if r.returncode == 0:
            return
        ultimo = r.stderr
    raise RuntimeError(f"encode fallito: {ultimo[:300]}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("clip"); ap.add_argument("base"); ap.add_argument("sid"); ap.add_argument("out")
    ap.add_argument("--wav", help="wav sorgente (se assente usa l'audio della clip)")
    ap.add_argument("--rms-db", type=float, default=-45.0)
    ap.add_argument("--min-ms", type=int, default=150)
    ap.add_argument("--sharpen", type=float, default=0.8)
    a = ap.parse_args()
    wav = Path(a.wav) if a.wav else None
    if wav is None:  # estrai l'audio della clip in un wav temporaneo
        wav = Path(a.out).with_suffix(".src.wav")
        subprocess.run([FFMPEG, "-v", "error", "-y", "-i", a.clip, "-ar", "24000", "-ac", "1", str(wav)], check=True)
    naturalizza(Path(a.clip), Path(a.base), wav, a.sid, Path(a.out),
                rms_db=a.rms_db, min_ms=a.min_ms, sharpen=a.sharpen)
    n = len(silenzi(wav, a.rms_db, a.min_ms))
    print(f"OK {a.out} · {n} finestre di silenzio gated")


if __name__ == "__main__":
    main()
