#!/usr/bin/env bash
# Bootstrap pod GPU per il RENDER AVATAR (MuseTalk 1.5) — VERSIONE BLINDATA (lezioni smoke 2026-07-14).
# Idempotente: se su R2 esiste lo snapshot full-env lo ripristina (~5 min), altrimenti
# installa da zero con TUTTI i pin noti e CREA lo snapshot per i pod successivi.
#
# Env attese (passarle esplicite: i pod NON le ereditano via ssh):
#   R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT, R2_BUCKET
# Uso: bash pod-setup-avatar.sh          (poi: bash pod-render.sh <corso> <gpu-index> <processi>)
set -uo pipefail
cd /workspace

# l'ffmpeg di conda (nell'immagine pytorch) NON ha libx264: metto SOLO ffmpeg/ffprobe di /usr/bin
# davanti nel PATH (python resta quello di conda coi nostri pacchetti). apt lo installa a [0].
setup_ffmpeg_path(){ mkdir -p /workspace/bin; ln -sf /usr/bin/ffmpeg /workspace/bin/ffmpeg; [ -x /usr/bin/ffprobe ] && ln -sf /usr/bin/ffprobe /workspace/bin/ffprobe; export PATH=/workspace/bin:$PATH; }

dl(){ for i in 1 2 3 4 5 6 7 8; do "$@" && return 0; echo "retry $i: $*" >&2; sleep 15; done; return 1; }

