#!/usr/bin/env bash
# Backup cifrato del CMS del blog. Stessa forma di WhistleBlower (deploy/backup.sh): dump +
# archivio + segreti, tutto GPG simmetrico, manifest di checksum, rotazione, copia off-site.
#
# Cosa salva:
#   1. dump di TUTTI gli schemi MariaDB   (articoli, utenti, impostazioni — anche del secondo
#                                          sito, quando ci sara': --all-databases li prende tutti)
#   2. tar di wp-content per ogni sito    (le IMMAGINI degli articoli: l'unica cosa che non si
#                                          puo' riscaricare da nessuna parte)
#   3. copia di .env                       (i due token condivisi con Vercel)
#
# PERCHE' CIFRATO anche se gli articoli sono pubblici: il dump contiene gli account WordPress
# con le password cifrate e i sali di wp-config, e il file .env contiene i token. Finisce su
# una macchina che non e' la nostra.
#
# Uso (dalla cartella dello stack, via cron — vedi in fondo):
#   BACKUP_PASSPHRASE_FILE=/root/.blog-backup-pass ./backup.sh
#
# Variabili:
#   BACKUP_PASSPHRASE_FILE  file (chmod 600, FUORI dallo stack) con la passphrase GPG
#   BACKUP_DIR              default /var/backups/blog-cms
#   RETENTION_DAYS          default 30 (rotazione locale)
#   STORAGE_BOX             es. u123456@u123456.your-storagebox.de — copia off-site
#   STORAGE_PATH            default ./blog-cms
#   SITI                    servizi WordPress da salvare (default "wp-evalis")
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/blog-cms}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
STORAGE_PATH="${STORAGE_PATH:-./blog-cms}"
SITI="${SITI:-wp-evalis}"
PASS_FILE="${BACKUP_PASSPHRASE_FILE:?Imposta BACKUP_PASSPHRASE_FILE (file con la passphrase GPG, chmod 600)}"

[ -f "$PASS_FILE" ] || { echo "ERRORE: passphrase file '$PASS_FILE' non trovato" >&2; exit 1; }
[ -f .env ]         || { echo "ERRORE: .env non trovato (lancia dalla cartella dello stack)" >&2; exit 1; }

# shellcheck disable=SC1091
DB_ROOT_PASSWORD=$(grep -E '^DB_ROOT_PASSWORD=' .env | cut -d= -f2-)

STAMP=$(date +%F-%H%M%S)
DEST="$BACKUP_DIR/$STAMP"
mkdir -p "$DEST"
chmod 700 "$BACKUP_DIR"

enc() { gpg --batch --yes --symmetric --cipher-algo AES256 --passphrase-file "$PASS_FILE" -o "$1"; }

# Un backup che fallisce in silenzio non e' un backup: si scopre il giorno del ripristino.
avvisa() {
  local testo="$1"
  echo "[backup] ALLARME: $testo" >&2
  local chiave from a
  chiave=$(grep -E '^RESEND_API_KEY=' .env | cut -d= -f2- || true)
  from=$(grep -E '^ALLARME_FROM=' .env | cut -d= -f2- || true)
  a=$(grep -E '^ALLARME_A=' .env | cut -d= -f2- || true)
  [ -n "$chiave" ] && [ -n "$a" ] || return 0
  curl -s -X POST https://api.resend.com/emails \
    -H "Authorization: Bearer $chiave" -H "Content-Type: application/json" \
    -d "{\"from\":\"${from:-Evalis <onboarding@resend.dev>}\",\"to\":[\"$a\"],
         \"subject\":\"Backup del blog FALLITO\",
         \"text\":\"$(date -Is)\n\n$testo\"}" >/dev/null || true
}
trap 'avvisa "il backup si e'"'"' interrotto (vedi /var/log/blog-backup.log)"' ERR

echo "[backup] $STAMP — inizio"

# 1. Database — tutti gli schemi in un colpo: il secondo sito e' coperto senza toccare nulla
docker compose exec -T db mariadb-dump -u root -p"$DB_ROOT_PASSWORD" \
  --all-databases --single-transaction --quick --routines --events \
  | gzip | enc "$DEST/db.sql.gz.gpg"
