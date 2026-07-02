#!/usr/bin/env bash
# Bootstrap del pod GPU (Vast.ai, immagine pytorch/pytorch CUDA 12.x). Idempotente: ~15 min.
# Installa: ffmpeg, MuseTalk (+pesi), XTTS v2 (coqui-tts), CosyVoice2, faster-whisper, rclone, Node.
#
# Uso sul pod:  bash pod-setup.sh [xtts|cosyvoice|all]   (default: all)
# Poi copiare sul pod: scripts/produzione/, produzione/<corso>/{copioni,glossario-tts,audio-map}.json,
# produzione/asset/ (base + voce). Env attesi: R2_REMOTE (rclone), CLOUDFLARE_* per upload-clips.

set -euo pipefail
WORKSPACE="${WORKSPACE:-/workspace}"
WHAT="${1:-all}"
cd "$WORKSPACE"

echo "== apt: ffmpeg, git, build tools =="
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq ffmpeg git wget curl unzip > /dev/null

echo "== Node 22 (per make-shards/upload-clips sul pod) =="
if ! command -v node > /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - > /dev/null
  apt-get install -y -qq nodejs > /dev/null
fi

echo "== rclone (sync master su R2) =="
command -v rclone > /dev/null || (curl -fsSL https://rclone.org/install.sh | bash > /dev/null)

echo "== MuseTalk + pesi =="
if [ ! -d MuseTalk ]; then
  git clone -q https://github.com/TMElyralab/MuseTalk.git
  cd MuseTalk
  pip install -q -r requirements.txt
  pip install -q --no-cache-dir -U openmim
  mim install -q mmengine "mmcv==2.1.0" "mmdet>=3.1.0" "mmpose>=1.1.0"
  bash ./download_weights.sh
  cd "$WORKSPACE"
fi
export MUSETALK_DIR="$WORKSPACE/MuseTalk"

if [ "$WHAT" = "xtts" ] || [ "$WHAT" = "all" ]; then
  echo "== XTTS v2 (coqui-tts) =="
  pip show coqui-tts > /dev/null 2>&1 || pip install -q coqui-tts
fi

if [ "$WHAT" = "cosyvoice" ] || [ "$WHAT" = "all" ]; then
  echo "== CosyVoice2 =="
  if [ ! -d CosyVoice ]; then
    git clone -q --recursive https://github.com/FunAudioLLM/CosyVoice.git
    cd CosyVoice
    pip install -q -r requirements.txt
    python - <<'PY'
from modelscope import snapshot_download
snapshot_download("iic/CosyVoice2-0.5B", local_dir="pretrained_models/CosyVoice2-0.5B")
PY
    cd "$WORKSPACE"
  fi
  export PYTHONPATH="$WORKSPACE/CosyVoice:$WORKSPACE/CosyVoice/third_party/Matcha-TTS:${PYTHONPATH:-}"
fi

echo "== faster-whisper (gate QA round-trip) =="
pip show faster-whisper > /dev/null 2>&1 || pip install -q faster-whisper

cat <<EOF

OK · pod pronto. Prossimi passi:
  1. rsync/scp dal locale: scripts/produzione/ + produzione/<corso>/*.json + produzione/asset/
  2. export MUSETALK_DIR=$WORKSPACE/MuseTalk ; export R2_REMOTE=r2:evalis-produzione (rclone config)
  3. Audio:  python scripts/produzione/gen-audio.py <corso> --engine xtts --ref produzione/asset/voce-riferimento.wav
  4. QA:     python scripts/produzione/qa-audio.py <corso>
  5. Render: python scripts/produzione/render-avatar.py <corso> --shard produzione/<corso>/shards/gpu-0.txt --base produzione/asset/base-neo2.mp4
  6. Upload: node scripts/produzione/upload-clips.mjs <corso>
EOF
