#!/usr/bin/env bash
# PILOTA AVATAR corsi CLAUDE (fadai01 ambra / fadai02 navy) — percorso IDENTICO alla produzione
# (stesso render-avatar.py, stessa ricetta congelata), ma con la fase PARALLELA a 2 processi
# su UNA GPU per misurare il throughput realtime reale (richiesta utente 2026-07-25).
# 4 clip campione: aperture di entrambi i corsi (pause agenda → gate-silenzi) + le più lunghe.
# Ordine: prep (una clip da sola: crea pingpong + prep avatar) → 2 processi paralleli sul resto.
# Corruzione nota (pilota 19/07): 2 processi sullo STESSO avatar condividono results/.../tmp/ →
# UNA COPIA BASE PER PROCESSO (cp -al = hardlink della prep: 0 disco, niente collisioni).
#
# Uso (sul pod, dopo pod-setup-avatar.sh; r2.env in /workspace):  bash pod-pilota-claude.sh
set -uo pipefail
cd /workspace
source /workspace/r2.env
export RCLONE_CONFIG_R2_TYPE=s3 RCLONE_CONFIG_R2_PROVIDER=Cloudflare \
       RCLONE_CONFIG_R2_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
       RCLONE_CONFIG_R2_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
       RCLONE_CONFIG_R2_ENDPOINT="$R2_ENDPOINT" RCLONE_S3_NO_CHECK_BUCKET=true
R2="r2:${R2_BUCKET}"
export PRODUZIONE_ROOT=/workspace/produzione MUSETALK_DIR=/workspace/MuseTalk \
       R2_AUDIO_REMOTE="$R2/audio-master" R2_REMOTE="$R2" \
       MUSETALK_BBOX_SHIFT=-7 MUSETALK_EXTRA_MARGIN=8 MUSETALK_PARSING_MODE=jaw \
       MUSETALK_FIXED_BBOX=0 MUSETALK_DRIVE_DB=-12 \
       FFMPEG=/usr/bin/ffmpeg FFPROBE=/usr/bin/ffprobe PATH=/workspace/bin:$PATH
BASE=/workspace/asset/base-produzione.mp4
[ -s "$BASE" ] || { echo "base-produzione.mp4 mancante: eseguire prima pod-setup-avatar.sh"; exit 1; }
AV="$MUSETALK_DIR/results/v15/avatars"; BSTEM="$(basename "$BASE" .mp4)"
TL=/workspace/pilota-claude-tempi.log; : > "$TL"
t(){ echo "$(date +%s);$1;$2" >> "$TL"; }

for c in fadai01 fadai02; do
  mkdir -p "/workspace/produzione/$c"
  [ -s "/workspace/produzione/$c/audio-map.json" ] || \
    rclone copyto "$R2/audio-master/$c/audio-map.json" "/workspace/produzione/$c/audio-map.json"
done

# --- PREP (una volta, da sola): apertura ambra. Crea pingpong + prep avatar per la base master ---
t PREP_START "fadai01_m01_s001"
python /workspace/toolkit/render-avatar.py fadai01 --only fadai01_m01_s001 --base "$BASE" --batch 20
t PREP_END "fadai01_m01_s001"

# --- copia base per il 2° processo: hardlink della prep avatar (0 disco) ---
cp -n "$BASE" "/workspace/asset/$BSTEM-w1.mp4"
cp -n "/workspace/asset/$BSTEM-pingpong.mp4" "/workspace/asset/$BSTEM-w1-pingpong.mp4"
[ -d "$AV/evalis_$BSTEM-w1-pingpong" ] || cp -al "$AV/evalis_$BSTEM-pingpong" "$AV/evalis_$BSTEM-w1-pingpong"

# --- 2 PROCESSI PARALLELI su una GPU (le 3 clip restanti) ---
t PAR_START ""
( python /workspace/toolkit/render-avatar.py fadai01 --only fadai01_m06_s022 --base "$BASE" --batch 20 \
  && python /workspace/toolkit/render-avatar.py fadai02 --only fadai02_m01_s001 --base "$BASE" --batch 20 \
) > /workspace/proc-a.log 2>&1 &
A=$!
( python /workspace/toolkit/render-avatar.py fadai02 --only fadai02_m06_s011 --base "/workspace/asset/$BSTEM-w1.mp4" --batch 20 \
) > /workspace/proc-b.log 2>&1 &
B=$!
wait $A; ra=$?
wait $B; rb=$?
t PAR_END "rc_a=$ra rc_b=$rb"

# --- riepilogo: legge le durate reali dall'audio-map e calcola il throughput ---
python - <<'PY' | tee -a "$TL"
import json
d1=json.load(open("/workspace/produzione/fadai01/audio-map.json"))
d2=json.load(open("/workspace/produzione/fadai02/audio-map.json"))
def dur(m,k): v=m[k]; return v.get("duration") if isinstance(v,dict) else v
ev={}
for line in open("/workspace/pilota-claude-tempi.log"):
    p=line.strip().split(";",2)
    if len(p)>=2 and p[0].isdigit(): ev.setdefault(p[1],int(p[0]))
prep=ev.get("PREP_END",0)-ev.get("PREP_START",0)
par=ev.get("PAR_END",0)-ev.get("PAR_START",0)
prep_audio=dur(d1,"fadai01_m01_s001")
par_audio=dur(d1,"fadai01_m06_s022")+dur(d2,"fadai02_m01_s001")+dur(d2,"fadai02_m06_s011")
print("==================== PILOTA CLAUDE — TEMPI ====================")
print(f"PREP  (1 clip, seriale): wall={prep}s  audio={prep_audio:.0f}s  ({prep_audio/max(prep,1):.2f}x realtime)")
print(f"PARALLELO (2 proc/1 GPU): wall={par}s  audio={par_audio:.0f}s  ({par_audio/max(par,1):.2f}x realtime aggregato)")
tot_wall=prep+par; tot_audio=prep_audio+par_audio
print(f"TOTALE 4 clip:           wall={tot_wall}s  audio={tot_audio:.0f}s  ({tot_audio/max(tot_wall,1):.2f}x realtime)")
print("Proiezione catalogo: 220+326=546 clip · audio ~1021+1528=2549 min ·", end=" ")
print(f"a {par_audio/max(par,1):.2f}x → ~{2549/ (par_audio/max(par,1))/60:.1f} h-GPU (1 pod, 2 proc)")
print("===============================================================")
PY
rclone copyto "$TL" "$R2/avatar-clips/_pilota-claude-tempi.log" || true
echo "PILOTA CLAUDE COMPLETO — 4 clip + .ok su $R2/avatar-clips/{fadai01,fadai02}/"
