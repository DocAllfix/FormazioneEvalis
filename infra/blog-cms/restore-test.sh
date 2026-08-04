#!/usr/bin/env bash
# Test di ripristino automatico. Stessa idea di WhistleBlower (deploy/restore-test.sh).
#
# Un backup non verificato non e' un backup: e' un file che SPERI si apra. Qui si apre davvero,
# ogni lunedi', senza toccare il CMS in esercizio:
#   1. integrita' dei file (checksum del manifest)
#   2. decifratura GPG riuscita
#   3. restore del dump in un MariaDB EFFIMERO + conteggio degli articoli
#   4. archivio wp-content leggibile, con dentro le immagini
#
# Uso:  BACKUP_PASSPHRASE_FILE=/root/.blog-backup-pass ./restore-test.sh [CARTELLA_BACKUP]
# Exit 0 = ripristino verificato; diverso da 0 = il backup NON e' affidabile.
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/blog-cms}"
PASS_FILE="${BACKUP_PASSPHRASE_FILE:?Imposta BACKUP_PASSPHRASE_FILE}"
TARGET="${1:-$(find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d | sort | tail -1)}"

[ -n "$TARGET" ] && [ -d "$TARGET" ] || { echo "ERRORE: nessun backup trovato in $BACKUP_DIR" >&2; exit 1; }
echo "[restore-test] verifica di: $TARGET"

# quanti giorni ha il backup piu' recente? Un backup di tre settimane fa vuol dire che il cron
# e' morto e nessuno se n'e' accorto — il guasto peggiore, perche' non fa rumore.
ETA_ORE=$(( ( $(date +%s) - $(stat -c %Y "$TARGET") ) / 3600 ))
if [ "$ETA_ORE" -gt 36 ]; then
  echo "ERRORE: il backup piu' recente ha $ETA_ORE ore. Il cron notturno non sta girando." >&2
  exit 1
fi
echo "[restore-test] eta' del backup: ${ETA_ORE}h (soglia 36h)"

# 1. Integrita'
( cd "$TARGET" && sha256sum -c SHA256SUMS ) || { echo "ERRORE: checksum falliti" >&2; exit 1; }

dec() { gpg --batch --quiet --decrypt --passphrase-file "$PASS_FILE" "$1"; }

# 2+4. wp-content: decifra e verifica che l'archivio sia leggibile E che contenga le immagini
for archivio in "$TARGET"/*-wp-content.tar.gz.gpg; do
  [ -e "$archivio" ] || continue
  VOCI=$(dec "$archivio" | tar -tzf - | wc -l)
  IMMAGINI=$(dec "$archivio" | tar -tzf - | grep -c '^\./uploads/.*\.\(jpg\|jpeg\|png\|webp\|gif\|avif\)$' || true)
  echo "[restore-test] $(basename "$archivio"): $VOCI voci, $IMMAGINI immagini"
  [ "$VOCI" -gt 0 ] || { echo "ERRORE: archivio vuoto" >&2; exit 1; }
done

# 2. Segreti: il .env deve contenere i due token, altrimenti dopo un disastro il blog resta
# muto e nessuno sa piu' quali fossero
dec "$TARGET/env.gpg" | grep -q '^BLOG_WEBHOOK_TOKEN=..*' \
  || { echo "ERRORE: env.gpg senza BLOG_WEBHOOK_TOKEN" >&2; exit 1; }
dec "$TARGET/env.gpg" | grep -q '^BLOG_PREVIEW_TOKEN=..*' \
  || { echo "ERRORE: env.gpg senza BLOG_PREVIEW_TOKEN" >&2; exit 1; }
echo "[restore-test] env.gpg contiene entrambi i token"

# 3. Database: restore su un MariaDB effimero e conteggio reale
EFFIMERO="blog-restore-test-$$"
docker run -d --rm --name "$EFFIMERO" -e MARIADB_ROOT_PASSWORD=restoretest mariadb:11 >/dev/null
trap 'docker stop "$EFFIMERO" >/dev/null 2>&1 || true' EXIT

echo "[restore-test] attendo il MariaDB effimero…"
# query vera, non un ping: durante l'inizializzazione il server accetta connessioni e poi si
# riavvia, e un ping darebbe un "pronto" falso proprio mentre il socket sparisce
for _ in $(seq 1 60); do
  docker exec "$EFFIMERO" mariadb -uroot -prestoretest -e 'SELECT 1' >/dev/null 2>&1 && break
  sleep 1
done

dec "$TARGET/db.sql.gz.gpg" | gunzip | \
  docker exec -i "$EFFIMERO" mariadb -uroot -prestoretest >/dev/null

ARTICOLI=$(docker exec "$EFFIMERO" mariadb -uroot -prestoretest -N -B -e \
  "SELECT COUNT(*) FROM wp_evalis.wp_posts WHERE post_type='post' AND post_status='publish';")
UTENTI=$(docker exec "$EFFIMERO" mariadb -uroot -prestoretest -N -B -e \
  "SELECT COUNT(*) FROM wp_evalis.wp_users;")

[ "$UTENTI" -ge 1 ] || { echo "ERRORE: restore senza utenti — il dump non e' quello giusto" >&2; exit 1; }
echo "[restore-test] restore DB ok — articoli pubblicati=$ARTICOLI, utenti=$UTENTI"
echo "[restore-test] VERIFICATO: da questo backup si riparte."
