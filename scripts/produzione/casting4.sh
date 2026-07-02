#!/bin/bash
# Bootstrap pod casting v4 (voce cliente su XTTS, 4 varianti parametri).
# Ricetta COLLAUDATA: venv isolato + torch 2.4 pinnato + snapshot XTTS da R2.
set -u
LOG=/workspace/casting4.log
mkdir -p /workspace
exec > >(tee -a "$LOG") 2>&1
echo "=== casting4 $(date -u) ==="
nvidia-smi --query-gpu=name --format=csv,noheader || true
push_log() { rclone copyto --s3-no-check-bucket "$LOG" "r2:$R2_BUCKET/pilot/casting4/casting4.log" 2>/dev/null || true; }
trap push_log EXIT

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq && apt-get install -y -qq ffmpeg curl git unzip > /dev/null
curl -fsSL https://rclone.org/install.sh | bash > /dev/null 2>&1 || true
command -v rclone > /dev/null || { echo "FATAL: rclone non installato"; exit 1; }
rclone config create r2 s3 provider Cloudflare access_key_id "$R2_ACCESS_KEY_ID" \
  secret_access_key "$R2_SECRET_ACCESS_KEY" endpoint "$R2_ENDPOINT" acl private > /dev/null

echo "== snapshot XTTS + input =="
rclone copyto --s3-no-check-bucket "r2:$R2_BUCKET/snapshot/xtts-model.tar.gz" /workspace/xtts.tgz \
  && mkdir -p /root/.local/share && tar -xzf /workspace/xtts.tgz -C /root/.local/share && echo "modello XTTS da snapshot"
mkdir -p /workspace/c4
rclone copyto --s3-no-check-bucket "r2:$R2_BUCKET/pilot/in/voce-riferimento.mp3" /workspace/c4/voce-cliente.mp3
ffmpeg -v error -y -i /workspace/c4/voce-cliente.mp3 -ar 24000 -ac 1 /workspace/c4/voce-cliente.wav
rclone copyto --s3-no-check-bucket "r2:$R2_BUCKET/pilot/in/casting4-clientvoice.py" /workspace/casting4-clientvoice.py

echo "== venv (torch 2.4 PINNATO — lezione: coqui muore con torch recenti) =="
python -m venv /workspace/v4
/workspace/v4/bin/pip install -q "torch==2.4.0" "torchaudio==2.4.0"
/workspace/v4/bin/pip install -q coqui-tts "transformers>=4.57,<5" soundfile

echo "== CASTING4 =="
/workspace/v4/bin/python /workspace/casting4-clientvoice.py
echo "=== FINITO $(date -u) ==="
