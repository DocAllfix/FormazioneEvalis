#!/bin/bash
# Rilancia i gate sui moduli finiti ROSSO_MANUALE: azzera lo stato (la bozza resta, quindi
# NON si rigenerano le slide) e riparte con nuovi giri di fix. Ripete finché restano rossi
# o si esauriscono i tentativi. Uso: _recupera-rossi.sh <corso> [tentativi]
corso="${1:?corso}"; max="${2:-3}"
for giro in $(seq 1 "$max"); do
  rossi=$(grep -l '"stato": "ROSSO_MANUALE"' produzione/$corso/_log/*.state.json 2>/dev/null | sed 's/.*\///; s/\.state\.json//' | paste -sd,)
  [ -z "$rossi" ] && { echo "giro $giro: nessun modulo rosso"; break; }
  echo "giro $giro: rilancio $rossi"
  for m in ${rossi//,/ }; do rm -f "produzione/$corso/_log/$m.state.json"; done
  python scripts/produzione/orchestratore.py "$corso" --moduli "$rossi" --parallel 9 >/dev/null 2>&1
done
echo "--- esito finale ---"
for f in produzione/$corso/_log/*.state.json; do
  python -c "import json;d=json.load(open(r'$f',encoding='utf-8'));print(f\"  {d.get('modulo')}: {d.get('stato')}\")" 2>/dev/null
done
