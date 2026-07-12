#!/usr/bin/env python3
"""Runner del NASTRO B — audio dell'intero catalogo (11 corsi) con pipeline R2.

Per ogni corso: sintesi dei moduli in PARALLELO (job Azure indipendenti, idempotenti
via sha) → QA integrale del corso → clip campione per l'ascolto → upload wav su R2
(audio-master/<corso>/) → verifica → pulizia dei wav locali (word.json e registri
RESTANO in locale). Picco disco ≈ 1-2 corsi. Stop-on-red: un modulo che fallisce
due volte marca il corso ROSSO (gli altri proseguono).

Uso:  python scripts/produzione/batch_audio_catalogo.py [--parallel 6] [--corsi 19011,9001]
      [--no-upload] [--dry-run]
Stato: produzione/_staging/audio-log/stato.json (riprendibile: le slide fresche si saltano)
"""
from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import threading
import time
from pathlib import Path
from queue import Queue

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, str(Path(__file__).parent))
from orchestratore import PROD, REPO, carica_env, leggi_json, scrivi_atomico  # noqa: E402

CORSI = ["19011", "9001", "45001", "27001", "14001", "22000", "37001", "42001",
         "50001", "39001", "agg14001"]
LOGDIR = PROD / "_staging" / "audio-log"
PY = sys.executable
MIN_GB_LIBERI = 6


