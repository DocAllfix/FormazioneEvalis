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

    # RIUSO fra edizioni: le slide rimaste identiche non hanno una clip propria, usano
    # quella del corso di origine (stesso file su R2, sotto la cartella di quel corso).
    rp = REPO / "produzione" / corso / "riuso-clip.json"
    riuso = json.loads(rp.read_text(encoding="utf-8")) if rp.exists() else {}
    origine_corso = riuso.get("corsoOrigine")
    # sid -> (cartella su R2, nome del file senza estensione)
    sorgente = {sid: (corso, sid) for sid in attese}
    for sid in riuso.get("slide", []):
        if sid in attese: sorgente[sid] = (origine_corso, riuso["origine"][sid])

    cartelle = sorted({c for c, _ in sorgente.values()})
    files = {}
    for c in cartelle:
        o = subprocess.run([RCL, "lsjson", f"r2:{B}/avatar-clips/{c}"],
                           env=env, capture_output=True, text=True, timeout=600)
        files[c] = {x["Name"]: x for x in json.loads(o.stdout)}
    mp4 = {c: {n[:-4] for n in f if n.endswith(".mp4")} for c, f in files.items()}
    ok = {c: {n[:-7] for n in f if n.endswith(".mp4.ok")} for c, f in files.items()}

    problemi = []
    for sid in attese:
        c, nome = sorgente[sid]
        dove = "" if c == corso else f" (riusata da {c}/{nome})"
        if nome not in mp4[c]: problemi.append(f"A {sid}: clip MANCANTE{dove}")
        elif nome not in ok[c]: problemi.append(f"A {sid}: manca il marcatore di validazione{dove}")
        elif files[c][f"{nome}.mp4"]["Size"] < 100_000: problemi.append(f"D {sid}: file sospetto ({files[c][f'{nome}.mp4']['Size']} byte)")
    propri = {nome for c, nome in sorgente.values() if c == corso}
    for sid in mp4[corso] - propri: problemi.append(f"B {sid}: clip ORFANA (nessuna slide corrispondente)")

    # C — durata dichiarata nel marcatore contro la durata dell'audio.
    # I marcatori si scaricano in BLOCCO (una sola rclone): uno alla volta sono 540 processi.
    da_leggere = sorted(sid for sid in attese if sorgente[sid][1] in ok[sorgente[sid][0]])
    marcatori = {}
    for c in cartelle:
        cache = Path(os.environ.get("TEMP", "/tmp")) / f"_ok-{c}"
        cache.mkdir(parents=True, exist_ok=True)
        subprocess.run([RCL, "copy", f"r2:{B}/avatar-clips/{c}", str(cache),
                        "--include", "*.mp4.ok", "--transfers", "24"],
                       env=env, capture_output=True, timeout=1800)
        for f in cache.glob("*.mp4.ok"):
            try:
                marcatori[(c, f.name[:-7])] = json.loads(f.read_text(encoding="utf-8"))
            except Exception:
                problemi.append(f"C {f.name[:-7]}: marcatore illeggibile")
    for sid in da_leggere:
        d = marcatori.get(sorgente[sid])
        if d is None:
            problemi.append(f"C {sid}: marcatore non scaricato"); continue
        scarto = abs(d["duration"] - attese[sid]["duration"])
        if scarto > TOLL:
            problemi.append(f"C {sid}: durata {d['duration']}s vs audio {attese[sid]['duration']}s (scarto {scarto:.2f}s)")

    # E — sha256 reale su R2 contro quello registrato, a campione
    random.seed(11)
    for sid in random.sample(da_leggere, min(CAMPIONE, len(da_leggere))):
        c, nome = sorgente[sid]
        atteso = marcatori[(c, nome)]["sha256"]
        v = subprocess.run([RCL, "cat", f"r2:{B}/avatar-clips/{c}/{nome}.mp4"], env=env, capture_output=True, timeout=600)
        reale = hashlib.sha256(v.stdout).hexdigest()
        print(f"  campione {sid}: sha {'OK' if reale == atteso else 'DIVERSO ***'}")
        if reale != atteso: problemi.append(f"E {sid}: sha256 diverso da quello validato")

    tot_min = sum(attese[s]["duration"] for s in da_leggere) / 60
    n_riuso = sum(1 for sid in attese if sorgente[sid][0] != corso)
    print(f"  attese {len(attese)} · validate {len(da_leggere)} (di cui {n_riuso} riusate da {origine_corso}) · {tot_min:.1f} min di video")
    if problemi:
        esito_globale = 1
        print(f"  PROBLEMI: {len(problemi)}")
        for p in problemi[:20]: print("   ", p)
    else:
        print(f"  TUTTO INTEGRO: {len(attese)}/{len(attese)} clip presenti, validate, "
              f"durate allineate all'audio entro {TOLL}s")
sys.exit(esito_globale)
