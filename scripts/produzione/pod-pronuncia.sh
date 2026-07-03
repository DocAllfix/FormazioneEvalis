#!/bin/bash
# Bootstrap pod MATRICE PRONUNCIA (test-pronuncia.py) — derivato da pod-audio.sh.
# Env richieste: R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT, R2_BUCKET.
set -u
LOG=/workspace/pronuncia.log
mkdir -p /workspace
exec > >(tee -a "$LOG") 2>&1
echo "=== pod-pronuncia $(date -u) ==="
nvidia-smi --query-gpu=name,driver_version --format=csv,noheader || true
push_log() { rclone copyto --s3-no-check-bucket "$LOG" "r2:$R2_BUCKET/pronuncia/pronuncia.log" 2>/dev/null || true; }
trap push_log EXIT

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq && apt-get install -y -qq ffmpeg curl unzip zstd build-essential python3-dev > /dev/null  # unzip: rclone · build-essential: triton (CC)
curl -fsSL https://rclone.org/install.sh | bash > /dev/null 2>&1 || true
command -v rclone > /dev/null || { echo "FATALE: rclone non installato"; exit 1; }
rclone config create r2 s3 provider Cloudflare access_key_id "$R2_ACCESS_KEY_ID" \
  secret_access_key "$R2_SECRET_ACCESS_KEY" endpoint "$R2_ENDPOINT" acl private > /dev/null

TEST="${TEST:-test-pronuncia.py}"   # script di test da eseguire (env TEST)
W=/workspace/prod; mkdir -p "$W/produzione/asset" "$W/scripts/produzione"
rclone copyto --s3-no-check-bucket "r2:$R2_BUCKET/pilot/in/$TEST" "$W/scripts/produzione/$TEST"
rclone copyto --s3-no-check-bucket "r2:$R2_BUCKET/pilot/in/tts_ricetta.py" "$W/scripts/produzione/tts_ricetta.py"
rclone copyto --s3-no-check-bucket "r2:$R2_BUCKET/pilot/in/voce-riferimento-el.wav" "$W/produzione/asset/voce-riferimento-el.wav"
rclone copyto --s3-no-check-bucket "r2:$R2_BUCKET/pilot/in/voce-manifest.json" "$W/produzione/asset/voce-manifest.json"
# riferimento v2 (opzionale): se non c'è su R2 la matrice gira solo sulle grafie
rclone copyto --s3-no-check-bucket "r2:$R2_BUCKET/pilot/in/voce-riferimento-el-v2.wav" "$W/produzione/asset/voce-riferimento-el-v2.wav" 2>/dev/null || true
rclone copyto --s3-no-check-bucket "r2:$R2_BUCKET/pilot/in/voce-manifest-v2.json" "$W/produzione/asset/voce-manifest-v2.json" 2>/dev/null || true

echo "== HASH-CHECK riferimento =="
python3 - <<'PY' || { echo "FATALE: hash riferimento diverso dal manifest"; exit 1; }
import hashlib, json
m = json.load(open("/workspace/prod/produzione/asset/voce-manifest.json"))
h = hashlib.sha256(open("/workspace/prod/produzione/asset/voce-riferimento-el.wav","rb").read()).hexdigest()
assert h == m["sha256"], f"{h} != {m['sha256']}"
print("hash riferimento VERIFICATO:", h[:16], "…")
PY

echo "== venv vox da snapshot =="
SNAP_OK=0
if [ -x /workspace/vv/bin/python ] && /workspace/vv/bin/python -c "import torch, voxcpm" 2>/dev/null; then
  SNAP_OK=1; echo "venv già presente: riuso"
elif rclone copyto --s3-no-check-bucket "r2:$R2_BUCKET/snapshot/voxprod-env.tar.zst" /workspace/env.tzst 2>/dev/null \
   && [ -s /workspace/env.tzst ] \
   && tar --zstd -xf /workspace/env.tzst -C /workspace 2>/dev/null \
   && [ -x /workspace/vv/bin/python ]; then
  SNAP_OK=1; echo "ambiente da snapshot R2"
  rclone copyto --s3-no-check-bucket "r2:$R2_BUCKET/snapshot/voxprod-hf.tar.zst" /workspace/hf.tzst 2>/dev/null \
    && [ -s /workspace/hf.tzst ] && tar --zstd -xf /workspace/hf.tzst -C /root 2>/dev/null && echo "cache HF da snapshot"
fi
rm -f /workspace/env.tzst /workspace/hf.tzst
if [ $SNAP_OK -eq 0 ]; then
  echo "snapshot assente/corrotto: build venv da zero"
  rm -rf /workspace/vv
  python -m venv /workspace/vv
  /workspace/vv/bin/pip install -q torch==2.7.1 torchaudio==2.7.1 --index-url https://download.pytorch.org/whl/cu126
  /workspace/vv/bin/pip install -q voxcpm librosa soundfile
fi
/workspace/vv/bin/python -c "import torch; assert torch.cuda.is_available(); print('cuda: True')" \
  || { echo "FATALE: CUDA non disponibile"; exit 1; }

echo "== MATRICE PRONUNCIA =="
cd "$W"
CC=gcc /workspace/vv/bin/python "scripts/produzione/$TEST"

echo "== push risultati =="
rclone copy --s3-no-check-bucket "$W/pronuncia/" "r2:$R2_BUCKET/pronuncia/"
echo "=== POD-PRONUNCIA FINITO $(date -u) ==="
