# Blog headless WordPress — come è stato fatto per Evalis Academy

Documento di consegna. Serve a chi dovrà rifare la stessa cosa su **bilanciotool** senza
ripartire da zero né ripetere i nostri errori.

Non è il riassunto di un piano: è il resoconto di **cosa è finito online e come**, incluse le
trappole trovate strada facendo — che sono la parte di più valore, perché nessuna di esse era
prevedibile leggendo la documentazione.

**Stato al 04/08/2026:** infrastruttura in piedi e verificata, un articolo di prova pubblicato
e collaudato. **Non ancora in produzione**: le variabili su Vercel sono sull'ambiente *anteprima*,
il blog pubblico serve ancora i sette articoli precedenti. Il passaggio finale (Fase 8) resta da
fare.

---

## 1. Il problema, e perché headless

Un consulente SEO esterno produce gli articoli e **pretende WordPress** come ambiente di
scrittura. Il sito è Next.js su Vercel. Le tre strade possibili:

| | Perché è stata scartata |
|---|---|
| WordPress su un sottodominio, indicizzabile | Due siti in concorrenza, autorità divisa, due design |
| WordPress in sottocartella via proxy | Fragile, e lega il deploy del sito alla disponibilità del CMS |
| **Headless** ✅ | Un solo dominio indicizzabile, design nostro, il blog resta online anche se il CMS cade |

**Headless significa:** WordPress vive su un sottodominio chiuso e marcato `noindex`; Next.js
legge gli articoli via REST in compilazione e li rende col design del sito. Il visitatore non
tocca mai WordPress.

---

## 2. Architettura, com'è finita davvero

```
  redattore ──► cms.evalisacademy.it        (Hetzner CX23, Norimberga)
                 Caddy ─ WordPress ─ MariaDB
                 noindex su OGNI risposta
                        │
                        │ REST /wp-json/wp/v2/posts?_embed
                        │ webhook alla pubblicazione
                        ▼
  visitatore ──► evalisacademy.it            (Next.js su Vercel, fra1)
                 /blog · /blog/<slug> · /blog/autore/<slug>
                 /wp-content/uploads/* ──riscrittura──► CMS (in cache su Vercel)
```

**Costo:** €6,70/mese (server + IPv4). Backup su una Storage Box già esistente.

**Perché il CMS sta in Germania e Vercel a Francoforte:** il percorso in compilazione è
Vercel → CMS, e sono a pochi millisecondi. Non è un dettaglio estetico: la compilazione apre una
richiesta per articolo.

---

## 3. La regola che tiene in piedi tutto

> **WordPress fornisce i VALORI. Il frontend decide gli URL.**

Yoast genera `canonical`, `og:url` e schema puntati al dominio del CMS. Pubblicarli così
direbbe a Google: *«l'originale di questo articolo sta su cms.evalisacademy.it»* — un dominio
chiuso e marcato `noindex`. Google deindicizzerebbe le nostre pagine in favore di pagine che non
può nemmeno vedere, e il blog sparirebbe dalla ricerca.

`src/features/blog/seo.ts` **forza** il canonical su `<pubblico>/blog/<slug>`, qualunque cosa
dica Yoast, e riscrive ogni riferimento al CMS dentro il corpo degli articoli — link e immagini
che il redattore salva come URL assoluti.

---

## 4. L'infrastruttura — `infra/blog-cms/`

| File | Cosa fa |
|---|---|
| `attendi-e-crea-server.py` | Aspetta che Hetzner liberi il taglio voluto e **crea all'istante** |
| `setup-vps.sh` | La macchina: docker, fail2ban, ufw, aggiornamenti automatici, SSH a chiave, swap |
| `installa.sh` | Genera i segreti, avvia lo stack, aspetta il TLS e **verifica** |
| `docker-compose.yml` | Caddy + MariaDB + WordPress |
| `Caddyfile` | TLS automatico, `noindex`, password sulla dashboard, xmlrpc chiuso |
| `db-init/01-schemi.sql` | Uno schema per sito, dal primo giorno |
| `mu-plugins/evalis-headless.php` | Webhook, slug precedenti, anteprima, noindex, ruolo autore |
| `backup.sh` / `restore-test.sh` | Backup cifrati off-site, e il ripristino provato davvero |
| `LEGGIMI.md` | La procedura passo per passo |

### Il server

