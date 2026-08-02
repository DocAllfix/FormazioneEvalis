#!/usr/bin/env python3
"""Pagina di confronto RICETTA A/B: standard p0-m12 in cima + 5 varianti lunghe (stessa
slide/voce dello standard) scaricate da R2. L'utente sceglie la ricetta di produzione.

Uso:  python scripts/produzione/ricetta-ab-review.py
Output: produzione/_campione/avatar-pilota/ricetta-ab.html (+ clip accanto)
"""
import os, subprocess, sys
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from batch_audio_catalogo import env_r2, rclone_bin  # noqa: E402

ENV, BUCKET = env_r2()
RCLONE = rclone_bin()
OUT = Path("produzione/_campione/avatar-pilota")
OUT.mkdir(parents=True, exist_ok=True)

VARIANTI = [
    ("V1-replica-standard",  "V1 — replica dello standard, ma LUNGA (base corta 20s · x264 · senza gate)"),
    ("V2-pilota-nvenc-gate", "V2 — pilota di oggi (base piena · NVENC · gate-silenzi)"),
    ("V3-x264-gate",         "V3 — base piena · x264 · gate-silenzi"),
    ("V4-nvenc-nogate",      "V4 — base piena · NVENC · senza gate"),
    ("V5-x264-nogate",       "V5 — base piena · x264 · senza gate"),
]
for name, _ in VARIANTI:
    dst = OUT / f"{name}.mp4"
    if not dst.exists():
        print(f"scarico {name} ...")
        subprocess.run([RCLONE, "copyto", f"r2:{BUCKET}/avatar-clips/_ab/{name}.mp4", str(dst)],
                       env=ENV, check=True)

STD = "../avatar-smoke/val/p0-m12.mp4"  # relativo alla cartella di output
blocco = lambda src, tit, note="": f"""
<div class="clip"><h2>{tit}</h2>{f'<p class="d">{note}</p>' if note else ''}
  <div class="pair">
    <div><div class="lbl">SCALA REALE BOLLA (332px)</div>
      <video src="{src}" controls preload="metadata" style="width:332px;"></video></div>
    <div><div class="lbl">GRANDE</div>
      <video src="{src}" controls preload="metadata" style="width:540px;"></video></div>
  </div></div>"""

cards = blocco(STD, "⭐ STANDARD — p0-m12 (la tua scelta del 14/07)",
               "Segmento 45s della stessa slide (19011_m07_s004, dal sec 20). Ricetta: margin 8 · bbox −7 · jaw · −12dB · base corta · x264 · senza gate.")
for name, tit in VARIANTI:
    cards += blocco(f"{name}.mp4", tit)

html = f"""<!doctype html><html lang="it"><head><meta charset="utf-8">
<title>Ricetta A/B — scegli il riferimento di produzione</title><style>
body{{font-family:system-ui,sans-serif;background:#16130f;color:#e8e0d2;max-width:960px;margin:36px auto;padding:0 20px}}
h1{{font-size:22px}} h2{{font-size:16px;margin:30px 0 6px}} p.d{{color:#9a8d7a;font-size:13px;margin:0 0 10px}}
.pair{{display:flex;gap:24px;align-items:flex-start;flex-wrap:wrap}}
.lbl{{font-size:10px;letter-spacing:.18em;color:#9a8d7a;margin-bottom:6px}}
video{{background:#000;border-radius:8px;display:block}}
.box{{background:#241f18;border-radius:10px;padding:14px 18px;font-size:14px;color:#cfc4b2}}</style></head><body>
<h1>Ricetta A/B — stessa slide/voce dello standard, 5 varianti lunghe (235s)</h1>
<div class="box">Le 5 varianti hanno <b>parametri di articolazione identici allo standard</b>
(provati dal transcript: margin 8 · bbox −7 · jaw · −12dB · no bbox fissa). Cambiano SOLO:
base corta/piena, encoder NVENC/x264, gate-silenzi sì/no. <b>V1 deve somigliare allo standard</b>
(è la prova di controllo). Poi dicci quale variante tiene lo standard: quella diventa la ricetta del batch.
Le V2-V5 condividono la stessa identica inference: le differenze che vedi tra loro sono solo di post.</div>
{cards}
</body></html>"""
(OUT / "ricetta-ab.html").write_text(html, encoding="utf-8")
print(f"Pagina: {OUT / 'ricetta-ab.html'}")
