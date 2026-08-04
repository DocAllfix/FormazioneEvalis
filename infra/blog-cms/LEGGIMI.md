# CMS del blog — messa in opera sulla VPS

I file di questa cartella sono **pronti**. Non sono ancora stati applicati: mancano l'IP della
VPS e l'IP fisso da cui lavora il consulente SEO.

Il sito Next.js funziona già senza tutto questo: finché `BLOG_CMS_URL` non è impostata su
Vercel, il blog continua a servire i sette articoli attuali. **Nessuna fretta e nessun rischio
di lasciare il sito scoperto.**

---

## Cosa serve prima di iniziare

| | |
|---|---|
| VPS Hetzner | CAX11 (ARM, 2 vCPU / 4 GB, ~6 €/mese) — Ubuntu 24.04 |
| IP della VPS | per il record DNS |
| IP fisso del SEO | per aprire `/wp-admin` solo a lui. Se ha IP dinamico, si passa a una password HTTP davanti alla dashboard |

---

## Passi

### 1. DNS (pannello Vercel)

Record **A**: `cms.evalisacademy.it` → IP della VPS.

Niente wildcard: catturerebbe ogni sottodominio inesistente, compresi quelli che non
controlliamo. Il record per il secondo CMS si aggiungerà quando servirà.

### 2. Sulla VPS

```bash
# Docker
curl -fsSL https://get.docker.com | sh

# i file di questa cartella
mkdir -p /opt/blog-cms && cd /opt/blog-cms
# (copiare docker-compose.yml, Caddyfile, db-init/, mu-plugins/)

cp .env.example .env && nano .env      # riempire: password e i due token
openssl rand -hex 32                   # per ciascun token

nano Caddyfile                         # ⚠️ SOSTITUIRE gli IP di esempio 203.0.113.x
docker compose up -d
```

### 3. Verifica dell'infrastruttura — prima di andare avanti

```bash
curl -I https://cms.evalisacademy.it            # deve avere X-Robots-Tag: noindex
curl -o /dev/null -w '%{http_code}\n' https://cms.evalisacademy.it/wp-admin   # 403 da un IP non autorizzato
curl -o /dev/null -w '%{http_code}\n' https://cms.evalisacademy.it/wp-sitemap.xml  # 404
```

Se uno dei tre non torna, **fermarsi**: sono le condizioni che impediscono al CMS di finire in
concorrenza col sito.

### 4. WordPress

Installazione guidata, poi:

- **Impostazioni → Permalink**: `/%postname%/` — non `/2026/08/titolo/`
- **Impostazioni → Lettura**: spuntare «Scoraggia i motori di ricerca» (secondo strato oltre
  all'header di Caddy)
- **Plugin**: Yoast SEO. La sua sitemap è già disattivata dal mu-plugin, ma controllare che
  `/sitemap_index.xml` risponda 404
- **Utenti**: il SEO è **Editor**, non amministratore. Un utente per ciascun autore, con
  **biografia** compilata e il campo **«Ruolo mostrato sul sito»** (lo aggiunge il mu-plugin,
  in fondo al profilo)
- **Application Password** per un utente tecnico: serve a Next.js per leggere le bozze
  (Utenti → il tuo profilo → Password per applicazioni)

### 5. Su Vercel — variabili d'ambiente

```
BLOG_CMS_URL=https://cms.evalisacademy.it
BLOG_CMS_USER=<utente tecnico>
BLOG_CMS_APP_PASSWORD=<Application Password, con gli spazi>
BLOG_PREVIEW_TOKEN=<lo stesso della VPS>
BLOG_WEBHOOK_TOKEN=<lo stesso della VPS>
```

Al primo deploy dopo queste variabili, il blog **passa a WordPress**. Se il CMS non risponde la
compilazione fallisce e resta online la versione precedente: è voluto.

### 6. Verifica del collegamento

```bash
npx tsx scripts/produzione/_verifica-blog.ts \
  --sito https://evalisacademy.it --cms https://cms.evalisacademy.it
```

Esce con codice 1 se anche un solo controllo è rosso.

### 7. Backup

- Snapshot Hetzner automatici (protegge dal guasto della macchina)
- Dump del database su storage esterno (protegge da un articolo cancellato per sbaglio — cosa
  che lo snapshot **non** fa):

```bash
# crontab -e
0 3 * * * cd /opt/blog-cms && docker compose exec -T db \
  mariadb-dump -u root -p"$DB_ROOT_PASSWORD" --all-databases | gzip > /backup/wp-$(date +\%F).sql.gz
```

---

## Aggiungere il secondo blog (bilanciotool)

Tre modifiche, nessuna riprogettazione:

1. `db-init/01-schemi.sql` — decommentare le righe del secondo schema
2. `docker-compose.yml` — copiare il servizio `wp-evalis` cambiando nome, `WORDPRESS_DB_NAME` e
   volume
3. `Caddyfile` — copiare il blocco host cambiando dominio e `reverse_proxy`

Sul lato Next.js non c'è nulla da riscrivere: il modulo `src/features/blog/` è guidato dalle
variabili d'ambiente. Il documento di consegna (Fase 9) lo spiega per esteso.