**CX23** (2 vCPU, 4 GB, 40 GB NVMe, €5,49 + €0,50 IPv4). CAX11 (ARM) andrebbe ugualmente bene:
tutte le immagini hanno la variante arm64. **Entrambi sono quasi sempre esauriti** e le finestre
di disponibilità durano secondi — per questo lo script guarda e prende invece di avvisare.

**IPv4 obbligatorio.** Vercel documenta di *accettare* IPv6 in entrata ma non garantisce di
saper *uscire* verso un'origine solo-IPv6. Una compilazione che non raggiunge il CMS fallisce.
Mezzo euro al mese non vale quel rischio.

### Il firewall

Il muro è quello di **Hetzner**, non `ufw`. I container Docker con porte pubblicate **scavalcano
ufw**, perché Docker si riscrive `iptables` da solo. `ufw` c'è come difesa in profondità per
eventuali servizi host, ma non è ciò che protegge.

```
in  tcp  22   ← solo gli IP di amministrazione
in  tcp  80   ← tutti (Let's Encrypt)
in  tcp  443  ← tutti (Vercel, il redattore, i controlli)
in  icmp      ← tutti
resto         negato
```

### La dashboard: password, non filtro IP

Il filtro per indirizzo IP sembra più stretto ed è **peggiore**: le connessioni italiane di casa
e ufficio cambiano indirizzo da sole, e chi ci lavora si ritrova chiuso fuori senza capire
perché. Una password HTTP davanti a `/wp-admin` e `/wp-login.php` fa lo stesso lavoro — i
tentativi automatici sbattono su Caddy e non arrivano nemmeno a WordPress — e funziona da
qualsiasi rete.

Utente e hash arrivano dall'ambiente: nel repository non c'è nulla in chiaro.

### Due siti sulla stessa macchina

Previsto dal primo giorno, e **non è un problema di posizionamento**: Google indicizza URL, non
server, e questi due WordPress non finiscono in nessun indice. Per aggiungere il secondo:

