#!/bin/bash
# Ciclo di sicurezza: pod-render.sh puo' uscire prima del tempo (visto sullo shard 0:
# "ESG-FINITO" dopo 5 min su 68 slide). Qui si ripete finche' NON restano pendenti,
# cosi' un'uscita anticipata costa un giro, non un buco silenzioso nel corso.
source /workspace/r2.env
export SHARD_INDEX SHARD_TOTAL
# si aspetta che la catena di avvio abbia finito: due render in parallelo sulla stessa
# GPU si rubano memoria e rallentano entrambi.
while pgrep -f render-avatar.py > /dev/null 2>&1; do sleep 60; done
echo "=== catena iniziale conclusa, parte il ciclo di sicurezza ==="
for giro in 1 2 3 4 5 6 7 8 9 10 11 12; do
  vuoti=0
  for corso in fadesg02 fadeen02; do
    out=$(bash /workspace/toolkit/pod-render.sh "$corso" 2 2>&1 | tail -40)
    echo "--- giro $giro $corso ---"
    echo "$out" | grep -E "slide pendenti|nulla da fare|niente" | head -2
    echo "$out" | grep -qE ": 0 slide pendenti|nulla da fare" && vuoti=$((vuoti+1))
  done
  [ "$vuoti" -ge 2 ] && { echo "=== NULLA PIU DA FARE (giro $giro) ==="; break; }
done
echo "=== CICLO CHIUSO ==="
