#!/usr/bin/env python3
"""Lancia la flotta avatar su Vast (o il pod pilota) per UN corso, con le lezioni di gpu-ledger.md
e FLOTTA-CRITERI.md: offerte RTX 4090 filtrate, una macchina per pod, onstart per shard,
create → verifica → start, mappa shard→istanza per _guardia-flotta.py.

I segreti (chiavi R2) finiscono SOLO negli onstart scritti nella cartella di lavoro indicata
(fuori dal repo): sul pod servono, nel repo no.

Uso:
  python _flotta-avatar.py <corso> --pilota <id-slide> --dir <cartella>      1 pod, una clip
  python _flotta-avatar.py <corso> --pod N --shard N --dir <cartella>        flotta, N pod
  python _flotta-avatar.py <corso> --pod N --shard N --dir <cartella> --prova  solo offerte
"""
import argparse, json, os, subprocess, sys, time
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
REPO = Path(__file__).resolve().parents[2]
IMMAGINE = "pytorch/pytorch:2.1.2-cuda12.1-cudnn8-runtime"
QUERY = ("gpu_name=RTX_4090 num_gpus=1 verified=true reliability2>=0.995 cpu_cores>=32 "
         "cpu_cores_effective>=14 pcie_bw>=12 disk_bw>=800 inet_down>=800 disk_space>=90 rentable=true")

ap = argparse.ArgumentParser()
ap.add_argument("corso"); ap.add_argument("--pilota"); ap.add_argument("--pod", type=int, default=1)
ap.add_argument("--shard", type=int, default=1); ap.add_argument("--dir", required=True)
ap.add_argument("--prova", action="store_true"); ap.add_argument("--max-prezzo", type=float, default=0.60)
a = ap.parse_args()
out = Path(a.dir); out.mkdir(parents=True, exist_ok=True)

env = {}
for r in (REPO / ".env").read_text(encoding="utf-8").splitlines():
    if r.startswith("R2_") and "=" in r:
        k, v = r.split("=", 1); env[k] = v.strip().strip('"')
rc_env = {**os.environ, "RCLONE_CONFIG_R2_TYPE": "s3", "RCLONE_CONFIG_R2_PROVIDER": "Cloudflare",
          "RCLONE_CONFIG_R2_ACCESS_KEY_ID": env["R2_ACCESS_KEY_ID"],
          "RCLONE_CONFIG_R2_SECRET_ACCESS_KEY": env["R2_SECRET_ACCESS_KEY"],
          "RCLONE_CONFIG_R2_ENDPOINT": env["R2_ENDPOINT"], "RCLONE_S3_NO_CHECK_BUCKET": "true"}
bucket = env["R2_BUCKET"]

# prerequisiti su R2: senza audio-map e wav il render non ha niente da fare (o peggio, fa il corso sbagliato)
lsf = lambda p: subprocess.run(["rclone", "lsf", f"r2:{bucket}/{p}"], capture_output=True, text=True, env=rc_env).stdout.split()
if "audio-map.json" not in lsf(f"audio-master/{a.corso}/"):
    sys.exit(f"manca audio-master/{a.corso}/audio-map.json su R2: caricare prima l'audio lockato")

# il setup si scarica con un URL firmato (curl con firma sigv4 sul pod non funziona: gpu-ledger §1)
url_setup = subprocess.run(["rclone", "link", "--expire", "72h", f"r2:{bucket}/avatar-assets/toolkit/pod-setup-avatar.sh"],
                           capture_output=True, text=True, env=rc_env).stdout.strip()
if not url_setup.startswith("https://"):
    sys.exit("URL firmato del setup non generato")

