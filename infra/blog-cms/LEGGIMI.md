# CMS del blog — messa in opera sulla VPS

I file di questa cartella sono **pronti**. Non sono ancora stati applicati: manca la VPS, che
si crea da sola appena Hetzner libera un `cx23` (vedi passo 0).

Il sito Next.js funziona già senza tutto questo: finché `BLOG_CMS_URL` non è impostata su
Vercel, il blog continua a servire i sette articoli attuali. **Nessuna fretta e nessun rischio
di lasciare il sito scoperto.**

---

## Cosa serve prima di iniziare

| | |
|---|---|
| VPS Hetzner | CX23 (2 vCPU / 4 GB / 40 GB NVMe, €5,49 + €0,50 IPv4) — Ubuntu 24.04 |
| IP della VPS | per il record DNS. Lo stampa `attendi-e-crea-server.py` quando crea |
| Storage Box | username `uXXXXXX` e host, con **SSH abilitato**, per i backup |
| (niente altro) | la dashboard e' protetta da utente e password, generati dall'installazione |

---

## Passi

### 0. Il server, quando sarà disponibile

CAX11 e CX23 sono spesso esauriti. Le finestre di disponibilità durano secondi: trovarne una,
avvisare qualcuno e aspettare che apra il pannello significa perderla ogni volta. Perciò lo
script **guarda e prende**:

```bash
# solo per vedere com'è messa adesso, senza creare nulla
HCLOUD_TOKEN=... python infra/blog-cms/attendi-e-crea-server.py --tipi cx23,cax11 --secco

# in attesa: quando si apre, crea il server già dietro il firewall e con la chiave SSH dentro
HCLOUD_TOKEN=... python infra/blog-cms/attendi-e-crea-server.py \
  --tipi cx23,cax11 --luoghi fsn1,nbg1,hel1 --nome cms-evalis \
  --chiave-pubblica ~/.ssh/id_ed25519.pub --ip-ssh 79.22.153.23
```

Chiave SSH e firewall si preparano **prima** di mettersi in attesa: creare il server e
proteggerlo dopo lascerebbe una finestra con la porta 22 aperta al mondo, ed è esattamente il
minuto in cui i bot bussano.

Il token Hetzner serve con permessi **Read & Write** (deve creare il server). Non viene mai
stampato né scritto nei log.

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
- **Accesso alla dashboard**: prima di WordPress il browser chiede una password (utente e
  password stanno in `credenziali-dashboard.txt` sulla VPS, generate dall'installazione). Serve
  perche' il tentativo automatico su `/wp-login.php` e' il rumore di fondo di internet: i bot
  sbattono su Caddy e non arrivano nemmeno a provare le password di WordPress.
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

### 7. Backup — cifrati, off-site, e verificati

`backup.sh` e `restore-test.sh` sono la stessa coppia di WhistleBlower (`deploy/backup.sh`,
`deploy/restore-test.sh`), adattata: qui il remoto è una **Storage Box**, che parla SSH
nativamente e non ha bisogno di rclone.

**Cosa salva:** dump di *tutti* gli schemi MariaDB (il secondo sito è coperto senza toccare
nulla), `wp-content` di ogni sito — le immagini sono l'unica cosa che non si può riscaricare da
nessuna parte — e il `.env` con i due token. Tutto GPG simmetrico: il dump contiene gli account
WordPress e i sali di `wp-config`, e finisce su una macchina che non è la nostra.

```bash
# passphrase, FUORI dallo stack
openssl rand -base64 48 > /root/.blog-backup-pass && chmod 600 /root/.blog-backup-pass
# ⚠️ copiarla anche altrove: persa la passphrase, i backup sono rumore

# accesso alla Storage Box (la chiave l'ha gia' creata setup-vps.sh)
cat /root/.ssh/id_ed25519.pub | ssh -p23 uXXXXXX@uXXXXXX.your-storagebox.de \
  "mkdir -p .ssh && cat >> .ssh/authorized_keys && chmod 700 .ssh && chmod 600 .ssh/authorized_keys"

chmod +x backup.sh restore-test.sh
```

```cron
# crontab -e (root)
20 3 * * *  cd /opt/blog-cms && BACKUP_PASSPHRASE_FILE=/root/.blog-backup-pass \
            STORAGE_BOX=uXXXXXX@uXXXXXX.your-storagebox.de \
            ./backup.sh >> /var/log/blog-backup.log 2>&1
0  4 * * 1  cd /opt/blog-cms && BACKUP_PASSPHRASE_FILE=/root/.blog-backup-pass \
            ./restore-test.sh >> /var/log/blog-restore-test.log 2>&1
```

**Perché il test di ripristino.** Un backup non verificato non è un backup: è un file che *speri*
si apra. Ogni lunedì `restore-test.sh` decifra davvero, ripristina il dump in un MariaDB
effimero e conta gli articoli. Controlla anche l'**età** del backup più recente: se supera le 36
ore vuol dire che il cron notturno è morto — il guasto peggiore, perché non fa rumore.

**Rotazione:** 30 giorni sulla VPS, 90 sulla Storage Box. La copia off-site si fa **senza
`--delete`**: con `--delete`, una cartella locale svuotata (disco pieno, script rotto, macchina
compromessa) cancellerebbe anche le copie remote, e il backup morirebbe nel momento esatto in
cui serve.

**Snapshot Hetzner: non servono.** Proteggono la macchina, ma la macchina è tre file in questo
repository: si rifà in un quarto d'ora. Quello che non si rifà sono gli articoli e le immagini,
e di quelli si occupa `backup.sh`. Risparmiati €1,20/mese.

**Limite dichiarato:** se la VPS muore del tutto, non arriva nessuna mail — è morto anche chi
doveva mandarla. Te ne accorgi dal test settimanale che non arriva più. Se vuoi una vera
sentinella esterna, si aggiunge un monitor di terze parti: dimmelo e lo metto.

---

## Aggiungere il secondo blog (bilanciotool)

Tre modifiche, nessuna riprogettazione:

1. `db-init/01-schemi.sql` — decommentare le righe del secondo schema
2. `docker-compose.yml` — copiare il servizio `wp-evalis` cambiando nome, `WORDPRESS_DB_NAME` e
   volume
3. `Caddyfile` — copiare il blocco host cambiando dominio e `reverse_proxy`

Sul lato Next.js non c'è nulla da riscrivere: il modulo `src/features/blog/` è guidato dalle
variabili d'ambiente. Il documento di consegna (Fase 9) lo spiega per esteso.