echo "[backup] db.sql.gz.gpg ok ($(du -h "$DEST/db.sql.gz.gpg" | cut -f1))"

# 2. wp-content di ogni sito. Fuori cache e aggiornamenti: si rigenerano e pesano.
for sito in $SITI; do
  docker compose exec -T "$sito" tar -czf - \
    --exclude=./cache --exclude=./upgrade --exclude=./uploads/cache \
    -C /var/www/html/wp-content . | enc "$DEST/$sito-wp-content.tar.gz.gpg"
  echo "[backup] $sito-wp-content.tar.gz.gpg ok ($(du -h "$DEST/$sito-wp-content.tar.gz.gpg" | cut -f1))"
done

# 3. Segreti dello stack (i due token condivisi con Vercel)
enc "$DEST/env.gpg" < .env
echo "[backup] env.gpg ok"

# Manifest: e' quello che permette a restore-test.sh di dire se il backup e' integro
( cd "$DEST" && sha256sum ./*.gpg > SHA256SUMS )

# Rotazione locale
find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -mtime +"$RETENTION_DAYS" -exec rm -rf {} +

# Copia off-site. Il backup NON deve vivere solo sulla macchina che protegge: uno snapshot
# della VPS non serve a niente se e' la VPS ad essere sparita.
if [ -n "${STORAGE_BOX:-}" ]; then
  # ⚠️ La Storage Box NON e' una shell normale: sulla porta 23 gira un ambiente ristretto che
  # conosce ls, mkdir, rm, stat — ma non `find`. Percio' la potatura si decide QUI e si
  # spediscono la' solo le cancellazioni, una per una.
  ssh -p 23 "$STORAGE_BOX" "mkdir $STORAGE_PATH" 2>/dev/null || true

  # NIENTE --delete. Con --delete, una cartella locale svuotata (disco pieno, errore mio,
  # macchina compromessa) cancellerebbe anche le copie off-site: il backup morirebbe proprio
  # nel momento in cui serve. Si copia soltanto.
  rsync -a -e 'ssh -p 23' "$DEST" "$STORAGE_BOX:$STORAGE_PATH/"
  echo "[backup] copia off-site su $STORAGE_BOX:$STORAGE_PATH/$STAMP ok"

  # Potatura: i nomi delle cartelle SONO le date (2026-08-04-031500), quindi l'eta' si legge
  # dal nome. E' anche piu' solido che fidarsi della data di modifica remota, che una copia
  # puo' aggiornare.
  LIMITE=$(date -d "-${OFFSITE_RETENTION_DAYS:-90} days" +%Y-%m-%d 2>/dev/null || echo "")
  if [ -n "$LIMITE" ]; then
    for vecchia in $(ssh -p 23 "$STORAGE_BOX" "ls $STORAGE_PATH" 2>/dev/null | tr -d '\r'); do
      case "$vecchia" in
        [0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]-*)
          if [ "${vecchia%%-[0-9][0-9][0-9][0-9][0-9][0-9]}" \< "$LIMITE" ]; then
            ssh -p 23 "$STORAGE_BOX" "rm -rf $STORAGE_PATH/$vecchia" 2>/dev/null \
              && echo "[backup] potata la copia off-site $vecchia"
          fi
          ;;
      esac
    done
  fi
else
  echo "[backup] ATTENZIONE: STORAGE_BOX non configurata — il backup e' SOLO locale" >&2
fi

echo "[backup] $STAMP — completato in $DEST"

# --- Cron (crontab -e, come root) -----------------------------------------------------------
#   20 3 * * *  cd /opt/blog-cms && BACKUP_PASSPHRASE_FILE=/root/.blog-backup-pass \
#               STORAGE_BOX=u123456@u123456.your-storagebox.de \
#               ./backup.sh >> /var/log/blog-backup.log 2>&1
#   0 4 * * 1   cd /opt/blog-cms && BACKUP_PASSPHRASE_FILE=/root/.blog-backup-pass \
#               ./restore-test.sh >> /var/log/blog-restore-test.log 2>&1
