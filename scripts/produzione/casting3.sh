#!/bin/bash
# Bootstrap pod casting v3 (tripla esplorazione: XTTS profondità + Chatterbox + Qwen3 design).
set -u
LOG=/workspace/casting3.log
mkdir -p /workspace
exec > >(tee -a "$LOG") 2>&1
echo "=== casting3 $(date -u) ==="
nvidia-smi --query-gpu=name --format=csv,noheader || true
push_log() { rclone copyto --s3-no-check-bucket "$LOG" "r2:$R2_BUCKET/pilot/casting3/casting3.log" 2>/dev/null || true; }
trap push_log EXIT

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq && apt-get install -y -qq ffmpeg curl git unzip espeak-ng build-essential python3-dev > /dev/null
curl -fsSL https://rclone.org/install.sh | bash > /dev/null 2>&1 || true
command -v rclone > /dev/null || { echo "FATAL: rclone non installato"; exit 1; }
rclone config create r2 s3 provider Cloudflare access_key_id "$R2_ACCESS_KEY_ID" \
  secret_access_key "$R2_SECRET_ACCESS_KEY" endpoint "$R2_ENDPOINT" acl private > /dev/null

echo "== snapshot XTTS da R2 =="
rclone copyto --s3-no-check-bucket "r2:$R2_BUCKET/snapshot/xtts-model.tar.gz" /workspace/xtts-model.tar.gz \
  && mkdir -p /root/.local/share && tar -xzf /workspace/xtts-model.tar.gz -C /root/.local/share \
  && echo "modello XTTS ripristinato"

echo "== pip =="
pip install -q coqui-tts && pip install -q "transformers>=4.57,<5"
pip install -q librosa soundfile
pip install -q chatterbox-tts || echo "PIP-FAIL: chatterbox-tts"
pip install -q qwen-tts || pip install -q qwen3-tts || echo "PIP-FAIL: qwen tts (fase 3 via SSH)"

rclone copyto --s3-no-check-bucket "r2:$R2_BUCKET/pilot/in/casting3-voce.py" /workspace/casting3-voce.py
echo "== CASTING3 =="
python /workspace/casting3-voce.py
echo "=== FINITO $(date -u) ==="
