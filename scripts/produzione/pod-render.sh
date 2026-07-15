#!/usr/bin/env bash
# Render di un corso su UNA GPU con N PROCESSI paralleli (satura la 4090: da sola MuseTalk
# usa 4-7GB su 24 ed e' spesso <50% util -> 2-3 processi ~raddoppiano la resa). Ogni processo
# prende una fetta delle slide pendenti, renderizza col worker (bbox fissa+naturalizza+gate),
# carica su R2. Idempotente: le clip gia' .ok su R2 si saltano.
#
# Uso: bash pod-render.sh <corso> <processi> [base]
# Flotta: esporta SHARD_INDEX=<i> SHARD_TOTAL=<N> per far prendere a questo pod solo
# la sua fetta (md5(id)%N==i). Il pod "finisher" gira con SHARD_TOTAL=1 (vede tutto il
# pendente) per chiudere i buchi dei pod revocati.
set -uo pipefail
CORSO="${1:?corso}"; NPROC="${2:-2}"; BASE="${3:-/workspace/asset/base-produzione.mp4}"
cd /workspace
source /workspace/r2.env
export RCLONE_CONFIG_R2_TYPE=s3 RCLONE_CONFIG_R2_PROVIDER=Cloudflare \
       RCLONE_CONFIG_R2_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
       RCLONE_CONFIG_R2_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
       RCLONE_CONFIG_R2_ENDPOINT="$R2_ENDPOINT" RCLONE_S3_NO_CHECK_BUCKET=true
R2="r2:${R2_BUCKET}"
export PRODUZIONE_ROOT=/workspace/produzione MUSETALK_DIR=/workspace/MuseTalk \
       R2_AUDIO_REMOTE="$R2/audio-master" R2_REMOTE="$R2" \
       MUSETALK_BBOX_SHIFT=-7 MUSETALK_EXTRA_MARGIN=8 MUSETALK_PARSING_MODE=jaw MUSETALK_FIXED_BBOX=0

mkdir -p /workspace/produzione/"$CORSO"
rclone copyto "$R2/audio-master/$CORSO/audio-map.json" /workspace/produzione/"$CORSO"/audio-map.json 2>/dev/null \
  || rclone copyto "$R2/../$CORSO/audio-map.json" /workspace/produzione/"$CORSO"/audio-map.json 2>/dev/null || true
# lista slide PENDENTI = attese, meno le .ok su R2, meno quelle di ALTRI shard.
# SHARD deterministico: con SHARD_TOTAL>1 questo pod prende SOLO gli id per cui
# md5(id) % SHARD_TOTAL == SHARD_INDEX. Fette disgiunte, nessun coordinamento, nessun
# doppione tra pod. I buchi di un pod morto li recupera un pod "finisher" (SHARD_TOTAL=1,
# che vede TUTTO il pendente) grazie ai marcatori .ok idempotenti.
python - "$CORSO" <<'PY' > /workspace/pending.txt
import json,sys,subprocess,os,hashlib
c=sys.argv[1]; b=os.environ["R2_BUCKET"]
si=int(os.environ.get("SHARD_INDEX","0")); st=int(os.environ.get("SHARD_TOTAL","1"))
solo=os.environ.get("SOLO_MODULO","")  # es. m01 -> pilota su un solo modulo
am=json.load(open(f"/workspace/produzione/{c}/audio-map.json"))
ids=[k for k in am if not k.startswith("_")]
if solo: ids=[i for i in ids if f"_{solo}_" in i]
env=dict(os.environ)
out=subprocess.run(["rclone","lsf",f"r2:{b}/avatar-clips/{c}/","--include","*.mp4.ok"],
                   capture_output=True,text=True,env=env).stdout.split()
done={x[:-7] for x in out if x.endswith(".mp4.ok")}
def inshard(x): return st<=1 or (int(hashlib.md5(x.encode()).hexdigest(),16) % st) == si
for i in ids:
    if i not in done and inshard(i): print(i)
PY
N=$(wc -l < /workspace/pending.txt)
echo "== $CORSO: $N slide pendenti, $NPROC processi su questa GPU"
[ "$N" -eq 0 ] && { echo "niente da fare"; exit 0; }

# PREP BASE UNA VOLTA prima di sdoppiare: se N processi partono insieme, tutti vedono la base
# "non preparata" e la preparano sulla STESSA cartella results/.../avatars/<id> -> corruzione.
# Renderizzo la prima clip da solo (fa la prep + 1 clip), poi le altre in parallelo (prep gia' fatta).
if [ "$NPROC" -gt 1 ]; then
  FIRST=$(head -1 /workspace/pending.txt)
  echo "== prep base una volta (render della prima clip $FIRST) ..."
  python /workspace/toolkit/render-avatar.py "$CORSO" --only "$FIRST" --base "$BASE" --batch 20 --purge-local \
    > /workspace/render-prep.log 2>&1 || { echo "PREP BASE FALLITA"; tail -20 /workspace/render-prep.log; exit 1; }
  tail -n +2 /workspace/pending.txt > /workspace/pending.next && mv /workspace/pending.next /workspace/pending.txt
  N=$(wc -l < /workspace/pending.txt)
  [ "$N" -eq 0 ] && { echo "solo 1 clip, gia' fatta in prep"; exit 0; }
fi

# split in NPROC fette e lancia
split -n l/"$NPROC" -d /workspace/pending.txt /workspace/shard-
pids=()
for f in /workspace/shard-*; do
  ids=$(paste -sd, "$f")
  [ -z "$ids" ] && continue
  ( python /workspace/toolkit/render-avatar.py "$CORSO" --only "$ids" --base "$BASE" --batch 20 --purge-local \
      > "/workspace/render-$(basename $f).log" 2>&1 ) &
  pids+=($!)
done
rc=0; for p in "${pids[@]}"; do wait "$p" || rc=1; done
echo "== $CORSO render finito (rc=$rc). Clip su $R2/avatar-clips/$CORSO/"
exit $rc
