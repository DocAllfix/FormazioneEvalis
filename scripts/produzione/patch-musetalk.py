#!/usr/bin/env python3
"""Patch MuseTalk per BBOX FISSA su volto STATICO: dopo il calcolo dei coord per-frame,
impone la MEDIANA su tutti i frame -> azzera il jitter geometrico del crop/warp (che
deflicker/sharpen NON tolgono, perche' e' geometrico non luminoso). Ricerca 2026:
il punto e' subito prima di `coord_list_cycle = coord_list + coord_list[::-1]` in
scripts/realtime_inference.py (e inference.py). Idempotente e NON fatale (se non trova
il punto avvisa ed esce 0: il render gira comunque, senza la patch).
Attiva solo se env MUSETALK_FIXED_BBOX!=0 (default attivo)."""
import os, re, sys
from pathlib import Path

if os.environ.get("MUSETALK_FIXED_BBOX", "1") == "0":
    print("patch bbox-fissa DISATTIVATA (MUSETALK_FIXED_BBOX=0)"); sys.exit(0)

MT = Path(os.environ.get("MUSETALK_DIR", "/workspace/MuseTalk"))
MARK = "# [EVALIS] bbox fissa (mediana)"
INJECT = f'''{MARK}
try:
    import numpy as _np
    _valid = [c for c in coord_list_cycle if tuple(c) != (0, 0, 0, 0)]
    if _valid:
        _med = tuple(int(x) for x in _np.median(_np.array(_valid), axis=0))
        coord_list_cycle = [_med for _ in coord_list_cycle]
        print("[EVALIS] bbox fissa mediana:", _med, "su", len(coord_list_cycle), "frame")
except Exception as _e:
    print("[EVALIS] patch bbox saltata:", _e)
'''

patchati = 0
for nome in ("scripts/realtime_inference.py", "scripts/inference.py"):
    f = MT / nome
    if not f.exists():
        continue
    src = f.read_text(encoding="utf-8")
    if MARK in src:
        print(f"{nome}: gia' patchato"); patchati += 1; continue
    # inietta SUBITO DOPO la riga che costruisce coord_list_cycle, con la stessa indentazione
    m = re.search(r"^([ \t]*)coord_list_cycle\s*=\s*coord_list\s*\+\s*coord_list\[::-1\].*$",
                  src, re.M)
    if not m:
        print(f"{nome}: punto di iniezione non trovato (coord_list_cycle) — salto")
        continue
    indent = m.group(1)
    blocco = "\n".join(indent + l if l else l for l in INJECT.splitlines())
    src = src[:m.end()] + "\n" + blocco + src[m.end():]
    f.write_text(src, encoding="utf-8")
    print(f"{nome}: PATCHATO (bbox fissa iniettata)"); patchati += 1

print(f"patch bbox-fissa: {patchati} file")
sys.exit(0)
