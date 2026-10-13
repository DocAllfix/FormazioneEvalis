#!/usr/bin/env python3
"""Guardia della flotta avatar: sorveglia gli 8 pod tutta la notte e SOSTITUISCE da sola
quelli che muoiono, senza intervento umano. Ogni giro (5 min):
  1. conta le clip validate su R2 per i due corsi (verità unica dell'avanzamento);
  2. controlla lo stato di ogni istanza: se non è più "running" la distrugge e ne crea
     un'altra sullo STESSO shard (le clip sono idempotenti: nessun lavoro perso, nessun doppione);
  3. segnala gli stalli (nessuna clip nuova in tutta la flotta per 45 min).
Uso: python _guardia-flotta.py <mappa-shard.json>   (formato {"<shard>": <instance_id>})
"""
import os, sys, json, time, subprocess
from pathlib import Path

REPO = Path(r"c:/Users/user/FormazioneEvalis(working name)")
SP = Path(sys.argv[1]).parent
CORSI = os.environ.get("GUARDIA_CORSI","fadesg02,fadeen02").split(",")
ATTESE = int(os.environ.get("GUARDIA_ATTESE","540"))
TOTALE_SHARD = int(os.environ.get("GUARDIA_SHARD","8"))
GIRO = 300
# MuseTalk elabora l'INTERO lotto del worker in una sola invocazione e il caricamento su R2
# avviene solo alla fine: il conteggio resta piatto per ~2,5 h e poi salta di colpo.
# Sotto le 3 ore un conteggio fermo NON e' un guasto.
STALLO_MIN = 190
BLACKLIST = {33069, 34031}

env = dict(os.environ)
for r in (REPO / ".env").read_text(encoding="utf-8").splitlines():
    if r.startswith("R2_") and "=" in r:
        k, v = r.split("=", 1); env[k] = v.strip().strip('"')
env.update({"RCLONE_CONFIG_R2_TYPE": "s3", "RCLONE_CONFIG_R2_PROVIDER": "Cloudflare",
            "RCLONE_CONFIG_R2_ACCESS_KEY_ID": env["R2_ACCESS_KEY_ID"],
            "RCLONE_CONFIG_R2_SECRET_ACCESS_KEY": env["R2_SECRET_ACCESS_KEY"],
            "RCLONE_CONFIG_R2_ENDPOINT": env["R2_ENDPOINT"], "RCLONE_S3_NO_CHECK_BUCKET": "true"})