def rclone_bin() -> str:
    for cand in ("rclone",
                 os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\WinGet\Links\rclone.exe")):
        if shutil.which(cand) or Path(cand).exists():
            return cand
    trovati = list(Path(os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\WinGet\Packages")).rglob("rclone.exe"))
    if trovati:
        return str(trovati[0])
    sys.exit("rclone non trovato: installarlo (winget install Rclone.Rclone)")


def env_r2() -> tuple[dict, str]:
    envf = {}
    for f in (REPO / ".env", REPO / ".env.produzione"):
        if f.exists():
            for riga in f.read_text(encoding="utf-8").splitlines():
                if "=" in riga and not riga.strip().startswith("#"):
                    k, v = riga.strip().split("=", 1)
                    envf.setdefault(k, v)
    e = dict(os.environ)
    e.update({"RCLONE_CONFIG_R2_TYPE": "s3", "RCLONE_CONFIG_R2_PROVIDER": "Cloudflare",
              "RCLONE_CONFIG_R2_ACCESS_KEY_ID": envf["R2_ACCESS_KEY_ID"],
              "RCLONE_CONFIG_R2_SECRET_ACCESS_KEY": envf["R2_SECRET_ACCESS_KEY"],
              "RCLONE_CONFIG_R2_ENDPOINT": envf["R2_ENDPOINT"],
              "RCLONE_S3_NO_CHECK_BUCKET": "true"})
    return e, envf["R2_BUCKET"]


def moduli_di(corso: str) -> list[str]:
    cop = leggi_json(PROD / corso / "copioni.json")
    mods = sorted({re.search(r"_(m\d\d)_", s["id"]).group(1) for s in cop["slides"]})
    return mods


def gb_liberi() -> float:
    return shutil.disk_usage(str(PROD)).free / 1e9


def salva_stato(stato: dict) -> None:
    scrivi_atomico(LOGDIR / "stato.json", json.dumps(stato, ensure_ascii=False, indent=2))


def run_log(cmd: list[str], logfile: Path, env=None) -> int:
    with open(logfile, "a", encoding="utf-8", errors="replace") as f:
        f.write(f"\n=== {' '.join(str(c) for c in cmd)} @ {time.strftime('%H:%M:%S')}\n")
        f.flush()
        return subprocess.run(cmd, stdout=f, stderr=subprocess.STDOUT,
                              cwd=str(REPO), env=env).returncode


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--parallel", type=int, default=6)
    ap.add_argument("--corsi", help="lista es. 19011,9001 (default: tutti gli 11)")
    ap.add_argument("--no-upload", action="store_true", help="niente R2/pulizia (tutto locale)")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    corsi = a.corsi.split(",") if a.corsi else CORSI
    LOGDIR.mkdir(parents=True, exist_ok=True)

    piano = {c: moduli_di(c) for c in corsi}
    if a.dry_run:
        for c, mods in piano.items():
            print(f"{c}: {len(mods)} moduli")
        print(f"totale task: {sum(len(m) for m in piano.values())} · parallel {a.parallel}")
        return

    stato = leggi_json(LOGDIR / "stato.json", {}) or {}
    stato.setdefault("corsi", {c: {"stato": "IN_CODA", "moduli": {}} for c in corsi})
    for c in corsi:
        stato["corsi"].setdefault(c, {"stato": "IN_CODA", "moduli": {}})
    salva_stato(stato)
    lock = threading.Lock()
    coda: Queue = Queue()
    for c in corsi:
        for m in piano[c]:
            if stato["corsi"][c]["moduli"].get(m) != "OK":
                coda.put((c, m))

    def worker():
        while True:
            try:
                c, m = coda.get_nowait()
            except Exception:
                return
            while gb_liberi() < MIN_GB_LIBERI:
                time.sleep(60)  # aspetta che gli upload liberino spazio
            log = LOGDIR / f"{c}-{m}.log"
            rc = run_log([PY, "scripts/produzione/azure_tts.py", c, "--modulo", m], log)
            if rc != 0:  # retry x1
                rc = run_log([PY, "scripts/produzione/azure_tts.py", c, "--modulo", m], log)
            with lock:
                stato["corsi"][c]["moduli"][m] = "OK" if rc == 0 else "ROSSO"
                if rc != 0:
                    stato["corsi"][c]["stato"] = "ROSSO"
                salva_stato(stato)
            print(f"[{c} {m}] {'ok' if rc == 0 else 'ROSSO'} · liberi {gb_liberi():.1f}GB")
            coda.task_done()

    print(f"nastro B: {sum(len(m) for m in piano.values())} moduli, parallel {a.parallel}")
    threads = [threading.Thread(target=worker, daemon=True) for _ in range(a.parallel)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    # per corso completo: QA -> campione -> upload -> pulizia wav
    env_rc, bucket = (None, None) if a.no_upload else env_r2()
    rcl = None if a.no_upload else rclone_bin()
    for c in corsi:
        sc = stato["corsi"][c]
        if sc["stato"] == "ROSSO" or any(v != "OK" for v in sc["moduli"].values()):
            print(f"[{c}] ROSSO o incompleto: salto QA/upload")
            continue
        log = LOGDIR / f"{c}-qa.log"
        rc = run_log([PY, "scripts/produzione/azure_tts.py", c, "--qa"], log)
        if rc != 0:
            sc["stato"] = "QA_ROSSO"; salva_stato(stato)
            print(f"[{c}] QA ROSSO — vedere {log}")
            continue
        # clip campione per l'ascolto umano (prima, centrale, ultima)
        cop = leggi_json(PROD / c / "copioni.json")
        ids = [s["id"] for s in cop["slides"]]
        campione = [ids[0], ids[len(ids) // 2], ids[-1]]
        cdir = PROD / "_campione" / c
        cdir.mkdir(parents=True, exist_ok=True)
        for sid in campione:
            mod = re.search(r"_(m\d\d)_", sid).group(1)
            src = PROD / c / "audio" / mod / f"{sid}.wav"
            if src.exists():
                shutil.copy2(src, cdir / f"{sid}.wav")
        if a.no_upload:
            sc["stato"] = "OK_LOCALE"; salva_stato(stato)
            continue
        rc = run_log([rcl, "copy", str(PROD / c / "audio"), f"r2:{bucket}/audio-master/{c}/audio",
                      "--transfers", "8", "--checksum"], LOGDIR / f"{c}-upload.log", env=env_rc)
        if rc != 0:
            sc["stato"] = "UPLOAD_ROSSO"; salva_stato(stato)
            continue
        rc = run_log([rcl, "check", str(PROD / c / "audio"), f"r2:{bucket}/audio-master/{c}/audio",
                      "--size-only"], LOGDIR / f"{c}-upload.log", env=env_rc)
        if rc != 0:
            sc["stato"] = "CHECK_ROSSO"; salva_stato(stato)
            continue
        n = 0
        for w in (PROD / c / "audio").rglob("*.wav"):
            w.unlink(); n += 1
        sc["stato"] = "SU_R2"
        salva_stato(stato)
        print(f"[{c}] SU_R2 · {n} wav caricati e puliti in locale · liberi {gb_liberi():.1f}GB")

    print("\n=== ESITO ===")
    for c in corsi:
        print(f"  {c}: {stato['corsi'][c]['stato']}")


if __name__ == "__main__":
    main()
