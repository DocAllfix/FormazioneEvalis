# Carica su R2 (audio-master/<corso>/audio/<mNN>) l'audio dei moduli indicati, dopo il loro QA, e
# verifica il caricamento con rclone check. Si può lanciare modulo per modulo mentre gli altri si
# sintetizzano ancora. I wav locali NON si cancellano qui (si fa dopo la verifica degli avatar).
# Uso: python scripts/produzione/_carica-audio-r2.py <corso> <mNN> [<mNN> ...]
import subprocess, sys
sys.path.insert(0, "scripts/produzione")
sys.stdout.reconfigure(encoding="utf-8")
from batch_audio_catalogo import env_r2, rclone_bin

corso, moduli = sys.argv[1], sys.argv[2:]
env, bucket = env_r2()
rcl = rclone_bin()
ok = True
for m in moduli:
    qa = subprocess.run([sys.executable, "scripts/produzione/azure_tts.py", corso, "--modulo", m, "--qa"], capture_output=True, text=True, encoding="utf-8")
    if qa.returncode != 0:
        print(f"[{m}] QA ROSSO: non carico\n{qa.stdout[-600:]}"); ok = False; continue
    src, dst = f"produzione/{corso}/audio/{m}", f"r2:{bucket}/audio-master/{corso}/audio/{m}"
    r = subprocess.run([rcl, "copy", src, dst, "--transfers", "8", "--checksum", "--s3-no-check-bucket"], env=env, capture_output=True, text=True)
    c = subprocess.run([rcl, "check", src, dst, "--size-only", "--s3-no-check-bucket"], env=env, capture_output=True, text=True) if r.returncode == 0 else r
    print(f"[{m}] {'caricato e verificato' if c.returncode == 0 else 'ERRORE: ' + (c.stderr or '')[-400:]}")
    ok &= c.returncode == 0
sys.exit(0 if ok else 1)
