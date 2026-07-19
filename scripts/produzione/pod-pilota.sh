#!/usr/bin/env bash
# PILOTA AVATAR — renderizza le clip campione attraverso il percorso IDENTICO alla produzione:
# stesso worker (render-avatar.py), stessi gate (sha wav==registro, durata ±0.3s, tag ID),
# stessa naturalizza (gate-silenzi), stesso upload su R2. Un pod, sequenziale: la prima
# invocazione fa anche la prep della base (una volta sola), le altre la riusano.
#
# Ricetta congelata (verdetti utente 2026-07-14/15): base ALT crop 1080:1080:420:0 → 540,
# bbox_shift -7, extra_margin 8, parsing jaw, NO bbox fissa (P0), audio-guida -12dB
# (voce piena nel file finale), naturalizza solo gate-silenzi.
#
# Uso (sul pod, dopo pod-setup-avatar.sh; r2.env in /workspace):
#   bash pod-pilota.sh
set -euo pipefail
cd /workspace
source /workspace/r2.env
export RCLONE_CONFIG_R2_TYPE=s3 RCLONE_CONFIG_R2_PROVIDER=Cloudflare \
       RCLONE_CONFIG_R2_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
       RCLONE_CONFIG_R2_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
       RCLONE_CONFIG_R2_ENDPOINT="$R2_ENDPOINT" RCLONE_S3_NO_CHECK_BUCKET=true
R2="r2:${R2_BUCKET}"
export PRODUZIONE_ROOT=/workspace/produzione MUSETALK_DIR=/workspace/MuseTalk \
       R2_AUDIO_REMOTE="$R2/audio-master" R2_REMOTE="$R2" \
       MUSETALK_BBOX_SHIFT=-7 MUSETALK_EXTRA_MARGIN=8 MUSETALK_PARSING_MODE=jaw \
       MUSETALK_FIXED_BBOX=0 MUSETALK_DRIVE_DB=-12
BASE=/workspace/asset/base-produzione.mp4
[ -s "$BASE" ] || { echo "base-produzione.mp4 mancante: eseguire prima pod-setup-avatar.sh"; exit 1; }

# clip campione: estremi di durata (piu' corta 190s, piu' lunga 389s), aperture con pause
# (test gate-silenzi), corsi/moduli diversi. Ordine: prima una corta (prep base + feedback rapido).
CLIPS=(
  "9001:9001_m09_s028"        # la PIU' CORTA del catalogo (190.7s)
  "19011:19011_m01_s001"      # apertura corso 1 — pause agenda, gate-silenzi
  "42001:42001_m06_s014"      # clip tipica ~mediana, corso navy
  "39001:39001_m11_s001"      # apertura modulo conduzione
  "agg14001:agg14001_m01_s001" # aggiornamento, apertura
  "50001:50001_m03_s012"      # la PIU' LUNGA del catalogo (389.4s) — stress pingpong
)
# TEMPI PRECISI: ogni fase marcata in /workspace/tempi.log (epoch;fase;dettaglio) —
# servono a calibrare il preventivo del batch su numeri REALI, non stimati.
TL=/workspace/tempi.log
t(){ echo "$(date +%s);$1;$2" >> "$TL"; }
t PILOTA_START ""
for pair in "${CLIPS[@]}"; do
  corso="${pair%%:*}"; sid="${pair##*:}"
  mkdir -p "/workspace/produzione/$corso"
  [ -s "/workspace/produzione/$corso/audio-map.json" ] || \
    rclone copyto "$R2/audio-master/$corso/audio-map.json" "/workspace/produzione/$corso/audio-map.json"
  echo "== PILOTA $sid =="
  t CLIP_START "$sid"
  python /workspace/toolkit/render-avatar.py "$corso" --only "$sid" --base "$BASE" --batch 20
  t CLIP_END "$sid"
done
t PILOTA_END ""
rclone copyto "$TL" "$R2/avatar-clips/_pilota-tempi.log" || true
echo "PILOTA COMPLETO — clip + .ok su $R2/avatar-clips/<corso>/ · tempi in _pilota-tempi.log"