1. `db-init/01-schemi.sql` → decommentare lo schema **con un utente suo** (non riusare
   `wpuser`: con un utente solo, un WordPress compromesso riscrive anche il database dell'altro)
2. `docker-compose.yml` → copiare il servizio `wp-evalis` cambiando nome, `WORDPRESS_DB_NAME` e volume
3. `Caddyfile` → copiare il blocco host cambiando dominio e `reverse_proxy`

Sul lato Next.js **non c'è nulla da riscrivere**: il modulo è guidato dalle variabili d'ambiente.

---

## 5. WordPress, voce per voce

| Impostazione | Valore | Perché |
|---|---|---|
| Permalink | `/%postname%/` | Non legare l'URL a una data |
| Lettura → Scoraggia i motori | attivo | Secondo strato dopo l'header di Caddy |
| Yoast | installato, **sitemap spenta** | La sua sitemap manderebbe a Google URL del CMS |
| XML-RPC | disattivato | Non serve a un CMS headless, ed è il bersaglio più battuto |
| Editor di temi/plugin | disattivato (`DISALLOW_FILE_EDIT`) | Chi entra nella dashboard non deve poter scrivere PHP |
| Avatar | disattivati | Gravatar farebbe contattare un terzo dal browser di ogni visitatore |
| Commenti e ping | chiusi | Il blog non li usa; sono superficie e spam |
| Ruoli | il SEO è **Editor**, non amministratore | |

**La sitemap di Yoast va spenta due volte:** dal filtro nel mu-plugin *e* dall'opzione
(`wp option patch update wpseo enable_xml_sitemap false`). Solo il filtro **non basta** — ce ne
siamo accorti perché `/sitemap_index.xml` continuava a rispondere 200 dopo l'installazione.

### Il mu-plugin

Sta in `mu-plugins/` perché si carica sempre e **non è disattivabile dalla dashboard**. Se
qualcuno lo spegnesse per sbaglio, il blog smetterebbe di aggiornarsi *senza che nessuno riceva
un errore* — il guasto peggiore.

Fa cinque cose:

1. **Avvisa il sito quando si pubblica** (`transition_post_status`, `trashed_post`) → chiama
   `/api/blog/revalidate`. `blocking => false`: chi pubblica non aspetta.
2. **Espone lo slug precedente** (`/wp-json/evalis/v1/slug-precedente`) leggendo `_wp_old_slug`.
   È ciò che permette al sito di rispondere **301** invece di 404 quando un articolo indicizzato
   viene rinominato. Rotta pubblica di proposito: serve proprio a chi arriva da un link vecchio.
3. **Manda l'anteprima sul sito vero** (`preview_post_link`, `post_link`).
4. **Spegne sitemap Yoast, sitemap WordPress e XML-RPC.**
5. **Aggiunge il campo «Ruolo»** al profilo utente (WordPress ha la biografia ma non il ruolo).

---

## 6. Lo strato Next.js — `src/features/blog/`

| File | Responsabilità |
|---|---|
| `config.ts` | Legge le variabili d'ambiente. **Nessun dominio scritto nel codice** |
| `wp.ts` | Unico punto che tocca la rete: REST con timeout e 3 tentativi |
| `mappa.ts` | Post WordPress → `Articolo`. Entità HTML, tempo di lettura, autore, categoria |
| `sanitize.ts` | Lista bianca stretta sull'HTML dell'editor |
| `seo.ts` | Riscrittura degli URL e canonical forzato |
| `data.ts` | Formattazione date. **Senza dipendenze**: lo importano anche i componenti client |
| `fonte.ts` | Raccordo tra pagine e fonte, col ripiego sulla fonte precedente |
| `verifica.ts` | I controlli automatici |
| `tipi.ts` | Le forme dei dati |

### Variabili d'ambiente — le uniche da cambiare per un altro sito

```
BLOG_CMS_URL            https://cms.<dominio>
BLOG_CMS_USER           utente tecnico WordPress
BLOG_CMS_APP_PASSWORD   Application Password (con gli spazi)
BLOG_PREVIEW_TOKEN      anteprima bozze — finisce negli URL
BLOG_WEBHOOK_TOKEN      rigenerazione — non lascia mai il server
CRON_SECRET             impostata da Vercel, autentica il giro quotidiano
BLOG_CONSENTI_VUOTO     "1" solo il primo giorno, quando il CMS è ancora vuoto
```

I due token sono **separati di proposito**: quello dell'anteprima viaggia negli indirizzi
(cronologia, referrer), quello del webhook resta tra WordPress e il server.

### Le immagini

Restano ospitate dal CMS, ma il visitatore **non gliele chiede mai**. `seo.ts` riscrive gli
indirizzi sul dominio pubblico e `next.config.ts` ha una regola che li rende URL veri:

```ts
{ source: "/wp-content/uploads/:percorso*", destination: `${cms}/wp-content/uploads/:percorso*` }
```

Vercel prende il file dal CMS e lo tiene sulla propria rete. Due effetti voluti: il nome del CMS
non compare nel sorgente della pagina, e un CMS spento per qualche minuto non rompe le immagini
a chi sta leggendo.

### La build fallisce di proposito

Se il CMS non risponde in compilazione, l'errore **sale** e la compilazione fallisce, lasciando
online la versione precedente. Ingoiare l'errore pubblicherebbe un blog vuoto, che è molto
peggio. Stessa logica per il CMS che risponde «zero articoli»: fallisce, a meno di
`BLOG_CONSENTI_VUOTO=1`.

---

## 7. I controlli automatici

`src/features/blog/verifica.ts` legge le pagine **come le vede un visitatore**, via HTTP sul
sito pubblicato. Un controllo che guardasse le stesse strutture che generano la pagina non
verificherebbe niente.

| Controllo | È rosso se |
|---|---|
| `sitemap` | la sitemap elenca URL del CMS |
| `conteggio` | zero articoli |
| `cms-noindex` | il CMS risponde senza `noindex` |
| `cms-sitemap/*` | `/wp-sitemap.xml` o `/sitemap_index.xml` non danno 404 |
| `articoli` | canonical assente o su altro dominio · riferimento a `cms.` · title o description mancanti · doppio schema `Article` · articolo che dà 404 |
| `peso-immagini` | un'immagine supera i 400 KB |
| `autori` | un articolo cita un autore la cui pagina non esiste |
| `guardia-conteggio` | gli articoli online sono **meno** dell'ultimo giro |

Girano in tre momenti: dopo ogni pubblicazione (dentro `after()`, così WordPress non aspetta),
ogni mattina alle 6 col cron di Vercel, e a mano con
`npx tsx scripts/produzione/_verifica-blog.ts --sito … --cms …`.

**I test sono per sabotaggio** (`src/__tests__/blog-verifica.test.ts`): ognuno rompe una cosa
sola e pretende che il controllo se ne accorga. Un controllo che non fallisce mai non protegge
da nulla.

---

## 8. I backup

`backup.sh` + `restore-test.sh`, sul modello di `deploy/backup.sh` di WhistleBlower, con una
differenza: qui il remoto è una **Storage Box**, che parla SSH nativamente e non ha bisogno di
rclone.

**Ogni notte:** dump di *tutti* gli schemi MariaDB (il secondo sito è coperto senza toccare
nulla), `wp-content` di ogni sito, e il `.env` coi token. Tutto GPG AES256.

Cifrato anche se gli articoli sono pubblici: il dump contiene gli account WordPress e i sali di
`wp-config`, e finisce su una macchina che non è la nostra.

**Ogni lunedì** il ripristino si prova davvero: decifra, ricarica il dump in un MariaDB
effimero, conta gli articoli, e controlla che l'archivio contenga immagini. Verifica anche
l'**età** dell'ultimo backup: oltre 36 ore vuol dire che il cron è morto.

**Due scelte da non ribaltare:**

- **Sotto-account sulla Storage Box, non l'account principale.** La chiave sta sulla macchina che
  fa girare WordPress. Con l'account principale, chi entrasse avrebbe lettura e cancellazione su
  *tutto* il contenuto della Box; con un sotto-account, solo sulla sua cartella.
- **La copia off-site NON usa `--delete`.** Con `--delete`, una cartella locale svuotata (disco
  pieno, script rotto, macchina compromessa) cancellerebbe anche le copie remote: il backup
  morirebbe nel momento esatto in cui serve. Si copia soltanto; la potatura è un comando a parte,
  a 90 giorni contro i 30 locali.

**Niente snapshot Hetzner:** proteggono la macchina, ma la macchina sono tre file in questo
repository. Quello che non si rifà sono articoli e immagini.

**Limite dichiarato:** se la VPS muore del tutto non arriva nessuna mail — è morto anche chi
doveva mandarla. Ci si accorge dal test settimanale che smette di arrivare.

---

## 9. Le trappole — la parte che vale il documento

Nessuna di queste era prevedibile leggendo la documentazione. Sono costate tempo qui, e su un
secondo sito si evitano in cinque minuti.

**1. `datacenter` è dismesso nell'API Hetzner.** Dal 16/12/2025 la creazione vuole `location` e
risponde 422 a chi passa `datacenter`. La *disponibilità* però si legge ancora per datacenter:
due piani diversi della stessa API. Ci è costata la prima finestra di CX23.

**2. Su Ubuntu 24.04 SSH parte dal socket, non dal servizio.** `systemctl reload ssh` fallisce, e
con `set -e` si porta via tutto il resto dello script — swap, cartelle e chiave per i backup non
venivano creati, e lo script finiva senza dire nulla di sbagliato.

**3. Il filtro su `rest_endpoints` manda in errore fatale TUTTA la REST API.** Dentro
`$routes['/wp/v2/users']` ci sono anche voci di testo, non solo array: l'accesso per chiave su
una stringa è un `TypeError` fatale, e `/wp-json/wp/v2/posts` rispondeva 500. Era anche inutile:
WordPress mostra già solo gli autori con articoli pubblicati a chi non ha fatto accesso.
**Non filtrare l'elenco utenti a mano.**

**4. `who=authors` pretende l'autenticazione** da WordPress 5.9 e risponde 401 a chi legge da
fuori — cioè fa fallire ogni compilazione. Usare `has_published_posts=true`, che fa la stessa
selezione ed è pubblico.

**5. `register_meta` + `show_in_rest` non basta per gli utenti.** Il campo `meta` non compare
nella risposta pubblica. Serve `register_rest_field`. **E anche così** il valore resta vuoto
*dentro gli articoli*: l'autore incorporato da `?_embed` viaggia in contesto **`embed`**, che va
elencato esplicitamente nello schema. Il campo c'era sull'endpoint utenti e non sull'articolo —
la differenza si vede solo provando.

**6. Il container di `wp-cli` non vede il filesystem dell'host** né il `/tmp` del container
WordPress. Per importare un file va messo dentro il volume condiviso (`/var/www/html/...`); per
il contenuto di un articolo si usa `-` e lo si passa da STDIN.

**7. `wp-config.php` dell'immagine ufficiale legge l'host dall'ambiente** e senza ripiega su
`mysql`. Il container di `wp-cli` va avviato con le stesse variabili di quello WordPress,
altrimenti dà «Error establishing a database connection» pur essendo tutto a posto.

**8. La cache delle chiamate sopravvive alla ricompilazione.** Dopo aver modificato un articolo
nel CMS, `npm run build` può riusare la risposta salvata in `.next/cache/fetch-cache` e produrre
pagine con il contenuto vecchio — sembra un difetto del codice e non lo è. In produzione se ne
occupa il webhook; per una prova locale va svuotata.

**9. La Storage Box ha una shell ristretta.** Sulla porta 23 conosce `ls`, `mkdir`, `rm`, `stat`
— ma **non `find`**. La potatura off-site si decide dalla VPS (i nomi delle cartelle sono le
date) e si spediscono là solo le cancellazioni.

**10. `ScrollReveal` rivela al passaggio nel viewport.** Uno scatto a pagina intera non lo
attiva: metà pagina resta a opacità zero e sembra vuota. È un artefatto della misura, non un
difetto — `_scatti-blog.mjs` scorre la pagina prima di scattare.

**11. `ScrollReveal` non ha `"use client"`.** Funziona perché finora lo usavano solo componenti
client. Da un componente server la compilazione fallisce con `useReducedMotion() from the
server`. Lo schema del repository è: **pagina server che legge, componente client che mostra**.

---

## 10. Rifarlo su un altro sito

1. **DNS** — record **A** `cms.<dominio>` → IP della VPS. Niente wildcard.
2. **Server** — `attendi-e-crea-server.py`, poi `setup-vps.sh`, poi copiare i file e `installa.sh`
3. **Verificare le tre condizioni** prima di installare WordPress: `noindex` attivo, sitemap del
   CMS a 404, `xmlrpc` a 403. `installa.sh` esce con errore se una è rossa: **non proseguire**.
4. **WordPress** — la tabella della sezione 5, e spegnere la sitemap di Yoast **anche
   dall'opzione**
5. **Variabili su Vercel** — le sei della sezione 6
6. **Backup** — sotto-account sulla Storage Box, chiave, cron, e un **primo giro di prova subito**
7. **Verifica** — `_verifica-blog.ts` deve dare tutto verde
8. **Cutover** — 301 per gli URL con traffico, **410** per quelli senza (non 404: il 410 dice a
   Google di toglierli subito, il 404 li lascia mesi nell'indice)

---

## 11. Cosa NON è stato fatto, e perché

- **GA4 e banner di consenso** — richiede di riscrivere la cookie policy (documento legale, da
  far approvare) e di trasformare il banner da avviso a consenso vero. Rimandato.
- **`next/image` per le immagini degli articoli** — si usa `<img loading="lazy">`. Esce dalla
  quota di ottimizzazione di Vercel ma perde WebP automatico e ridimensionamento. Con copertine
  già in WebP sotto i 100 KB la differenza è piccola; se il blog crescerà molto, è la prima cosa
  da rivalutare.
- **Cutover in produzione** — le variabili sono sull'ambiente *anteprima*. Il blog pubblico
  serve ancora `src/lib/blogArticles.js`.
- **Una sentinella esterna sui backup** — vedi il limite dichiarato in sezione 8.

---

## 12. Le credenziali

**Non stanno in questo documento e non devono starci.** Un file in un repository è il posto
sbagliato per un segreto: lo legge chiunque abbia accesso al codice, per sempre, anche dopo che
la persona ha cambiato ruolo.

Dove trovarle:

| Cosa | Dove |
|---|---|
| Password dashboard e WordPress, Application Password | `/opt/blog-cms/credenziali-dashboard.txt` sulla VPS, leggibile solo da root |
| Token webhook e anteprima | `/opt/blog-cms/.env` sulla VPS, e nelle variabili d'ambiente di Vercel |
| Passphrase dei backup | `/root/.blog-backup-pass` — **da copiare anche altrove**: persa la passphrase, i backup sono rumore |
| Accesso alla Storage Box | chiave in `/root/.ssh/id_ed25519`, sotto-account autorizzato |
| Accesso SSH alla VPS | chiave `claude-desktop` caricata su Hetzner |

Per il secondo sito i segreti si **generano nuovi** (`installa.sh` lo fa da solo). Non riusare
quelli di Evalis: due siti che condividono un token sono un sito solo dal punto di vista di chi
attacca.
