#!/bin/bash
# Bootstrap casting v7: 4 motori, 4 venv isolati (LEZIONE: un motore = un venv), fasi sequenziali.
set -u
LOG=/workspace/casting7.log
mkdir -p /workspace
exec > >(tee -a "$LOG") 2>&1
echo "=== casting7 $(date -u) ==="
nvidia-smi --query-gpu=name --format=csv,noheader || true
push_log() { rclone copyto --s3-no-check-bucket "$LOG" "r2:$R2_BUCKET/pilot/casting7/casting7.log" 2>/dev/null || true; }
trap push_log EXIT

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq && apt-get install -y -qq ffmpeg curl git unzip > /dev/null
curl -fsSL https://rclone.org/install.sh | bash > /dev/null 2>&1 || true
command -v rclone > /dev/null || { echo "FATAL: rclone"; exit 1; }
rclone config create r2 s3 provider Cloudflare access_key_id "$R2_ACCESS_KEY_ID" \
  secret_access_key "$R2_SECRET_ACCESS_KEY" endpoint "$R2_ENDPOINT" acl private > /dev/null

mkdir -p /workspace/c7
rclone copyto --s3-no-check-bucket "r2:$R2_BUCKET/pilot/in/voce-riferimento.mp3" /workspace/c7/voce.mp3
ffmpeg -v error -y -i /workspace/c7/voce.mp3 -ar 24000 -ac 1 /workspace/c7/voce-cliente.wav
rclone copyto --s3-no-check-bucket "r2:$R2_BUCKET/pilot/in/casting7-voce.py" /workspace/casting7-voce.py

run_phase() {  # $1 venv  $2 phase
  echo "== FASE $2 (venv $1) =="
  PHASE=$2 COQUI_TOS_AGREED=1 /workspace/$1/bin/python /workspace/casting7-voce.py
}

# PHASES (env): sottoinsieme di fasi per lo split multi-pod (default: tutte)
PHASES="${PHASES:-prep azzurra sibilia voxcpm qwenclone}"
echo "fasi di questo pod: $PHASES"

echo "== venv prep (whisper) =="
python -m venv /workspace/vp
/workspace/vp/bin/pip install -q "torch==2.4.0" "torchaudio==2.4.0" faster-whisper librosa soundfile
run_phase vp prep   # il prep serve SEMPRE (ref10 + ref-text locali al pod)

case "$PHASES" in *azzurra*)
  echo "== venv azzurra (transformers CSM) =="
  python -m venv /workspace/va
  /workspace/va/bin/pip install -q "torch==2.4.0" "torchaudio==2.4.0" "transformers>=4.52" accelerate librosa soundfile
  run_phase va azzurra ;;
esac
case "$PHASES" in *sibilia*)
  echo "== venv sibilia =="
  python -m venv /workspace/vs
  /workspace/vs/bin/pip install -q "torch==2.4.0" "torchaudio==2.4.0" "transformers>=4.52" accelerate librosa soundfile
  run_phase vs sibilia ;;
esac
case "$PHASES" in *voxcpm*)
  echo "== venv voxcpm =="
  python -m venv /workspace/vv
  /workspace/vv/bin/pip install -q "torch==2.4.0" "torchaudio==2.4.0"
  /workspace/vv/bin/pip install -q voxcpm librosa soundfile
  run_phase vv voxcpm ;;
esac
case "$PHASES" in *qwenclone*)
  echo "== venv qwen =="
  python -m venv /workspace/vq
  /workspace/vq/bin/pip install -q "torch==2.4.0" "torchaudio==2.4.0"
  /workspace/vq/bin/pip install -q qwen-tts librosa soundfile
  run_phase vq qwenclone ;;
esac

echo "=== FINITO $(date -u) ==="