def onstart(shard: int, totale: int) -> Path:
    lavoro = (f"python /workspace/toolkit/render-avatar.py {a.corso} --only {a.pilota} "
              f"--base /workspace/asset/base-produzione.mp4 --batch 20 > /workspace/render.log 2>&1"
              if a.pilota else
              f"bash /workspace/toolkit/pod-render.sh {a.corso} 2 > /workspace/render.log 2>&1\n"
              f"bash /workspace/toolkit/pod-loop-sicurezza.sh > /workspace/loop.log 2>&1")
    pre = "" if not a.pilota else (
        "source /workspace/r2.env\nexport RCLONE_CONFIG_R2_TYPE=s3 RCLONE_CONFIG_R2_PROVIDER=Cloudflare "
        "RCLONE_CONFIG_R2_ACCESS_KEY_ID=\"$R2_ACCESS_KEY_ID\" RCLONE_CONFIG_R2_SECRET_ACCESS_KEY=\"$R2_SECRET_ACCESS_KEY\" "
        "RCLONE_CONFIG_R2_ENDPOINT=\"$R2_ENDPOINT\" RCLONE_S3_NO_CHECK_BUCKET=true PATH=/workspace/bin:$PATH "
        f"PRODUZIONE_ROOT=/workspace/produzione MUSETALK_DIR=/workspace/MuseTalk R2_AUDIO_REMOTE=r2:{bucket}/audio-master "
        f"R2_REMOTE=r2:{bucket} MUSETALK_BBOX_SHIFT=-7 MUSETALK_EXTRA_MARGIN=8 MUSETALK_PARSING_MODE=jaw "
        "MUSETALK_FIXED_BBOX=0 MUSETALK_DRIVE_DB=-12 POST_MODE=v1 FFMPEG=/usr/bin/ffmpeg FFPROBE=/usr/bin/ffprobe\n"
        f"mkdir -p /workspace/produzione/{a.corso} && rclone copyto r2:{bucket}/audio-master/{a.corso}/audio-map.json "
        f"/workspace/produzione/{a.corso}/audio-map.json\n")
    testo = f"""#!/bin/bash
# onstart {a.corso} shard {shard}/{totale} — generato da _flotta-avatar.py (contiene chiavi: MAI nel repo)
mkdir -p /workspace && cd /workspace
cat > /workspace/r2.env <<'EOF'
export R2_ACCESS_KEY_ID={env['R2_ACCESS_KEY_ID']}
export R2_SECRET_ACCESS_KEY={env['R2_SECRET_ACCESS_KEY']}
export R2_ENDPOINT={env['R2_ENDPOINT']}
export R2_BUCKET={bucket}
export SHARD_INDEX={shard}
export SHARD_TOTAL={totale}
export CORSI_RENDER={a.corso}
EOF
source /workspace/r2.env
for i in 1 2 3 4 5; do curl -fsS "{url_setup}" -o /workspace/pod-setup-avatar.sh && break; sleep 10; done
bash /workspace/pod-setup-avatar.sh > /workspace/setup.log 2>&1 && echo "pod pronto" >> /workspace/setup.log
{pre}{lavoro}
echo FLEET_DONE > /workspace/FLEET_DONE
"""
    f = out / f"onstart-s{shard}.sh"
    f.write_text(testo, encoding="utf-8", newline="\n")
    return f

def vast(*args) -> str:
    return subprocess.run(["vastai", *args], capture_output=True, text=True).stdout

blacklist = set()
bl = REPO / "produzione/_staging/vast-blacklist.json"
if bl.exists():
    blacklist = {int(x) for x in json.loads(bl.read_text(encoding="utf-8"))}
offerte = json.loads(vast("search", "offers", QUERY, "-o", "dph_total", "--raw") or "[]")
viste, scelte = set(), []
for o in offerte:
    if o["machine_id"] in viste or o["machine_id"] in blacklist or o["dph_total"] > a.max_prezzo:
        continue
    viste.add(o["machine_id"]); scelte.append(o)
n = 1 if a.pilota else a.pod
print(f"offerte valide: {len(scelte)} (servono {n}) · prezzi {[round(o['dph_total'],3) for o in scelte[:n]]}")
if a.prova or len(scelte) < n:
    sys.exit(0 if a.prova else "offerte insufficienti")

mappa = {}
for i, o in enumerate(scelte[:n]):
    shard = 0 if a.pilota else i
    f = onstart(shard, 1 if a.pilota else a.shard)
    r = vast("create", "instance", str(o["id"]), "--image", IMMAGINE, "--disk", "90", "--onstart", str(f), "--raw")
    try:
        iid = json.loads(r).get("new_contract")
    except Exception:
        iid = None
    print(f"shard {shard}: offerta {o['id']} macchina {o['machine_id']} ${o['dph_total']:.3f}/h → istanza {iid} {r.strip()[:80]}")
    if iid:
        mappa[str(shard)] = iid
time.sleep(20)
# create → verifica → start (gpu-ledger §3 e §8: success:false non è affidabile, istanze nate ferme)
for s, iid in mappa.items():
    info = json.loads(vast("show", "instance", str(iid), "--raw") or "{}")
    if info.get("intended_status") == "stopped":
        vast("start", "instance", str(iid)); print(f"shard {s}: istanza {iid} nata ferma → avviata")
(out / "mappa-shard.json").write_text(json.dumps(mappa, indent=1), encoding="utf-8")
print(f"mappa scritta in {out / 'mappa-shard.json'}")
