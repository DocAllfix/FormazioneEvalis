#!/usr/bin/env bash
# BENCHMARK PARALLELO (2 e 3 processi su UNA GPU) + PROVA QUALITÀ.
# Problema scoperto sul pilota: processi paralleli con lo stesso avatar condividono
# results/.../avatars/<id>/tmp/ (frame) e temp.mp4 -> corruzione. Soluzione: UNA COPIA
# AVATAR PER PROCESSO (cp -al = hardlink della prep: latents/imgs/mask riusati, 0 disco).
# Qualità: 3 clip del pilota vengono RI-renderizzate in parallelo e confrontate con
# PSNR contro le versioni single-proc (MuseTalk è deterministico -> attese ~identiche).
# Niente upload R2 (PRODUZIONE_ROOT scratch): le clip pilota su R2 restano intatte.
#
# Uso (sul pod, DOPO pod-pilota.sh): bash pod-bench-parallel.sh
set -uo pipefail
cd /workspace
source /workspace/r2.env
export RCLONE_CONFIG_R2_TYPE=s3 RCLONE_CONFIG_R2_PROVIDER=Cloudflare \
       RCLONE_CONFIG_R2_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
       RCLONE_CONFIG_R2_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
       RCLONE_CONFIG_R2_ENDPOINT="$R2_ENDPOINT" RCLONE_S3_NO_CHECK_BUCKET=true
R2="r2:${R2_BUCKET}"
export MUSETALK_DIR=/workspace/MuseTalk R2_AUDIO_REMOTE="$R2/audio-master" \
       MUSETALK_BBOX_SHIFT=-7 MUSETALK_EXTRA_MARGIN=8 MUSETALK_PARSING_MODE=jaw \
       MUSETALK_FIXED_BBOX=0 MUSETALK_DRIVE_DB=-12 \
       FFMPEG=/usr/bin/ffmpeg FFPROBE=/usr/bin/ffprobe PATH=/workspace/bin:$PATH
unset R2_REMOTE || true            # bench: NIENTE upload
export PRODUZIONE_ROOT=/workspace/bench
BASE=/workspace/asset/base-produzione.mp4
AV=/workspace/MuseTalk/results/v15/avatars
TL=/workspace/bench-tempi.log
t(){ echo "$(date +%s);$1;$2" >> "$TL"; }

# copie avatar per-processo (hardlink prep) + base/pingpong per-processo
mk_proc_base(){ # $1 = suffisso (p2, p3a, ...)
  local s="$1"
  cp -n /workspace/asset/base-produzione.mp4 "/workspace/asset/base-prod-$s.mp4"
  cp -n /workspace/asset/base-produzione-pingpong.mp4 "/workspace/asset/base-prod-$s-pingpong.mp4"
  [ -d "$AV/evalis_base-prod-$s-pingpong" ] || cp -al "$AV/evalis_base-produzione-pingpong" "$AV/evalis_base-prod-$s-pingpong"
}

prep_corso(){ # $1 = corso: audio-map nello scratch root
  mkdir -p "/workspace/bench/$1"
  [ -s "/workspace/bench/$1/audio-map.json" ] || \
    rclone copyto "$R2/audio-master/$1/audio-map.json" "/workspace/bench/$1/audio-map.json"
}

run_proc(){ # $1=corso  $2=ids(,)  $3=base
  python /workspace/toolkit/render-avatar.py "$1" --only "$2" --base "$3" --batch 20 \
    >> "/workspace/bench-$4.log" 2>&1
}

echo "== BENCH 2 PROCESSI (2 clip a testa: 1 ripetuta dal pilota + 1 nuova) =="
for c in 9001 27001 19011 14001; do prep_corso "$c"; done
mk_proc_base p2
t B2_START ""
( run_proc 9001  "9001_m09_s028"  "$BASE" a; run_proc 27001 "27001_m05_s010" "$BASE" a ) &
A=$!
( run_proc 19011 "19011_m01_s001" /workspace/asset/base-prod-p2.mp4 b; run_proc 14001 "14001_m07_s015" /workspace/asset/base-prod-p2.mp4 b ) &
B=$!
wait $A; wait $B
t B2_END ""

echo "== BENCH 3 PROCESSI (1 clip a testa, la terza è ripetuta dal pilota) =="
for c in 45001 22000 42001; do prep_corso "$c"; done
mk_proc_base p3
t B3_START ""
( run_proc 45001 "45001_m03_s008" "$BASE" c ) &
A=$!
( run_proc 22000 "22000_m09_s012" /workspace/asset/base-prod-p2.mp4 d ) &
B=$!
( run_proc 42001 "42001_m06_s014" /workspace/asset/base-prod-p3.mp4 e ) &
C=$!
wait $A; wait $B; wait $C
t B3_END ""

echo "== QUALITÀ: PSNR parallelo-vs-singolo sulle clip ripetute =="
for pair in "9001:9001_m09_s028" "19011:19011_m01_s001" "42001:42001_m06_s014"; do
  corso="${pair%%:*}"; sid="${pair##*:}"
  P="/workspace/produzione/$corso/clips/$sid.mp4"       # single-proc (pilota)
  Q="/workspace/bench/$corso/clips/$sid.mp4"            # parallelo (bench)
  if [ -s "$P" ] && [ -s "$Q" ]; then
    psnr=$(/usr/bin/ffmpeg -i "$P" -i "$Q" -lavfi psnr -f null - 2>&1 | grep -oE "average:[0-9.inf]+" | tail -1)
    echo "PSNR $sid: $psnr"
  else
    echo "PSNR $sid: FILE MANCANTE (P=$([ -s "$P" ] && echo ok || echo no) Q=$([ -s "$Q" ] && echo ok || echo no))"
  fi
done
echo "== esiti bench =="
grep -hE "✓|✗" /workspace/bench-*.log
echo "== tempi bench =="
cat "$TL"
echo "BENCH COMPLETO"
