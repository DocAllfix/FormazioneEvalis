#!/usr/bin/env python3
"""Monitor avanzamento render avatar da R2 — SOLA LETTURA (non tocca nulla).
Conta le clip validate (.mp4.ok su r2:<bucket>/avatar-clips/<corso>/) contro le slide
attese (copioni) e mostra % per corso + totale. Con --watch <sec> ripete e stima
ritmo (clip/min) + ETA + rileva stalli.

Uso:
  python scripts/produzione/monitor-avatar.py                 # tutti i corsi, una volta
  python scripts/produzione/monitor-avatar.py 19011           # un corso
  python scripts/produzione/monitor-avatar.py 19011 --watch 60 # ogni 60s con ritmo+ETA
"""
import sys, os, time, json, glob, subprocess

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from batch_audio_catalogo import env_r2, rclone_bin  # noqa: E402

ENV, BUCKET = env_r2()
RCLONE = rclone_bin()

args = [a for a in sys.argv[1:] if not a.startswith("--")]
watch = None
if "--watch" in sys.argv:
    watch = int(sys.argv[sys.argv.index("--watch") + 1])

def corsi_disponibili():
    return sorted(os.path.basename(os.path.dirname(f)) for f in glob.glob("produzione/*/copioni.json"))

CORSI = args if args else corsi_disponibili()

def attese(corso):
    d = json.load(open(f"produzione/{corso}/copioni.json", encoding="utf-8"))
    return len([s for s in d.get("slides", [])])

def fatte(corso):
    r = subprocess.run([RCLONE, "lsf", f"r2:{BUCKET}/avatar-clips/{corso}/", "--include", "*.mp4.ok"],
                       capture_output=True, text=True, env=ENV)
    return sum(1 for x in r.stdout.split() if x.endswith(".mp4.ok"))

def snapshot():
    tot_a = tot_f = 0
    righe = []
    for c in CORSI:
        a = attese(c); f = fatte(c)
        tot_a += a; tot_f += f
        pct = 100 * f / a if a else 0
        righe.append((c, f, a, pct))
    return righe, tot_f, tot_a

def stampa(righe, tot_f, tot_a, extra=""):
    print(f"\n=== avatar su R2 · {time.strftime('%H:%M:%S')} {extra} ===")
    for c, f, a, pct in righe:
        bar = "#" * int(pct / 5) + "." * (20 - int(pct / 5))
        print(f"  {c:<9} [{bar}] {f:>4}/{a:<4} {pct:5.1f}%")
    ptot = 100 * tot_f / tot_a if tot_a else 0
    print(f"  {'TOTALE':<9} {tot_f}/{tot_a}  {ptot:.1f}%")

if not watch:
    righe, tf, ta = snapshot()
    stampa(righe, tf, ta)
    sys.exit(0)

# --- modalità watch: ritmo + ETA + stallo ---
prev_f, prev_t = None, None
stallo = 0
while True:
    righe, tf, ta = snapshot()
    extra = ""
    now = time.time()
    if prev_f is not None:
        dt = (now - prev_t) / 60.0
        rate = (tf - prev_f) / dt if dt > 0 else 0
        if tf == prev_f:
            stallo += 1
            extra = f"· ritmo 0 clip/min · STALLO x{stallo}"
        else:
            stallo = 0
            eta = (ta - tf) / rate if rate > 0 else float("inf")
            extra = f"· ritmo {rate:.1f} clip/min · ETA {eta/60:.1f}h" if eta != float("inf") else "· ETA n/d"
    stampa(righe, tf, ta, extra)
    if tf >= ta:
        print("\nCOMPLETO — tutte le clip attese sono su R2.")
        break
    prev_f, prev_t = tf, now
    time.sleep(watch)