echo "== [0] prerequisiti (unzip PRIMA di rclone: il suo installer muore senza, in silenzio)"
apt-get update -qq >/dev/null 2>&1 || true
apt-get install -y -qq unzip zstd git ffmpeg >/dev/null 2>&1
command -v rclone >/dev/null || (curl -fsS https://rclone.org/install.sh | bash) >/dev/null
setup_ffmpeg_path   # /usr/bin/ffmpeg (con libx264) davanti a quello di conda

export RCLONE_CONFIG_R2_TYPE=s3 RCLONE_CONFIG_R2_PROVIDER=Cloudflare \
       RCLONE_CONFIG_R2_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
       RCLONE_CONFIG_R2_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
       RCLONE_CONFIG_R2_ENDPOINT="$R2_ENDPOINT" \
       RCLONE_S3_NO_CHECK_BUCKET=true
R2="r2:${R2_BUCKET:-evalis-produzione}"

SNAP="$R2/snapshot/musetalk-fullenv.tar.zst"
# ATTENZIONE: su S3 `rclone lsf` di un file inesistente esce 0 con output vuoto -> testare l'OUTPUT
PYSITE="$(python -c 'import site;print(site.getsitepackages()[0])')"
if [ -n "$(rclone lsf "$SNAP" 2>/dev/null)" ]; then
  echo "== [1] ripristino full-env da R2 (~5-10 min): MuseTalk (codice+modelli) + site-packages"
  # snapshot contiene percorsi ASSOLUTI (workspace/MuseTalk + il site-packages) -> estrai da /
  rclone cat "$SNAP" | tar -I zstd -xf - -C /
else
  echo "== [1] installazione MuseTalk 1.5 pulita (pin OBBLIGATORI, scoperti a caro prezzo)"
  git clone --depth 1 https://github.com/TMElyralab/MuseTalk.git
  cd MuseTalk
  # stack che FUNZIONA: torch 2.1.2+cu121 (mmcv 2.1.0 ha le wheel precompilate SOLO fino a torch 2.1)
  pip install -q torch==2.1.2 torchvision==0.16.2 torchaudio==2.1.2 --index-url https://download.pytorch.org/whl/cu121
  pip install -q -r requirements.txt
  pip install -q -U openmim && mim install -q mmengine "mmcv==2.1.0" "mmdet==3.2.0" "mmpose>=1.1.0"
  # numpy 2 rompe cv2; hub>=1 rompe transformers
  pip install -q "numpy==1.26.4" "huggingface-hub==0.25.2" gdown
  export HF_HUB_ENABLE_HF_TRANSFER=0
  echo "== [1b] pesi (retry; whisper VUOLE config+preprocessor, non solo il bin)"
  dl huggingface-cli download TMElyralab/MuseTalk --include "musetalkV15/*" --local-dir models/ --quiet
  dl huggingface-cli download stabilityai/sd-vae-ft-mse config.json diffusion_pytorch_model.bin --local-dir models/sd-vae --quiet
  dl huggingface-cli download openai/whisper-tiny config.json pytorch_model.bin preprocessor_config.json --local-dir models/whisper --quiet
  dl huggingface-cli download yzd-v/DWPose dw-ll_ucoco_384.pth --local-dir models/dwpose --quiet
  mkdir -p models/face-parse-bisent
  # face-parse 79999: su Google Drive; gdown SENZA --id (sintassi deprecata = fallisce in silenzio)
  dl gdown 154JgKpzCPW82qINcVieuPH3fZ2e0P812 -O models/face-parse-bisent/79999_iter.pth
  dl curl -fsSL -o models/face-parse-bisent/resnet18-5c106cde.pth https://download.pytorch.org/models/resnet18-5c106cde.pth
  for f in models/musetalkV15/unet.pth models/musetalkV15/musetalk.json models/sd-vae/diffusion_pytorch_model.bin \
           models/whisper/pytorch_model.bin models/whisper/config.json models/dwpose/dw-ll_ucoco_384.pth \
           models/face-parse-bisent/79999_iter.pth models/face-parse-bisent/resnet18-5c106cde.pth; do
    [ -s "$f" ] || { echo "PESO MANCANTE: $f" >&2; exit 1; }
  done
  cd /workspace
  echo "== [1c] snapshot full-env su R2: MuseTalk (codice+modelli) + site-packages (i pacchetti Python!)"
  # percorsi ASSOLUTI: MuseTalk in /workspace + il site-packages di conda -> estrazione da /
  tar -I "zstd -3" -cf - /workspace/MuseTalk "$PYSITE" 2>/dev/null | rclone rcat "$SNAP"
fi

echo "== [2] toolkit da R2 (PRIMA della patch, che lo usa) + asset base"
mkdir -p /workspace/asset /workspace/toolkit
rclone copy "$R2/avatar-assets/toolkit/" /workspace/toolkit/
rclone copy "$R2/avatar-assets/" /workspace/asset/ --include "*.mp4"
# s3fd (rilevatore volti) da R2 nella cache torch: il download esterno da adrianbulat.com si
# impianta e blocca la prep della base (visto 14-15/07). Da R2 e' affidabile e veloce.
mkdir -p /root/.cache/torch/hub/checkpoints
[ -s /root/.cache/torch/hub/checkpoints/s3fd-619a316812.pth ] || \
  dl rclone copyto "$R2/avatar-assets/weights/s3fd-619a316812.pth" /root/.cache/torch/hub/checkpoints/s3fd-619a316812.pth

echo "== [3] patch bbox — DISATTIVATA di default: la bbox fissa e' stata BOCCIATA (bocca fissa)."
# ricetta congelata = P0 (nessuna bbox fissa). Default 0; un caller puo' forzare 1 esplicitamente.
export MUSETALK_FIXED_BBOX="${MUSETALK_FIXED_BBOX:-0}"
python /workspace/toolkit/patch-musetalk.py || { echo "PATCH FALLITA"; exit 1; }

echo "== [4] sanity import + crop di produzione"
python -c "import torch,mmcv,cv2,numpy,transformers; assert torch.cuda.is_available(), 'CUDA giu'; print('stack ok:', torch.__version__)" || { echo "SANITY IMPORT FALLITA: ambiente rotto (mmcv/cv2/torch) — STOP prima del render"; exit 1; }
# crop di produzione: base ALT, trim dei fade (face-detect crasha sui frame senza volto),
# quadrato 1080 -> 540 (identico a schermo nella bolla 332px, ~2x piu' veloce end-to-end)
D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 /workspace/asset/base-alt.mp4)
T=$(echo "$D" | awk '{printf "%.2f", $1-0.8}')
ffmpeg -v error -y -ss 0.4 -t "$T" -i /workspace/asset/base-alt.mp4 -vf "crop=1080:1080:420:0,scale=540:540,fps=25" -an -c:v libx264 -crf 18 -preset fast /workspace/asset/base-produzione.mp4

echo "OK — pod pronto. Avvio render: bash /workspace/toolkit/pod-render.sh <corso> <gpu-idx> <processi>"
