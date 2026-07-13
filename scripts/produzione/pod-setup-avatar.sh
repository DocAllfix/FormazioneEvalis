#!/usr/bin/env bash
# Bootstrap pod GPU per il RENDER AVATAR (MuseTalk 1.5) — era Azure/R2.
# Idempotente: se su R2 esiste lo snapshot dell'ambiente lo ripristina (~5 min),
# altrimenti installa da zero e CREA lo snapshot per i pod successivi.
#
# Env attese (passarle esplicite via ssh/onstart, i pod NON le ereditano):
#   R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT, R2_BUCKET (evalis-produzione)
# Uso sul pod:  bash pod-setup-avatar.sh
# Poi il render: python render-avatar.py <corso> --shard shards/gpu-N.txt \
#                  --base /workspace/asset/base-<scelto>-crop.mp4 --purge-local
#   con env: PRODUZIONE_ROOT=/workspace/produzione
#            R2_AUDIO_REMOTE=r2:$R2_BUCKET/audio-master
#            R2_REMOTE=r2:$R2_BUCKET  (clip -> avatar-clips/<corso>/)
#            MUSETALK_DIR=/workspace/MuseTalk
set -euo pipefail
cd /workspace

echo "== rclone + remote R2"
command -v rclone >/dev/null || (curl -fsS https://rclone.org/install.sh | bash)
export RCLONE_CONFIG_R2_TYPE=s3 RCLONE_CONFIG_R2_PROVIDER=Cloudflare \
       RCLONE_CONFIG_R2_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
       RCLONE_CONFIG_R2_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
       RCLONE_CONFIG_R2_ENDPOINT="$R2_ENDPOINT" \
       RCLONE_S3_NO_CHECK_BUCKET=true
R2="r2:${R2_BUCKET:-evalis-produzione}"

echo "== ffmpeg"
command -v ffmpeg >/dev/null || (apt-get update -qq && apt-get install -y -qq ffmpeg)

SNAP="$R2/snapshot/musetalk-env.tar.zst"
if rclone lsf "$SNAP" >/dev/null 2>&1; then
  echo "== ripristino snapshot MuseTalk da R2"
  rclone cat "$SNAP" | tar -I zstd -xf - -C /workspace
else
  echo "== installazione MuseTalk 1.5 da zero"
  git clone --depth 1 https://github.com/TMElyralab/MuseTalk.git
  cd MuseTalk
  pip install -q -r requirements.txt
  # pesi ufficiali (script del repo; scarica musetalkV15, whisper, vae, ecc.)
  bash ./download_weights.sh
  cd /workspace
  echo "== creo snapshot su R2 per i prossimi pod"
  apt-get install -y -qq zstd
  tar -I 'zstd -3' -cf - MuseTalk | rclone rcat "$SNAP"
fi

echo "== asset base avatar da R2"
mkdir -p /workspace/asset
rclone copy "$R2/avatar-assets/" /workspace/asset/ --include "*.mp4"

echo "== toolkit produzione da R2"
mkdir -p /workspace/scripts
rclone copy "$R2/avatar-assets/toolkit/" /workspace/scripts/ --include "*.py"

echo "OK — pod pronto. Render: vedi intestazione di questo script."
