#!/bin/bash
# Bootstrap pod casting v6 (fix XTTS pause/rumore + fix F5 velocità). Ricette collaudate:
# venv per motore, torch 2.4 pinnato, snapshot XTTS da R2, download F5 selettivo.
set -u
LOG=/workspace/casting6.log
mkdir -p /workspace
exec > >(tee -a "$LOG") 2>&1
echo "=== casting6 $(date -u) ==="
nvidia-smi --query-gpu=name --format=csv,noheader || true
push_log() { rclone copyto --s3-no-check-bucket "$LOG" "r2:$R2_BUCKET/pilot/casting6/casting6.log" 2>/dev/null || true; }
trap push_log EXIT

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq && apt-get install -y -qq ffmpeg curl git unzip > /dev/null
curl -fsSL https://rclone.org/install.sh | bash > /dev/null 2>&1 || true
command -v rclone > /dev/null || { echo "FATAL: rclone non installato"; exit 1; }
rclone config create r2 s3 provider Cloudflare access_key_id "$R2_ACCESS_KEY_ID" \
  secret_access_key "$R2_SECRET_ACCESS_KEY" endpoint "$R2_ENDPOINT" acl private > /dev/null

echo "== snapshot XTTS + input =="
rclone copyto --s3-no-check-bucket "r2:$R2_BUCKET/snapshot/xtts-model.tar.gz" /workspace/x.tgz \
  && mkdir -p /root/.local/share && tar -xzf /workspace/x.tgz -C /root/.local/share && rm /workspace/x.tgz \
  && echo "modello XTTS da snapshot"
mkdir -p /workspace/c6
rclone copyto --s3-no-check-bucket "r2:$R2_BUCKET/pilot/in/voce-riferimento.mp3" /workspace/c6/voce.mp3
ffmpeg -v error -y -i /workspace/c6/voce.mp3 -ar 24000 -ac 1 /workspace/c6/voce-cliente.wav
rclone copyto --s3-no-check-bucket "r2:$R2_BUCKET/pilot/in/casting6-fix.py" /workspace/casting6-fix.py

echo "== venv XTTS (torch 2.4 pinnato) =="
python -m venv /workspace/vx
/workspace/vx/bin/pip install -q "torch==2.4.0" "torchaudio==2.4.0"
/workspace/vx/bin/pip install -q coqui-tts "transformers>=4.57,<5" librosa soundfile

echo "== FASE XTTS (A3+D3) =="
PHASE=xtts /workspace/vx/bin/python /workspace/casting6-fix.py

echo "== venv F5 =="
python -m venv /workspace/vf
/workspace/vf/bin/pip install -q "torch==2.4.0" "torchaudio==2.4.0"
/workspace/vf/bin/pip install -q f5-tts faster-whisper librosa soundfile

echo "== FASE F5 (ref 10s + ref_text accurato) =="
PHASE=f5 /workspace/vf/bin/python /workspace/casting6-fix.py
echo "=== FINITO $(date -u) ==="
