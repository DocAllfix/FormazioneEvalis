#!/usr/bin/env bash
# Avvio dello stack del CMS. Da lanciare in /opt/blog-cms DOPO setup-vps.sh e dopo aver
# copiato i file (docker-compose.yml, Caddyfile, db-init/, mu-plugins/, backup.sh, ...).
#
#   DOMINIO_CMS=cms.evalisacademy.it SITO_PUBBLICO=https://evalisacademy.it ./installa.sh
#
# Idempotente: se .env esiste gia', i segreti NON vengono rigenerati — rigenerarli
# scollegherebbe il CMS dal sito (i token non combacerebbero piu') e nessuno capirebbe perche'
# le pubblicazioni hanno smesso di comparire.
set -euo pipefail

DOMINIO_CMS="${DOMINIO_CMS:?Serve DOMINIO_CMS (es. cms.evalisacademy.it)}"
SITO_PUBBLICO="${SITO_PUBBLICO:?Serve SITO_PUBBLICO (es. https://evalisacademy.it)}"

cd "$(dirname "$0")"

# --- 1. segreti ------------------------------------------------------------------------
if [ -f .env ]; then
  echo "[installa] .env gia' presente: i segreti restano quelli. Non si rigenerano MAI."
else
  echo "[installa] genero i segreti…"
  # password della dashboard: leggibile a voce e da riscrivere a mano, quindi niente simboli
  ADMIN_PASSWORD=$(openssl rand -base64 18 | tr -d '/+=' | cut -c1-20)
  # l'hash lo calcola Caddy stesso, in un container usa-e-getta: cosi' non serve che il
  # servizio sia gia' in piedi (e non lo puo' essere, gli manca proprio questo valore)
  ADMIN_HASH=$(docker run --rm caddy:2-alpine caddy hash-password --plaintext "$ADMIN_PASSWORD")

  cat > .env <<ENV
DB_ROOT_PASSWORD=$(openssl rand -hex 24)
DB_PASSWORD=$(openssl rand -hex 24)
SITO_PUBBLICO=$SITO_PUBBLICO
BLOG_WEBHOOK_TOKEN=$(openssl rand -hex 32)
BLOG_PREVIEW_TOKEN=$(openssl rand -hex 32)
ADMIN_UTENTE=${ADMIN_UTENTE:-evalis}
ADMIN_HASH=$ADMIN_HASH
ENV
  chmod 600 .env

  # in chiaro sta solo qui, letto da root: il .env conserva l'hash, non la password
  printf 'utente: %s\npassword: %s\n' "${ADMIN_UTENTE:-evalis}" "$ADMIN_PASSWORD" > credenziali-dashboard.txt
  chmod 600 credenziali-dashboard.txt
  echo "[installa] password della dashboard scritta in credenziali-dashboard.txt"
fi

# --- 2. il dominio nel Caddyfile -------------------------------------------------------
# Caddy chiede il certificato per l'host scritto qui: se resta quello di esempio, il rilascio
# fallisce e il CMS non risponde in HTTPS.
if ! grep -q "^$DOMINIO_CMS {" Caddyfile; then
  sed -i "s/^cms\.evalisacademy\.it {/$DOMINIO_CMS {/" Caddyfile
  echo "[installa] Caddyfile puntato su $DOMINIO_CMS"
fi

chmod +x backup.sh restore-test.sh 2>/dev/null || true

# --- 4. avvio --------------------------------------------------------------------------
echo "[installa] avvio dello stack…"
docker compose up -d

echo "[installa] attendo il certificato TLS…"
for _ in $(seq 1 60); do
  if curl -sSf -o /dev/null "https://$DOMINIO_CMS/" 2>/dev/null; then
    echo "[installa] HTTPS attivo"
    break
  fi
  sleep 5
done

# --- 5. verifica: le tre condizioni senza cui il CMS fa danni --------------------------
echo
echo "=== Verifica ==="
esito=0

robots=$(curl -sI "https://$DOMINIO_CMS/" | tr -d '\r' | grep -i '^x-robots-tag:' || true)
if echo "$robots" | grep -qi noindex; then
  echo "OK    noindex attivo — $robots"
else
  echo "ROSSO il CMS NON dichiara noindex: Google indicizzerebbe una seconda copia di ogni articolo"
  esito=1
fi

for percorso in /wp-sitemap.xml /sitemap_index.xml; do
  codice=$(curl -s -o /dev/null -w '%{http_code}' "https://$DOMINIO_CMS$percorso")
  # 404 atteso; prima dell'installazione di WordPress puo' rispondere 302 verso il setup
  if [ "$codice" = "404" ] || [ "$codice" = "302" ]; then
    echo "OK    $percorso → $codice (nessuna sitemap concorrente)"
  else
    echo "ROSSO $percorso → $codice: c'e' una sitemap che compete con la nostra"
    esito=1
  fi
done

codice=$(curl -s -o /dev/null -w '%{http_code}' "https://$DOMINIO_CMS/xmlrpc.php")
[ "$codice" = "403" ] && echo "OK    xmlrpc.php → 403" || { echo "ROSSO xmlrpc.php → $codice"; esito=1; }

echo
if [ "$esito" -eq 0 ]; then
  echo "=== Stack in piedi e verificato ==="
else
  echo "=== CI SONO CONTROLLI ROSSI: non installare WordPress finche' non sono verdi ===" >&2
fi

echo
echo "Da mettere su Vercel (variabili d'ambiente):"
echo "  BLOG_CMS_URL=https://$DOMINIO_CMS"
echo "  BLOG_PREVIEW_TOKEN=$(grep '^BLOG_PREVIEW_TOKEN=' .env | cut -d= -f2-)"
echo "  BLOG_WEBHOOK_TOKEN=$(grep '^BLOG_WEBHOOK_TOKEN=' .env | cut -d= -f2-)"
echo "  BLOG_CMS_USER / BLOG_CMS_APP_PASSWORD → dopo aver creato l'Application Password in WordPress"
echo
echo "Per entrare (il browser chiedera' prima questa, poi quella di WordPress):"
cat credenziali-dashboard.txt 2>/dev/null || echo "  (vedi credenziali-dashboard.txt)"
echo
echo "Poi: https://$DOMINIO_CMS/wp-admin/install.php"

exit "$esito"
