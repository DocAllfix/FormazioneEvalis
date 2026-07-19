#!/usr/bin/env python3
"""Revisione PILOTA avatar: scarica le clip campione da R2, riverifica le durate contro i
registri (durata clip vs durata_s ±0.3s) e costruisce una pagina HTML locale con:
vista a scala reale della bolla del player (332px) + vista grande + tabella esiti.

Uso:  python scripts/produzione/pilota-review.py
Output: produzione/_campione/avatar-pilota/pilota-avatar.html (+ clip .mp4 accanto)
"""
import json, os, subprocess, sys
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from batch_audio_catalogo import env_r2, rclone_bin  # noqa: E402

ENV, BUCKET = env_r2()
RCLONE = rclone_bin()
TOL = 0.3
CLIPS = [  # (corso, id) — stesse del pod-pilota.sh
    ("9001", "9001_m09_s028"),
    ("19011", "19011_m01_s001"),
    ("42001", "42001_m06_s014"),
    ("39001", "39001_m11_s001"),
    ("agg14001", "agg14001_m01_s001"),
    ("50001", "50001_m03_s012"),
]
OUT = Path("produzione/_campione/avatar-pilota")
OUT.mkdir(parents=True, exist_ok=True)

def probe_dur(p: Path) -> float:
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                        "-of", "csv=p=0", str(p)], capture_output=True, text=True, check=True)
    return round(float(r.stdout.strip()), 2)

righe = []
for corso, sid in CLIPS:
    am = json.load(open(f"produzione/{corso}/audio-map.json", encoding="utf-8"))
    attesa = am[sid]["duration"]
    mp4 = OUT / f"{sid}.mp4"
    if not mp4.exists():
        print(f"scarico {sid} ...")
        subprocess.run([RCLONE, "copyto", f"r2:{BUCKET}/avatar-clips/{corso}/{sid}.mp4", str(mp4)],
                       env=ENV, check=True)
    okj = subprocess.run([RCLONE, "cat", f"r2:{BUCKET}/avatar-clips/{corso}/{sid}.mp4.ok"],
                         env=ENV, capture_output=True, text=True)
    ok_meta = json.loads(okj.stdout) if okj.returncode == 0 and okj.stdout.strip() else {}
    reale = probe_dur(mp4)
    delta = reale - attesa
    esito = "PASS" if abs(delta) <= TOL else "FAIL"
    righe.append((sid, corso, attesa, reale, delta, esito, ok_meta.get("duration")))
    print(f"{esito}  {sid}: attesa {attesa}s · reale {reale}s · delta {delta:+.2f}s")

rows = "".join(
    f"<tr class='{e.lower()}'><td>{s}</td><td>{c}</td><td>{a:.1f}s</td><td>{r:.1f}s</td>"
    f"<td>{d:+.2f}s</td><td><b>{e}</b></td></tr>" for s, c, a, r, d, e, _ in righe)
cards = "".join(f"""
<div class="clip">
  <h2>{s} <span>({c} · attesa {a:.1f}s · reale {r:.1f}s · {e})</span></h2>
  <div class="pair">
    <div><div class="lbl">SCALA REALE BOLLA PLAYER (332px)</div>
      <video src="{s}.mp4" controls preload="metadata" style="width:332px;"></video></div>
    <div><div class="lbl">GRANDE (verifica labiale/bordi)</div>
      <video src="{s}.mp4" controls preload="metadata" style="width:540px;"></video></div>
  </div>
</div>""" for s, c, a, r, d, e, _ in righe)

html = f"""<!doctype html><html lang="it"><head><meta charset="utf-8">
<title>Pilota avatar — revisione clip campione</title><style>
body{{font-family:system-ui,sans-serif;background:#16130f;color:#e8e0d2;max-width:960px;margin:36px auto;padding:0 20px}}
h1{{font-size:22px}} h2{{font-size:16px;margin:26px 0 10px}} h2 span{{color:#9a8d7a;font-weight:400;font-size:13px}}
table{{border-collapse:collapse;width:100%;font-size:14px;margin:18px 0 30px}}
td,th{{border-bottom:1px solid #3a332a;padding:8px 10px;text-align:left}}
tr.pass td b{{color:#7dc98f}} tr.fail td b{{color:#e06c5a}}
.pair{{display:flex;gap:24px;align-items:flex-start;flex-wrap:wrap}}
.lbl{{font-size:10px;letter-spacing:.18em;color:#9a8d7a;margin-bottom:6px}}
video{{background:#000;border-radius:8px;display:block}}
p.nota{{color:#9a8d7a;font-size:13px}}</style></head><body>
<h1>Pilota avatar — {len(righe)} clip campione (ricetta congelata)</h1>
<p class="nota">Base ALT · crop 1080→540 · bbox_shift −7 · extra_margin 8 · parsing jaw · P0 (no bbox fissa)
· audio-guida −12dB (voce piena nel file) · gate-silenzi. Controlla: labiale, silenzi (bocca a riposo),
inversioni del loop (clip lunga 50001), bordi del volto, audio pieno e in sync.</p>
<table><tr><th>Clip</th><th>Corso</th><th>Durata attesa</th><th>Reale</th><th>Δ</th><th>Esito</th></tr>{rows}</table>
{cards}
</body></html>"""
(OUT / "pilota-avatar.html").write_text(html, encoding="utf-8")
fails = [r for r in righe if r[5] == "FAIL"]
print(f"\nPagina: {OUT / 'pilota-avatar.html'}  ·  {len(righe)-len(fails)} PASS / {len(fails)} FAIL")
sys.exit(1 if fails else 0)
