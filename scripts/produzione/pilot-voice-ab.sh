#!/bin/bash
# Gate C — A/B voce clonata sul pod (XTTS v2 vs CosyVoice2), completamente automatico.
# Gira come onstart su Vast.ai (immagine pytorch, 1x4090). Input da R2 (pilot/in/),
# output su R2 (pilot/out/): 4 wav (s002/s006 x 2 engine), timings.json, ab.log, DONE.
# Resiliente: se un engine fallisce, l'altro viene comunque consegnato.
# Env richiesti: R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT, R2_BUCKET.
# ENGINE=xtts|cosy|all (default all) — con 2 pod in parallelo: un engine per pod.

set -u
ENGINE="${ENGINE:-all}"
LOG=/workspace/ab-$ENGINE.log
mkdir -p /workspace
exec > >(tee -a "$LOG") 2>&1
echo "=== pilot-voice-ab $(date -u) ==="
nvidia-smi --query-gpu=name,memory.total --format=csv,noheader || true

IDS="19011_m01_s002,19011_m01_s006"
W=/workspace/pilot
R2REMOTE="r2:${R2_BUCKET}/pilot"
XTTS_STATUS=fail
COSY_STATUS=fail

push_log() { rclone copyto "$LOG" "$R2REMOTE/out/ab-$ENGINE.log" 2>/dev/null || true; }
trap push_log EXIT

echo "== deps di base =="
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq && apt-get install -y -qq ffmpeg curl unzip git > /dev/null
curl -fsSL https://rclone.org/install.sh | bash > /dev/null 2>&1 || true
rclone config create r2 s3 provider Cloudflare access_key_id "$R2_ACCESS_KEY_ID" \
  secret_access_key "$R2_SECRET_ACCESS_KEY" endpoint "$R2_ENDPOINT" acl private > /dev/null

echo "== input da R2 =="
mkdir -p "$W/in"
rclone copy "$R2REMOTE/in/" "$W/in/" || { echo "FATAL: input R2 mancanti"; exit 1; }
ls -la "$W/in"

echo "== voce di riferimento: mp3 -> wav 24k mono =="
ffmpeg -v error -y -i "$W/in/voce-riferimento.mp3" -ar 24000 -ac 1 "$W/voce.wav"

echo "== trascrizione del riferimento (faster-whisper, serve a CosyVoice) =="
pip install -q faster-whisper
python - <<'PY'
from faster_whisper import WhisperModel
m = WhisperModel("small", device="cuda", compute_type="float16")
segs, _ = m.transcribe("/workspace/pilot/voce.wav", language="it")
text = " ".join(s.text.strip() for s in segs)
open("/workspace/pilot/ref-text.txt", "w", encoding="utf-8").write(text)
print("REF-TEXT:", text)
PY

# layout per engine (root separate: stessi ID, file separati)
for eng in xtts cosy; do
  mkdir -p "$W/ab-$eng/19011"
  cp "$W/in/copioni.json" "$W/in/glossario-tts.json" "$W/ab-$eng/19011/"
done

if [ "$ENGINE" = "xtts" ] || [ "$ENGINE" = "all" ]; then
echo "== XTTS v2 =="
pip install -q coqui-tts && {
  export COQUI_TOS_AGREED=1
  export PRODUZIONE_ROOT="$W/ab-xtts"
  T0=$SECONDS
  python "$W/in/gen-audio.py" 19011 --engine xtts --ref "$W/voce.wav" --only "$IDS" \
    && { XTTS_STATUS=ok; echo "XTTS_WALL_SECONDS=$((SECONDS-T0))" >> /workspace/timings.txt; }
}
fi

if [ "$ENGINE" = "cosy" ] || [ "$ENGINE" = "all" ]; then
echo "== CosyVoice2 =="
cd /workspace
if [ ! -d CosyVoice ]; then git clone -q --recursive https://github.com/FunAudioLLM/CosyVoice.git; fi
cd CosyVoice
pip install -q -r requirements.txt || pip install -q -r requirements.txt --no-deps || true
pip show modelscope > /dev/null 2>&1 || pip install -q modelscope
python - <<'PY' || true
from modelscope import snapshot_download
snapshot_download("iic/CosyVoice2-0.5B", local_dir="/workspace/CosyVoice/pretrained_models/CosyVoice2-0.5B")
PY
export PYTHONPATH="/workspace/CosyVoice:/workspace/CosyVoice/third_party/Matcha-TTS:${PYTHONPATH:-}"
export COSYVOICE_MODEL_DIR="/workspace/CosyVoice/pretrained_models/CosyVoice2-0.5B"
export COSYVOICE_REF_TEXT="$(cat $W/ref-text.txt)"
export PRODUZIONE_ROOT="$W/ab-cosy"
T0=$SECONDS
cd "$W"
python "$W/in/gen-audio.py" 19011 --engine cosyvoice --ref "$W/voce.wav" --only "$IDS" \
  && { COSY_STATUS=ok; echo "COSY_WALL_SECONDS=$((SECONDS-T0))" >> /workspace/timings.txt; }
fi

echo "== raccolta output =="
mkdir -p "$W/out"
for id in 19011_m01_s002 19011_m01_s006; do
  [ -f "$W/ab-xtts/19011/audio/$id.wav" ] && cp "$W/ab-xtts/19011/audio/$id.wav" "$W/out/${id}-xtts.wav"
  [ -f "$W/ab-cosy/19011/audio/$id.wav" ] && cp "$W/ab-cosy/19011/audio/$id.wav" "$W/out/${id}-cosy.wav"
done

python - <<PY
import json, subprocess, os
out = {"xtts": {"status": "$XTTS_STATUS"}, "cosy": {"status": "$COSY_STATUS"}}
for line in open("/workspace/timings.txt") if os.path.exists("/workspace/timings.txt") else []:
    k, v = line.strip().split("=")
    out["xtts" if "XTTS" in k else "cosy"]["wall_seconds"] = int(v)
for eng in ("xtts", "cosy"):
    total = 0.0
    for id_ in ("19011_m01_s002", "19011_m01_s006"):
        f = f"/workspace/pilot/out/{id_}-{eng}.wav"
        if os.path.exists(f):
            d = float(subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",f],capture_output=True,text=True).stdout.strip() or 0)
            total += d
    out[eng]["audio_seconds"] = round(total, 1)
    if out[eng].get("wall_seconds") and total:
        out[eng]["x_realtime"] = round(total / out[eng]["wall_seconds"], 2)
json.dump(out, open(f"/workspace/pilot/out/timings-{os.environ.get('ENGINE','all')}.json","w"), indent=2)
print(json.dumps(out, indent=2))
PY

echo "xtts=$XTTS_STATUS cosy=$COSY_STATUS" > "$W/out/DONE-$ENGINE"
rclone copy "$W/out/" "$R2REMOTE/out/"
echo "=== FINITO $(date -u) — output su R2 pilot/out/ ==="
