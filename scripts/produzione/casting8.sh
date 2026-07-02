#!/bin/bash
# Bootstrap casting v8: regole per-motore (punteggiatura via SOLO per XTTS; F5 col freno;
# VoxCPM cfg alto + pron-test; Qwen pron-test; riferimento smart senza esitazioni).
# PHASES (env, underscore-separated): sottoinsieme per lo split multi-pod.
set -u
LOG=/workspace/casting8.log
mkdir -p /workspace
exec > >(tee -a "$LOG") 2>&1
echo "=== casting8 $(date -u) ==="
nvidia-smi --query-gpu=name --format=csv,noheader || true
push_log() { rclone copyto --s3-no-check-bucket "$LOG" "r2:$R2_BUCKET/pilot/casting8/casting8-${PHASES:-all}.log" 2>/dev/null || true; }
trap push_log EXIT

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq && apt-get install -y -qq ffmpeg curl git unzip build-essential python3-dev > /dev/null
curl -fsSL https://rclone.org/install.sh | bash > /dev/null 2>&1 || true
command -v rclone > /dev/null || { echo "FATAL: rclone"; exit 1; }
rclone config create r2 s3 provider Cloudflare access_key_id "$R2_ACCESS_KEY_ID" \
  secret_access_key "$R2_SECRET_ACCESS_KEY" endpoint "$R2_ENDPOINT" acl private > /dev/null

mkdir -p /workspace/c8
rclone copyto --s3-no-check-bucket "r2:$R2_BUCKET/pilot/in/voce-riferimento.mp3" /workspace/c8/voce.mp3
ffmpeg -v error -y -i /workspace/c8/voce.mp3 -ar 24000 -ac 1 /workspace/c8/voce-cliente.wav
rclone copyto --s3-no-check-bucket "r2:$R2_BUCKET/pilot/in/casting8-voce.py" /workspace/casting8-voce.py

run_phase() {  # $1 venv  $2 phase
  echo "== FASE $2 (venv $1) =="
  PHASE=$2 CC=gcc COQUI_TOS_AGREED=1 /workspace/$1/bin/python /workspace/casting8-voce.py
}

PHASES="${PHASES:-prep_xtts_f5_voxcpm_qwenclone}"
echo "fasi di questo pod: $PHASES"

echo "== venv prep (whisper) =="
python -m venv /workspace/vp
/workspace/vp/bin/pip install -q "torch==2.4.0" "torchaudio==2.4.0" faster-whisper librosa soundfile
run_phase vp prep

case "$PHASES" in *xtts*)
  echo "== venv xtts =="
  rclone copyto --s3-no-check-bucket "r2:$R2_BUCKET/snapshot/xtts-model.tar.gz" /workspace/x.tgz \
    && mkdir -p /root/.local/share && tar -xzf /workspace/x.tgz -C /root/.local/share && rm /workspace/x.tgz \
    && echo "modello XTTS da snapshot"
  python -m venv /workspace/vx
  /workspace/vx/bin/pip install -q "torch==2.4.0" "torchaudio==2.4.0"
  /workspace/vx/bin/pip install -q coqui-tts "transformers>=4.57,<5" librosa soundfile
  run_phase vx xtts ;;
esac
case "$PHASES" in *f5*)
  echo "== venv f5 =="
  python -m venv /workspace/vf
  /workspace/vf/bin/pip install -q "torch==2.4.0" "torchaudio==2.4.0"
  /workspace/vf/bin/pip install -q f5-tts librosa soundfile
  run_phase vf f5 ;;
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
