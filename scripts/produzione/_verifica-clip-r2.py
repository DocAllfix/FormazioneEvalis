#!/usr/bin/env python3
"""Verifica integrale delle clip avatar su R2, senza scaricare i video.
Ogni clip ha un marcatore <id>.mp4.ok scritto dal worker DOPO la validazione, con
durata e sha256 del file. Qui si controlla, per ogni slide attesa dei copioni:
  A  esiste la clip e il suo marcatore;
  B  nessun file orfano (clip senza slide corrispondente);
  C  la durata della clip combacia con quella dell'audio (audio-map) entro 0,5s;
  D  la dimensione su R2 e' plausibile (nessun file troncato a zero);
  E  a campione, lo sha256 del file su R2 e' quello registrato alla validazione.
Uso: python _verifica-clip-r2.py <corso> [<corso> ...]
"""
import os, sys, json, subprocess, hashlib, random
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
env = dict(os.environ)
for r in (REPO / ".env").read_text(encoding="utf-8").splitlines():
    if r.startswith("R2_") and "=" in r:
        k, v = r.split("=", 1); env[k] = v.strip().strip('"')
env.update({"RCLONE_CONFIG_R2_TYPE": "s3", "RCLONE_CONFIG_R2_PROVIDER": "Cloudflare",
            "RCLONE_CONFIG_R2_ACCESS_KEY_ID": env["R2_ACCESS_KEY_ID"],
            "RCLONE_CONFIG_R2_SECRET_ACCESS_KEY": env["R2_SECRET_ACCESS_KEY"],
            "RCLONE_CONFIG_R2_ENDPOINT": env["R2_ENDPOINT"], "RCLONE_S3_NO_CHECK_BUCKET": "true"})
RCL = str(next(Path(os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\WinGet\Packages")).rglob("rclone.exe")))
B = env["R2_BUCKET"]
TOLL = 0.5
CAMPIONE = 4

esito_globale = 0
for corso in sys.argv[1:]:
    print(f"\n=== {corso} ===")
    amap = json.loads((REPO / "produzione" / corso / "audio-map.json").read_text(encoding="utf-8"))
    attese = {k: v for k, v in amap.items() if not k.startswith("_")}
    o = subprocess.run([RCL, "lsjson", f"r2:{B}/avatar-clips/{corso}"],
                       env=env, capture_output=True, text=True, timeout=600)
    files = {x["Name"]: x for x in json.loads(o.stdout)}
    mp4 = {n[:-4] for n in files if n.endswith(".mp4")}
    ok = {n[:-7] for n in files if n.endswith(".mp4.ok")}

    problemi = []
    for sid in attese:
        if sid not in mp4: problemi.append(f"A {sid}: clip MANCANTE")
        elif sid not in ok: problemi.append(f"A {sid}: manca il marcatore di validazione")
        elif files[f"{sid}.mp4"]["Size"] < 100_000: problemi.append(f"D {sid}: file sospetto ({files[f'{sid}.mp4']['Size']} byte)")
    for sid in mp4 - set(attese): problemi.append(f"B {sid}: clip ORFANA (nessuna slide corrispondente)")

    # C — durata dichiarata nel marcatore contro la durata dell'audio.
    # I marcatori si scaricano in BLOCCO (una sola rclone): uno alla volta sono 540 processi.
    da_leggere = sorted(ok & set(attese))
    cache = Path(os.environ.get("TEMP", "/tmp")) / f"_ok-{corso}"
    cache.mkdir(parents=True, exist_ok=True)
    subprocess.run([RCL, "copy", f"r2:{B}/avatar-clips/{corso}", str(cache),
                    "--include", "*.mp4.ok", "--transfers", "24"],
                   env=env, capture_output=True, timeout=1800)
    marcatori = {}
    for f in cache.glob("*.mp4.ok"):
        try:
            marcatori[f.name[:-7]] = json.loads(f.read_text(encoding="utf-8"))
        except Exception:
            problemi.append(f"C {f.name[:-7]}: marcatore illeggibile")
    for sid in da_leggere:
        d = marcatori.get(sid)
        if d is None:
            problemi.append(f"C {sid}: marcatore non scaricato"); continue
        scarto = abs(d["duration"] - attese[sid]["duration"])
        if scarto > TOLL:
            problemi.append(f"C {sid}: durata {d['duration']}s vs audio {attese[sid]['duration']}s (scarto {scarto:.2f}s)")

    # E — sha256 reale su R2 contro quello registrato, a campione
    random.seed(11)
    for sid in random.sample(da_leggere, min(CAMPIONE, len(da_leggere))):
        atteso = marcatori[sid]["sha256"]
        v = subprocess.run([RCL, "cat", f"r2:{B}/avatar-clips/{corso}/{sid}.mp4"], env=env, capture_output=True, timeout=600)
        reale = hashlib.sha256(v.stdout).hexdigest()
        print(f"  campione {sid}: sha {'OK' if reale == atteso else 'DIVERSO ***'}")
        if reale != atteso: problemi.append(f"E {sid}: sha256 diverso da quello validato")

    tot_min = sum(attese[s]["duration"] for s in da_leggere) / 60
    print(f"  attese {len(attese)} · clip {len(mp4)} · validate {len(ok)} · {tot_min:.1f} min di video")
    if problemi:
        esito_globale = 1
        print(f"  PROBLEMI: {len(problemi)}")
        for p in problemi[:20]: print("   ", p)
    else:
        print(f"  TUTTO INTEGRO: {len(attese)}/{len(attese)} clip presenti, validate, "
              f"durate allineate all'audio entro {TOLL}s")
sys.exit(esito_globale)
