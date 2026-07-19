#!/usr/bin/env bash
# RICETTA A/B — clip LUNGHE (slide intera 19011_m07_s004, 235s: la STESSA voce/slide da cui
# fu tagliato lo standard p0-m12) per isolare le leve percepite dall'utente ("bocca piu'
# veloce / meno precisa" nel pilota vs standard). Ricetta di articolazione PROVATA IDENTICA
# dal transcript (combo.sh 14/07): margin 8, bbox -7, jaw, -12dB, no bbox fissa.
# Differenze reali da testare: base corta-vs-piena, NVENC-vs-x264, gate-silenzi si'/no.
#
# 2 INFERENCE IN PARALLELO (percorso di produzione: avatar dir separate):
#   proc A: base CORTA 20s (come lo standard) -> rawShort
#   proc B: base PIENA 180s (come il pilota)  -> rawFull
# POST a matrice (stessa inference => differenze SOLO di post):
#   V1 = rawShort + x264(gia') + voce piena, NO gate  (replica standard, ma lunga)
#   V2 = rawFull  + NVENC + gate    (= pilota)
#   V3 = rawFull  + x264  + gate
#   V4 = rawFull  + NVENC + NO gate
#   V5 = rawFull  + x264  + NO gate
# Uso (sul pod, dopo pod-setup-avatar.sh): bash pod-ricetta-ab.sh
set -uo pipefail
cd /workspace
source /workspace/r2.env
export RCLONE_CONFIG_R2_TYPE=s3 RCLONE_CONFIG_R2_PROVIDER=Cloudflare \
       RCLONE_CONFIG_R2_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
       RCLONE_CONFIG_R2_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
       RCLONE_CONFIG_R2_ENDPOINT="$R2_ENDPOINT" RCLONE_S3_NO_CHECK_BUCKET=true
R2="r2:${R2_BUCKET}"; MT=/workspace/MuseTalk; export MUSETALK_DIR=$MT
export FFMPEG=/usr/bin/ffmpeg FFPROBE=/usr/bin/ffprobe PATH=/workspace/bin:$PATH
UNET="--unet_model_path models/musetalkV15/unet.pth --unet_config models/musetalkV15/musetalk.json"
COMMON="--version v15 --bbox_shift -7 --extra_margin 8 --parsing_mode jaw --fps 25 --batch_size 20 --left_cheek_width 90 --right_cheek_width 90 $UNET"
TL=/workspace/ab-tempi.log
t(){ echo "$(date +%s);$1;$2" >> "$TL"; }

echo "== audio: slide INTERA (235s) + driver -12dB (identico allo standard: 24k mono, volume 0.25)"
mkdir -p /workspace/seg
rclone copyto "$R2/audio-master/19011/audio/m07/19011_m07_s004.wav" /workspace/seg/full.wav
/usr/bin/ffmpeg -v error -y -i /workspace/seg/full.wav -ar 24000 -ac 1 /workspace/seg/voice.wav
/usr/bin/ffmpeg -v error -y -i /workspace/seg/voice.wav -af "volume=0.25" -ar 24000 -ac 1 /workspace/seg/drive12.wav
DUR=$(/usr/bin/ffprobe -v error -show_entries format=duration -of csv=p=0 /workspace/seg/voice.wav)
echo "durata audio: $DUR"

echo "== basi: corta 20s (standard) e piena (pilota) -> pingpong"
/usr/bin/ffmpeg -v error -y -t 20 -i /workspace/asset/base-produzione.mp4 -c:v libx264 -crf 18 -preset fast /workspace/asset/s.mp4
/usr/bin/ffmpeg -v error -y -i /workspace/asset/s.mp4 -filter_complex "[0:v]split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1[v]" -map "[v]" -an -c:v libx264 -crf 18 -preset fast /workspace/asset/spp.mp4
[ -s /workspace/asset/base-produzione-pingpong.mp4 ] || \
/usr/bin/ffmpeg -v error -y -i /workspace/asset/base-produzione.mp4 -filter_complex "[0:v]split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1[v]" -map "[v]" -an -c:v libx264 -crf 18 -preset fast /workspace/asset/base-produzione-pingpong.mp4

infer(){ # $1=avatar_id $2=pingpong $3=drive_wav $4=log
  cat > /workspace/cfg-$1.yaml <<YML
$1:
  preparation: True
  bbox_shift: -7
  video_path: $2
  audio_clips:
    v: $3
YML
  ( cd $MT && python -m scripts.realtime_inference --inference_config /workspace/cfg-$1.yaml $COMMON </dev/null > /workspace/$4 2>&1 )
}

echo "== 2 INFERENCE IN PARALLELO (short + full base, avatar dir separate)"
rm -rf $MT/results/v15/avatars/abshort $MT/results/v15/avatars/abfull
t INFER_START ""
( infer abshort /workspace/asset/spp.mp4 /workspace/seg/drive12.wav infer-short.log ) &
A=$!
( infer abfull /workspace/asset/base-produzione-pingpong.mp4 /workspace/seg/drive12.wav infer-full.log ) &
B=$!
wait $A; wait $B
t INFER_END ""
RAWS=$MT/results/v15/avatars/abshort/vid_output/v.mp4
RAWF=$MT/results/v15/avatars/abfull/vid_output/v.mp4
[ -s "$RAWS" ] || { echo "manca rawShort"; tail -5 /workspace/infer-short.log; exit 1; }
[ -s "$RAWF" ] || { echo "manca rawFull";  tail -5 /workspace/infer-full.log; exit 1; }

echo "== POST a matrice"
W=/workspace/seg/voice.wav
# V1: replica standard (rawShort x264 di MuseTalk, -c:v copy, voce piena, NO gate, clamp)
/usr/bin/ffmpeg -v error -y -i "$RAWS" -i "$W" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 128k \
  -movflags +faststart -t "$DUR" -shortest /workspace/V1-replica-standard.mp4
nat(){ # $1=out $2=force_x264 $3=min_ms
  NAT_FORCE_X264=$2 python - "$RAWF" "$1" "$3" <<'PY'
import sys, os
sys.path.insert(0, "/workspace/toolkit")
from pathlib import Path
from naturalizza import naturalizza
raw, out, minms = sys.argv[1], sys.argv[2], int(sys.argv[3])
naturalizza(Path(raw), Path("/workspace/asset/base-produzione-pingpong.mp4"),
            Path("/workspace/seg/voice.wav"), "ab", Path(out), min_ms=minms)
print("ok", out)
PY
}
nat /workspace/V2-pilota-nvenc-gate.mp4  0 150
nat /workspace/V3-x264-gate.mp4          1 150
nat /workspace/V4-nvenc-nogate.mp4       0 99999999
nat /workspace/V5-x264-nogate.mp4        1 99999999

echo "== durate (attesa $DUR ±0.3)"
for v in V1-replica-standard V2-pilota-nvenc-gate V3-x264-gate V4-nvenc-nogate V5-x264-nogate; do
  d=$(/usr/bin/ffprobe -v error -show_entries format=duration -of csv=p=0 /workspace/$v.mp4)
  echo "$v: $d"
  rclone copyto /workspace/$v.mp4 "$R2/avatar-clips/_ab/$v.mp4"
done
rclone copyto "$TL" "$R2/avatar-clips/_ab/ab-tempi.log" || true
echo "AB COMPLETO"