RCL = str(next(Path(os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\WinGet\Packages")).rglob("rclone.exe")))
BUCKET = env["R2_BUCKET"]


def log(m):
    print(f"[{time.strftime('%H:%M')}] {m}", flush=True)


def clip_fatte(corso):
    o = subprocess.run([RCL, "lsf", f"r2:{BUCKET}/avatar-clips/{corso}", "--include", "*.mp4"],
                       env=env, capture_output=True, text=True, timeout=240)
    return len([x for x in o.stdout.split() if x.endswith(".mp4")])


def istanze():
    o = subprocess.run(["vastai", "show", "instances", "--raw"], capture_output=True, text=True, timeout=180)
    try:
        return {str(i["id"]): i for i in json.loads(o.stdout)}
    except Exception:
        return None            # errore API: NON si conclude che i pod siano morti


def offerta_libera(usate):
    o = subprocess.run(["vastai", "search", "offers",
        "gpu_name=RTX_4090 num_gpus=1 verified=true reliability>=0.995 cpu_cores_effective>=14 "
        f"pcie_bw>=12 inet_down>=800 disk_space>=80 rentable=true dph<={os.environ.get('GUARDIA_MAX_PREZZO', '0.60')}", "-o", "dph", "--raw"],
        capture_output=True, text=True, timeout=240)
    try:
        d = json.loads(o.stdout)
    except Exception:
        return None
    for x in sorted(d, key=lambda y: (-y.get("cpu_ghz", 0), y["dph_total"])):
        if x["machine_id"] not in BLACKLIST and x["machine_id"] not in usate:
            return x
    return None


def crea(shard, usate):
    off = offerta_libera(usate)
    if not off:
        log(f"shard {shard}: nessuna offerta disponibile per il rimpiazzo"); return None
    onstart = SP / f"onstart-s{shard}.sh"
    if not onstart.exists():
        log(f"shard {shard}: manca {onstart}"); return None
    o = subprocess.run(["vastai", "create", "instance", str(off["id"]),
                        "--image", "pytorch/pytorch:2.1.2-cuda12.1-cudnn8-runtime",
                        "--disk", "90", "--onstart", str(onstart), "--raw"],
                       capture_output=True, text=True, timeout=300)
    try:
        nid = json.loads(o.stdout).get("new_contract")
    except Exception:
        nid = None
    log(f"shard {shard}: rimpiazzo creato {nid} su offerta {off['id']} "
        f"({off.get('cpu_ghz',0):.1f}GHz ${off['dph_total']:.4f})")
    return str(nid) if nid else None


mappa = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
ultimo_progresso = time.time()
prec = -1
# un pod che resta in caricamento troppo a lungo (immagine che non scende, errore docker) non parte più:
# lo si sostituisce invece di aspettarlo per sempre
CARICAMENTO_MAX_MIN = int(os.environ.get("GUARDIA_CARICAMENTO_MAX", "20"))
in_caricamento = {}
log(f"guardia avviata su {len(mappa)} pod, shard di {TOTALE_SHARD}")

while True:
    try:
        fatte = {c: clip_fatte(c) for c in CORSI}
        tot = sum(fatte.values())
        if tot > prec:
            ultimo_progresso = time.time(); prec = tot
        pct = tot / ATTESE * 100
        inst = istanze()
        vivi = 0
        if inst is None:
            log("API vast non risponde: nessuna decisione presa in questo giro")
        else:
            usate = {i.get("machine_id") for i in inst.values()}
            for shard, iid in list(mappa.items()):
                i = inst.get(str(iid))
                st = i.get("actual_status") if i else "SPARITA"
                if st == "running":
                    vivi += 1; continue
                if st in ("loading", "created", None) and i is not None:
                    da = in_caricamento.setdefault(str(iid), time.time())
                    if time.time() - da < CARICAMENTO_MAX_MIN * 60:
                        continue                  # sta ancora avviandosi: si aspetta
                    st = f"{st} da oltre {CARICAMENTO_MAX_MIN} min"
                log(f"shard {shard}: istanza {iid} in stato '{st}' -> sostituzione")
                if i is not None:
                    subprocess.run(["vastai", "destroy", "instance", str(iid)],
                                   input="y\n", capture_output=True, text=True, timeout=180)
                nuova = crea(shard, usate)
                if nuova:
                    mappa[shard] = nuova
                    Path(sys.argv[1]).write_text(json.dumps(mappa, indent=1), encoding="utf-8")
        fermo = (time.time() - ultimo_progresso) / 60
        log(" · ".join(f"{c} {fatte[c]}" for c in CORSI) + f" · {pct:.1f}% · "
            f"pod vivi {vivi}/{len(mappa)}" + (f" · ATTENZIONE fermo da {fermo:.0f} min" if fermo > STALLO_MIN else ""))
        if tot >= ATTESE:
            log(f"RENDER COMPLETO: {tot}/{ATTESE} clip su R2")
            # si spengono i pod SUBITO: ogni minuto in piu' e' denaro bruciato a vuoto
            for shard, iid in mappa.items():
                r = subprocess.run(["vastai", "destroy", "instance", str(iid)],
                                   input="y" + chr(10), capture_output=True, text=True, timeout=180)
                log(f"shard {shard}: istanza {iid} distrutta (rc={r.returncode})")
            rimaste = istanze()
            log(f"istanze ancora attive dopo la pulizia: "
                f"{list(rimaste) if rimaste else 'verifica non riuscita — CONTROLLARE A MANO'}")
            break
    except Exception as e:
        log(f"giro fallito ({str(e)[:120]}) — si riprova")
    time.sleep(GIRO)
