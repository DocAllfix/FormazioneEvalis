#!/bin/bash
# BOOTSTRAP DEFINITIVO pod produzione AUDIO (Vox titolare) — tutte le lezioni del 2026-07-02.
# Env: R2_*, CORSO (es. 19011), SOLO_IDS (opz., lista --only), SNAPSHOT_PUSH=1 (primo giro).
# Sostituisce i casting*.sh. Log: /workspace/audio.log (+ push su R2 a fine run).
set -u
LOG=/workspace/audio.log
mkdir -p /workspace
exec > >(tee -a "$LOG") 2>&1
echo "=== pod-audio $(date -u) · corso=$CORSO ==="
nvidia-smi --query-gpu=name,driver_version --format=csv,noheader || true
push_log() { rclone copyto --s3-no-check-bucket "$LOG" "r2:$R2_BUCKET/produzione/$CORSO/log/audio-$(date -u +%H%M).log" 2>/dev/null || true; }
trap push_log EXIT

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq && apt-get install -y -qq ffmpeg curl git unzip build-essential python3-dev zstd > /dev/null
curl -fsSL https://rclone.org/install.sh | bash > /dev/null 2>&1 || true
command -v rclone > /dev/null || { echo "FATALE: rclone non installato"; exit 1; }
rclone config create r2 s3 provider Cloudflare access_key_id "$R2_ACCESS_KEY_ID" \
  secret_access_key "$R2_SECRET_ACCESS_KEY" endpoint "$R2_ENDPOINT" acl private > /dev/null
df -h /workspace | tail -1

echo "== input: script + copioni + glossario + riferimento + manifest =="
W=/workspace/prod; mkdir -p "$W/produzione/$CORSO" "$W/scripts/produzione" "$W/produzione/asset"
for f in gen-audio.py tts_ricetta.py qa_ricetta.py; do
  rclone copyto --s3-no-check-bucket "r2:$R2_BUCKET/pilot/in/$f" "$W/scripts/produzione/$f"
done
for f in copioni.json glossario-tts.json; do
  rclone copyto --s3-no-check-bucket "r2:$R2_BUCKET/produzione/$CORSO/$f" "$W/produzione/$CORSO/$f"
done
rclone copyto --s3-no-check-bucket "r2:$R2_BUCKET/pilot/in/voce-riferimento-el.wav" "$W/produzione/asset/voce-riferimento-el.wav"
rclone copyto --s3-no-check-bucket "r2:$R2_BUCKET/pilot/in/voce-manifest.json" "$W/produzione/asset/voce-manifest.json"

echo "== HASH-CHECK riferimento (voce immutabile) =="
python3 - <<'PY' || { echo "FATALE: hash riferimento diverso dal manifest"; exit 1; }
import hashlib, json
m = json.load(open("/workspace/prod/produzione/asset/voce-manifest.json"))
h = hashlib.sha256(open("/workspace/prod/produzione/asset/voce-riferimento-el.wav","rb").read()).hexdigest()
assert h == m["sha256"], f"{h} != {m['sha256']}"
print("hash riferimento VERIFICATO:", h[:16], "…")
PY

echo "== venv vox (torch cu126 — lezione driver; CUDA obbligatoria) =="
# snapshot: si usa SOLO se scaricato, non vuoto ED estratto con successo; altrimenti
# fallback SEMPRE alla build da zero (lezione: mai fidarsi di un ramo felice non verificato)
SNAP_OK=0
# venv già presente e funzionante sul pod (rilanci) -> si riusa, niente rebuild
if [ -x /workspace/vv/bin/python ] && /workspace/vv/bin/python -c "import torch, voxcpm" 2>/dev/null; then
  SNAP_OK=1; echo "venv già presente sul pod: riuso"
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
  /workspace/vv/bin/pip install -q voxcpm faster-whisper librosa soundfile
fi
/workspace/vv/bin/python -c "import torch; assert torch.cuda.is_available(), 'CUDA ASSENTE'; print('cuda: True')" \
  || { echo "FATALE: CUDA non disponibile nel venv (mai generare su CPU)"; exit 1; }

echo "== GENERAZIONE (loop QA autonomo dentro gen-audio) =="
cd "$W"
ARGS=""
# SOLO_IDS separati da ':' (le virgole negli env di Vast sono a rischio parsing)
[ -n "${SOLO_IDS:-}" ] && ARGS="--only $(echo "$SOLO_IDS" | tr ':' ',')"
CC=gcc /workspace/vv/bin/python scripts/produzione/gen-audio.py "$CORSO" --engine vox \
  --ref produzione/asset/voce-riferimento-el.wav --manifest produzione/asset/voce-manifest.json $ARGS

echo "== push risultati su R2 =="
rclone copy --s3-no-check-bucket "$W/produzione/$CORSO/audio/" "r2:$R2_BUCKET/produzione/$CORSO/audio/"
rclone copyto --s3-no-check-bucket "$W/produzione/$CORSO/audio-map.json" "r2:$R2_BUCKET/produzione/$CORSO/audio-map.json"

if [ "${SNAPSHOT_PUSH:-}" = "1" ]; then
  echo "== snapshot ambiente su R2 (i pod delle notti partono in ~4 min) =="
  apt-get install -y -qq zstd > /dev/null
  # dentro: venv + cache HF (VoxCPM2 + whisper large-v3)
  tar --zstd -cf /workspace/env.tzst -C /workspace vv --exclude='*.pyc' 2>/dev/null || true
  tar --zstd -cf /workspace/hf.tzst -C /root .cache/huggingface 2>/dev/null || true
  rclone copyto --s3-no-check-bucket /workspace/env.tzst "r2:$R2_BUCKET/snapshot/voxprod-env.tar.zst"
  rclone copyto --s3-no-check-bucket /workspace/hf.tzst "r2:$R2_BUCKET/snapshot/voxprod-hf.tar.zst"
  echo "snapshot caricati"
fi
echo "=== POD-AUDIO FINITO $(date -u) ==="
