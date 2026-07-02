#!/bin/bash
# Bootstrap pod per il CASTING VOCE (1x4090): XTTS studio speakers pre-selezionati per
# somiglianza col cliente + Kokoro im_nicola. Output su R2 pilot/casting/.
# Env: R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT, R2_BUCKET.

set -u
LOG=/workspace/casting.log
mkdir -p /workspace
exec > >(tee -a "$LOG") 2>&1
echo "=== casting-voce $(date -u) ==="
nvidia-smi --query-gpu=name --format=csv,noheader || true

push_log() { rclone copyto --s3-no-check-bucket "$LOG" "r2:$R2_BUCKET/pilot/casting/casting.log" 2>/dev/null || true; }
trap push_log EXIT

echo "== deps =="
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq && apt-get install -y -qq ffmpeg curl git espeak-ng build-essential python3-dev > /dev/null
curl -fsSL https://rclone.org/install.sh | bash > /dev/null 2>&1 || true
rclone config create r2 s3 provider Cloudflare access_key_id "$R2_ACCESS_KEY_ID" \
  secret_access_key "$R2_SECRET_ACCESS_KEY" endpoint "$R2_ENDPOINT" acl private > /dev/null

echo "== input: sample cliente (SOLO metro di somiglianza) + script casting =="
mkdir -p /workspace/casting
rclone copyto --s3-no-check-bucket "r2:$R2_BUCKET/pilot/in/voce-riferimento.mp3" /workspace/casting/voce-cliente.mp3
ffmpeg -v error -y -i /workspace/casting/voce-cliente.mp3 -ar 16000 -ac 1 /workspace/casting/voce-cliente.wav
rclone copyto --s3-no-check-bucket "r2:$R2_BUCKET/pilot/in/casting-voce.py" /workspace/casting-voce.py

echo "== snapshot XTTS da R2 (evita il download HuggingFace) =="
rclone copyto --s3-no-check-bucket "r2:$R2_BUCKET/snapshot/xtts-model.tar.gz" /workspace/xtts-model.tar.gz \
  && mkdir -p /root/.local/share && tar -xzf /workspace/xtts-model.tar.gz -C /root/.local/share \
  && echo "modello XTTS ripristinato da snapshot"

echo "== pip (ricetta collaudata pilota 2026-07-02) =="
pip install -q coqui-tts && pip install -q "transformers>=4.57,<5"
pip install -q resemblyzer soundfile kokoro

echo "== CASTING =="
python /workspace/casting-voce.py
echo "=== FINITO $(date -u) ==="
