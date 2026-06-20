La combinazione più vicina a quello che ti serve oggi è: backend headless LMS = Wellms/EscolaLMS, LRS xAPI = Learning Locker o EscolaLMS LRS, frontend custom Next.js + React video/quiz player, più BaaS mirati (Supabase + Cloudflare Stream/Mux + Stripe + Trigger.dev/BullMQ) per ridurre il codice custom, integrando i vincoli dell’Accordo Stato‑Regioni 2025 e del D.Lgs. 81/08 su tracciamento, quiz obbligatori e audit trail.

Di seguito ti organizzo tutto per area, con progetti concreti e indicazione della porzione di architettura che coprono.

Area 1 — Compliance fruizione corsi e integrità
1.1 Backend LMS + tracciamento fine‑grained
EscolaLMS / Wellms (headless LMS)

URL: https://github.com/EscolaLMS/API (core) + monorepo org.

Licenza: API sotto Apache‑2.0, altri pacchetti spesso MIT (es. H5P).

Stack: Laravel 8+/PHP 8 per API, React SPA per admin/front, REST headless.

Maturità: 12+ stelle sul core API, 189 release con ultima a gennaio 2025; ecosistema di ~78 repo attivi (courses, reports, H5P, LRS, ecc.).

Cosa copre per te:

Strutturazione corsi/moduli/lezioni, progress tracking per utente, reportistica corsi.

Pacchetti dedicati a H5P e SCORM, con tracking di completamento e progress per SCO.

Repo “Reports” per analitiche corsi e attività, base per audit trail.

Pattern per heartbeat, tempo minimo, AFK (da implementare sopra Wellms / qualunque LMS)
Non ho trovato un modulo “anti‑frode” già pronto che faccia tutto (focus, anti‑AFK, tempo minimo) in modo opinionated; tutti i progetti seri trattano SCORM/xAPI e demandano al corso o al front‑end la logica di controllo.

Pattern tecnici che puoi implementare:

Heartbeat player → backend

Usa timeupdate dell’HTML5 video, più un setInterval che invia al backend un “session ping” con: timestamp, posizione, stato (playing/paused), focus finestra, ultimo input utente.

Il backend mantiene un contatore di secondi validati, incrementato solo se:

stato = playing,

document.visibilityState === "visible" e nessun blur prolungato,

ultimi N secondi contengono almeno un evento input (mouse/keyboard) o risposta a micro‑quiz.

Blocco avanzamento sequenziale

Lato backend definisci per ogni lezione: min_required_seconds e completed_at calcolato solo quando effective_watch_seconds >= min_required_seconds.

L’API di “GET next lesson” ritorna 403 se la precedente non è in stato completed, rendendo impossibile by‑passare via API.

Gestione chiusura browser/ritorno dopo giorni

Persisti server‑side lo stato di sessione (posizione video, secondi validati, quiz inline svolti) e non in localStorage, così puoi riprendere da qualsiasi device.

Se l’utente torna dopo giorni, ricostruisci lo stato dal backend e imponi di rivedere eventuali segmenti “non validi” (ad es. tenendo anche una mappa di secondi “accreditati”).

Per le sessioni multiple:

Usa un middleware tipo redis‑jwt con multiple: false per forzare una sola sessione attiva per utente; il pacchetto gestisce sessioni in Redis e può limitare “single active session” per ID utente.

In alternativa, pattern manuale: mappa user_id ➝ session_id in Redis, e su nuovo login invalida il precedente (pattern descritto anche in discussioni su Express + Redis).

1.2 xAPI / LRS per audit trail append‑only
Learning Locker (LRS Open Source)

URL: https://github.com/learninglocker/learninglocker

Licenza: GPLv3.

Stack: Node.js + MongoDB, implementazione completa di LRS xAPI.

Maturità: ~574 stelle, 291 fork, aggiornato almeno fino a maggio 2024, ampiamente usato in produzione.

Cosa copre:

Storage append‑only di statements xAPI (actor, verb, object, result, context) con query e report.

Base perfetta per audit trail immodificabile delle attività formative (start/pause/resume/completion, quiz, tentativi).

EscolaLMS LRS

URL: https://github.com/EscolaLMS/lrs

Licenza: in linea con ecosistema Escola (tipicamente Apache‑2.0/MIT).

Stack: parte dell’ecosistema Laravel di Wellms.

Maturità: elencato tra i pacchetti “awesome” Escola con sync 2025.

Cosa copre: xAPI LRS integrato “nativamente” con il resto del LMS, utile se vuoi tenere tutto dentro lo stesso stack.

Event sourcing / append‑only log

Pattern di event sourcing: mantieni un event store append‑only con hash di collegamento tra eventi, così da rendere rilevabile ogni manomissione (pattern usato da EventSourcingDB).

Anche senza full event sourcing, puoi usare un “audit log” append‑only separato per tutte le azioni utente (view start/stop, quiz answered, certificate issued), come suggerito negli articoli sull’uso dell’outbox pattern per audit.

1.3 Focus, AFK e quiz durante il corso
Non ho trovato un componente player che faccia già anti‑AFK normativo pronto e mantenuto; i provider italiani che dichiarano conformità Accordo 2025 (DynDevice, Kattedra, DidattiCloud) parlano di sistemi avanzati di verifica presenza, tracciamento LO, log dettagliati e, in alcuni casi, proctoring, ma non rilasciano codice.

Pattern consigliato:

Rilevamento focus finestra:

Usa Page Visibility API e visibilitychange/blur per mettere in pausa il video se la scheda perde focus per >N secondi e sospendere il conteggio.

Quiz a sorpresa integrati nel player:

Usa H5P Interactive Video via pacchetti headless di EscolaLMS: l’API H5P espone eventi xAPI per ogni interazione e si presta bene a inserire domande in timeline video.

L’integrazione React dell’H5P player (repo H5P‑player) fornisce callback onXAPI per ricevere eventi e registrarli lato backend.

Presenza attiva:

Imporre che, entro ogni finestra di X minuti di contenuto, sia comparso almeno un quiz “presence check” e sia stato risposto correttamente per considerare valida la finestra.

1.4 Riprese e stato persistente
SCORM: pacchetti come @gamestdio/scorm forniscono wrapper JS/TS per SCORM 1.2/2004 (cmi.core.lesson_location, cmi.core.session_time), che puoi usare per salvare server‑side il punto di ripresa e i tempi.

EscolaLMS Scorm: API /api/admin/scorm/upload + /api/scorm/play/{uuid} con tracking progresso per utente tramite token; è già pensata per memorizzare lato server stato di fruizione.

H5P headless: API Laravel H5P di Escola memorizza contenuti e risultati, mentre lato React usi i componenti per riprendere uno stato; tutto via REST, non locale.

Area 2 — Sistema quiz e valutazione
Qui hai due strade: usare il sistema quiz integrato del LMS (Wellms/LearnHouse) + H5P, oppure integrare un quiz engine ad hoc.

2.1 Quiz dentro l’ecosistema LMS
EscolaLMS + H5P

URL:

H5P API: https://github.com/EscolaLMS/H5P

H5P player React: https://github.com/EscolaLMS/H5P-player

Licenze: API MIT, player MIT.

Stack: Laravel REST API + React components; contenuti H5P (quiz, interactive video, question sets).

Maturità: 26 stelle e 111 release per l’API con ultima a gennaio 2025; 19 release per il player con ultima a marzo 2024.

Cosa copre:

Question bank H5P con randomizzazione domande e risposte (tipi “Question Set”, “Single Choice Set”, ecc.), timer, feedback.

H5P Interactive Video ti permette quiz durante il video, perfetto per le verifiche di presenza e gli obblighi normativi su “partecipazione attiva”.

Tutto genera eventi xAPI che puoi salvare su LRS per audit (tentativi, tempo per domanda, esito).

LearnHouse

URL: https://github.com/learnhouse/learnhouse

Licenza: core sotto AGPLv3 (community), con estensioni enterprise per SCORM, multi‑tenancy avanzata, pagamenti.

Stack: FastAPI (Python) per backend, Next.js (React) frontend, PostgreSQL + Redis.

Maturità: v1.0 stabile con release maggio 2026, attivo sviluppo (features su monitoring, hosted video, tests).

Cosa copre:

Modello corsi/chapters/activities, incluse attività quiz e valutazioni, con REST API complete.

Endpoint per gestire tentativi, risultati e analytics (su Tinybird in cloud o self‑host).

Con H5P/LearnHouse puoi implementare:

Quiz obbligatori di fine modulo/corso: activity di tipo quiz bloccante, gating sul completamento modulo/corso prima di marcare completato il percorso.

Randomizzazione: H5P question sets supportano random order di domande e risposte; DidattiCloud ricorda che l’Accordo 2025 richiede estrazione casuale da banca dati per i test di apprendimento.

Log dettagliato: tutte le risposte, tempi e tentativi vanno su LRS/audit log per ispezioni.

2.2 Limite tentativi, cooldown, quiz inline
Queste logiche di business di solito non sono nel quiz engine ma nel backend:

Limite tentativi / cooldown

Learning Locker ed LRS in generale memorizzano ogni statement di quiz; puoi contare tentativi falliti e imporre via API un blocco del quiz per X ore (campo locked_until su enrollment), come richiesto da molte linee guida di formazione professionale.

Quiz a sorpresa durante il corso

Con H5P Interactive Video puoi definire “pauses” con domande; se l’utente non risponde, il video non riparte e puoi far scadere la sessione dopo N secondi.

Area 3 — Core LMS moderno e API‑first
3.1 Wellms (EscolaLMS)
URL: API https://github.com/EscolaLMS/API ; front demo https://github.com/EscolaLMS/Front ; installer https://github.com/EscolaLMS/Create-LMS-App.

Licenza: API Apache‑2.0; molti pacchetti MIT.

Stack: Laravel API stateless + React SPA front; multi‑modulo (courses, cart, reports, h5p, scorm, lrs).

Maturità: decine di pacchetti, centinaia di test, 189 release API fino a gennaio 2025, terraform per installazione one‑click su AWS ECS.

Cosa copre:

Struttura corsi/moduli/unità (Learning Objects) con tracciamento attività per utente.

Integrazione SCORM, H5P, LRS xAPI, report corsi, multi‑dominio (utile per white‑label B2B).

Perfettamente adatto a backend LMS headless che tu poi esponi via API al tuo frontend custom (Next.js o altro).

3.2 LearnHouse
URL: https://github.com/learnhouse/learnhouse

Licenza: AGPLv3 (core, free forever) + licenza enterprise per features avanzate (multi‑tenancy, pagamenti, SCORM).

Stack: FastAPI backend, Next.js frontend, Postgres, Redis, Docker, CLI per deploy self‑host.

Maturità: rilascio v1.0 maggio 2026, sviluppo attivo, orientato a “developer‑friendly” REST API per corsi, attività, utenti, enrollment.

Cosa copre:

Engine corsi/chapters/activities/api per enrollment, ruoli, analytics.

Multi‑tenant, pagamenti e SCORM però in versione Enterprise; da valutare vs requisiti budget/licenza.

Scelta pragmatica
Per un B2B italiano interoperante con SCORM/H5P/xAPI e forte focus compliance, Wellms/EscolaLMS ti dà più mattoncini riusabili out‑of‑the‑box (Scorm, LRS, H5P, reports) con licenze permissive.

Area 4 — Player video, sincronizzazione e controlli antifrode
Qui devi incollare insieme hosting video sicuro + player custom + integrazione con LMS/xAPI.

4.1 H5P Interactive Video + React
Il pacchetto H5P‑player espone componenti React headless per H5P player/editor, inclusi contenuti “Interactive Video”.

Puoi usare un video ospitato su Cloudflare Stream/Mux e far gestire ad H5P il layer di overlay (quiz, titoli, timeline), con callback xAPI per loggare ogni interazione sul tuo LRS.

Nelle demo Escola, il player lavora headless via REST con API Laravel (decoupling front/back) — esattamente il pattern che ti serve per una piattaforma custom.

4.2 Hosting video con controlli di accesso
Cloudflare Stream

Signed URL / token: puoi rendere un video privato e richiedere token firmati generati via API o Worker (/token endpoint). Il token scade dopo 1h–12h e può includere restrizioni (paese, download, scadenza).

Il player Cloudflare Stream può essere integrato in iframe o via manifest HLS/DASH con token, ideale per impedire share di link diretti.

Mux

Signed URLs con JWT per immagini, manifest e assets; puoi firmare URL con claims (exp, ip, ecc.) e usare signed_playback_id.

Supporto nativo per watermark/overlay su video tramite overlay_settings, utile per watermark dinamico con dati utente.

Bunny.net

Token Authentication: puoi firmare URL con token+expires, impedendo accesso senza firma; documentazione spiega come generare token per path/video.

4.3 Controlli antifrode lato player
Nessuno dei player OSS/servizi citati implementa nativamente logica normativa tipo “no fast‑forward su non visto + AFK detection”; devi costruirla tu sopra l’HTML5 player o vjs/ReactPlayer con:

Disabilitare fastSeek/scrub oltre il massimo timestamp “validato” (confronto con stato dal backend).

Sospendere riproduzione e timer su visibilitychange/blur prolungato.

Heartbeat ogni N secondi verso backend (come in Area 1), con incrocio su LRS/audit log.

Area 5 — Generazione e verifica certificati
5.1 Generazione PDF + QR
antoviaque/certificate‑generator

URL: https://github.com/antoviaque/certificate-generator

Licenza: AGPL‑3.0.

Stack: Python + librsvg; genera PDF da template SVG, con QR code embedded che punta a URL di verifica.

Maturità: 20 stelle, 12 fork, pensato specificamente per certificati studenti con QR di verifica.

Copre: generazione batch certificati da CSV + base URL; il QR contiene <base_url>/<short_name>.pdf dove pubblichi il certificato per verifica pubblica.

Muhammad‑Elgendi/QR‑certificate (Django)

URL: https://github.com/Muhammad-Elgendi/QR-certificate

Licenza: non indicata in snippet, ma repo OSS (da verificare prima dell’uso commerciale).

Stack: Django; gestisce certificati e pagine di verifica con QR.

Copre: CRUD certificati, generazione PDF, verifica via QR/URL univoco.

cbitosc/qr‑certificate‑generator (Next.js + FastAPI)

URL: https://github.com/cbitosc/qr-certificate-generator

Licenza: GPLv3.

Stack: frontend Next.js, backend FastAPI, generazione certificati da template con QR e hosting su GitHub Pages.

Copre: workflow completo per cert web‑verificabili; ottimo reference architetturale se vuoi rifarlo in chiave B2B.

5.2 Flusso certificato “auto‑generato / emissione manuale”
Generi automaticamente il certificato solo quando:

LRS/audit log mostra che tutte le lezioni raggiungono min_required_seconds,

quiz finali sopra soglia,

nessun tentativo AFK o bypass.

Mantieni lo stato “ready_for_review” e l’invio del certificato (email + download) avviene solo dopo approvazione manuale del responsabile formazione — requisito implicito in molte prassi italiane di formazione professionale.

Area 6 — Pagamenti e controllo accessi B2B
6.1 Starter kit Next.js + Stripe B2B
supastarter (Next.js + Stripe SaaS boilerplate)

URL: https://supastarter.dev/nextjs-stripe-boilerplate

Licenza: tipicamente commerciale/OSS (va verificata sul sito), ma usabile come reference.

Stack: Next.js full‑stack + Stripe, organizzazioni e multi‑tenancy built‑in.

Maturità: prodotto commerciale, ma guida con multi‑tenant, organizations e seat‑based billing.

Copre:

Organizzazioni e teams, ruoli e inviti.

Seat‑based billing out‑of‑the‑box, prezzi per team e gestione subscription.

nextacular

URL: https://github.com/nextacular/nextacular

Licenza: OSS (template pubblico).

Stack: Next.js multi‑tenant SaaS starter (auth, Stripe, ruoli, organizations).

Copre: multi‑tenancy, gestione teams, ruoli, billing, ottimo scheletro per portale aziendale admin + utenti.

mazzasaverio/nextjs‑saas‑starter

URL: https://github.com/mazzasaverio/nextjs-saas-starter

Licenza: OSS.

Stack: Next.js, Prisma, Stripe; gestisce abbonamenti, billing portal, webhook.

Copre: flusso completo Stripe (checkout, billing portal, webhook customer.subscription.updated/invoice.payment_succeeded per gestire accesso).

Per seat‑based billing:

Guidance Stripe: usa subscription.items[i].quantity per mappare numero di utenti sulle licenze; guide Laravel/Stripe e MakerKit mostrano come fare quantity = billableSeatCount e usare transform_quantity per scaglioni.

6.2 IVA italiana e fatturazione elettronica
Stripe indica che per account italiani, dal 1 luglio 2025 l’IVA sulle commissioni Stripe non è più addebitata automaticamente, quindi devi autogestire l’IVA in contabilità; questo non riguarda Stripe Tax ma incide sul calcolo totale di costi.

Per l’integrazione con SDI per fatturazione elettronica B2B/B2C in Italia, puoi usare:

OpenAPI SDI: servizio API (Apache 2.0) per invio/ricezione fatture elettroniche e conservazione legale, con endpoint documentati (invoicing, notifications, stats).

Invoicetronic Desk: app web open‑source white‑label per fatturazione elettronica italiana FatturaPA/SDI, pensata come frontend per una API (Invoicetronic), self‑hostabile via Docker.

Pattern: la tua piattaforma genera dati ordine/contratto → chiami servizio SDI per emissione fattura elettronica verso le aziende clienti.

Area 7 — Sicurezza piattaforma e protezione contenuti
7.1 Video e contenuti
Cloudflare Stream — Signed URL token, scadenza oraria, restrizioni geografiche e download; documentazione mostra uso di /token e Worker bindings per generare token firmati con claim custom (exp, geo, downloadable).

Mux — Signed URLs con JWT per playback, immagini e download, più gestione di chiavi di firma via API; guide su “secure video playback” mostrano pattern per proteggere contenuti HLS/DASH.

Bunny.net — Token Authentication con token+expires nei query param o path; ottimo per CDN/Video on‑demand, doc spiega come firmare URL per path specifici.

Watermark dinamico — Mux supporta overlay/watermark via overlay_settings su asset; puoi generare diverse versioni con watermark personalizzato (nome utente, email) per scoraggiare leak.

7.2 Sessioni sicure e anti‑condivisione account
redis‑jwt: gestisce JWT con stato appoggiato su Redis, supportando opzione multiple: false per consentire una sola sessione per utente; puoi salvare metadata (ip, device, headers) e invalidare sessioni.

redis‑sessions: session store avanzato per Node + Redis, con metodi per elencare e killare tutte le sessioni di un user ID (soid/killsoid), utile per enforcement su multi‑device.

Articoli su JWT+Redis illustrano pattern “sessione attiva” con chiave user_id + token_hash e TTL allineato all’exp del JWT, permettendo revoca immediata di sessioni e blocco su tentativi paralleli.

7.3 Audit log immodificabile
Event store append‑only con hash chaining (tipo EventSourcingDB) fornisce log immutabile; ogni evento contiene hash del precedente, così manipolazioni sono rilevabili via verifica della catena.

Articoli su event sourcing ricordano che un audit log strutturato può essere implementato anche senza full event sourcing, registrando comunque ogni mutazione in un log append‑only dedicato.

7.4 GDPR, data residency e autenticazione
Supabase offre progetti in regioni UE (Frankfurt eu-central-1, Londra eu-west-2) con database, auth e storage residenti in EU; esiste DPA firmabile anche su piani free, e le discussioni indicano che per progetti in regioni UE i dati restano in Europa.

Articoli su GDPR + Supabase sottolineano che, scegliendo regione EU per database, storage e auth, il requisito di data residency è soddisfatto, a patto di gestire correttamente diritto all’oblio/esportazione dati a livello applicativo.

Area 8 — Obblighi normativi piattaforme formazione professionale in Italia
Questa è la parte più critica: devi allineare la piattaforma sia all’Accordo Stato‑Regioni 17/04/2025 (formazione sicurezza D.Lgs. 81/08) sia alle prassi per corsi validi ai fini certificazioni ISO/auditor, oltre a GDPR e fatturazione elettronica.

8.1 Accordo Stato‑Regioni 2025 — requisiti tecnici piattaforma e‑learning
Fonti come DynDevice, QSM, DidattiCloud e Kattedra sintetizzano i requisiti tecnici del nuovo Accordo 2025 per corsi sulla sicurezza in e‑learning:

I punti chiave (Punto 3.3.2 e 3.3.4, Allegati tecnici) includono:

Tracciabilità completa

La piattaforma deve monitorare e certificare: svolgimento/completamento attività, tracciabilità di ogni attività svolta durante il collegamento, uso delle singole unità didattiche (Learning Objects), regolarità e progressività di utilizzo, modalità e superamento delle valutazioni intermedie/finali, partecipazione attiva.

Quiz obbligatori

Verifica di apprendimento strutturata obbligatoria per tutti i corsi, inclusi aggiornamenti; domande estratte casualmente da banca dati, soglia minima di superamento.

Requisiti per la piattaforma

Piattaforma certificata, con sistemi automatici di tracciamento, log completi e reportistica dettagliata su tempi, accessi, verifiche superate, tentativi.

E‑learning solo per moduli teorici/basso rischio

L’e‑learning è ammesso solo per parte generale lavoratori, parte specifica a basso rischio e corsi di aggiornamento; non per moduli ad alta criticità o esercitazioni pratiche.

Assistenza e tutoraggio

Obbligo di garantire supporto tecnico/didattico, tutor qualificati e figure di responsabilità didattica (DM 6 marzo 2013); la piattaforma deve consentire tali funzioni.

Traduzione tecnica per la tua piattaforma:

Devi avere log dettagliati per utente di: accessi, tempo di collegamento per modulo/Lezione, progressione LO, risultati quiz intermedi/finali, partecipazione a verifiche sincrone (se usi VCS).

Il motore di quiz deve supportare randomizzazione e soglie di superamento configurabili, con report di tentativi storicizzati.

Il motore di tracciamento (LRS + audit log) deve essere append‑only e consultabile dal cliente in caso di audit.

8.2 D.Lgs. 81/08 e norme pregresse
Articoli di commento all’accordo precedente ricordano che l’Allegato I poneva condizioni per e‑learning in termini di sede/strumentazione, riconoscimento lavoratore, tracciabilità attività, test di apprendimento, ecc. — principi ribaditi nel 2025, ma aggiornati.

8.3 ISO, certificazione auditor e corsi ISO
Per i corsi ISO (es. ISO 9001, 19011, 27001) non esiste un unico decreto nazionale: i requisiti dipendono dagli enti di certificazione (spesso accreditati ACCREDIA) e dagli schemi di certificazione (ISO/IEC 17024 per persone).

Le piattaforme italiane “certificate” per e‑learning ISO enfatizzano: tracciamento completo, procedure di qualità interne e talvolta certificazioni ISO proprie (es. ISO 9001 per il fornitore), ma non pubblicano dettagli tecnici open source.

8.4 GDPR e dati di formazione
Tratti dati personali e dati “sensibili” in senso esteso (ad es. formazione obbligatoria in materia sicurezza), quindi devi:

Assicurare data residency UE (vedi Supabase/DB sopra).

Implementare procedure per diritto di accesso/esportazione e cancellazione dati (a livello di DB e log).

Minimizzare dati nei log di tracking (es. pseudonimizzare ID corsista nei log “grezzi” e risalire via mapping interno).

8.5 Fatturazione elettronica B2B italiana
Dal punto di vista normativo, tutte le fatture B2B/B2C italiane devono transitare tramite SDI; puoi integrare una soluzione come OpenAPI SDI o Invoicetronic Desk per gestire emissione, firma e conservazione digitale via API.

Conclusione normativa:
La combinazione Wellms/EscolaLMS + H5P + Learning Locker LRS + Cloudflare Stream/Mux + soluzioni SDI ti permette di implementare tecnicamente i requisiti chiave dell’Accordo Stato‑Regioni 2025 (tracciabilità, quiz obbligatori, partecipazione attiva, reportistica) e di costruirti un dossier di conformità da presentare agli enti formatori / RSPP / organismi di certificazione.

Area 9 — BaaS e servizi gestiti
9.1 Autenticazione multi‑tenant
Supabase Auth

Pro:

Auth integrata con Postgres e Row‑Level Security; data residency in regioni EU (es. Frankfurt, Londra) per utenti, storage e auth.

Piano free con limiti generosi, DPA disponibile, SOC2 e focus su GDPR (con EU region).

Contro:

Niente concetto “organization” out‑of‑the‑box: va modellato tu a livello applicativo, ma è un pattern ben documentato.

Clerk

Pro:

Autenticazione B2B multi‑tenant nativa con Organizations, ruoli e RBAC, componenti React pronti, tutorial ufficiali per Next.js multi‑tenant.

Piano Pro attorno a 25 $/mese, con overage per MAU; piani Enterprise includono data residency EU e SAML SSO.

Contro:

Per avere data residency EU garantita e audit‑grade logs potresti dover salire a piano Enterprise custom.

Auth.js (NextAuth)

Pro:

OSS, self‑hosted, funziona bene con Next.js; guide e repo mostrano come implementare multi‑tenancy (subdomini/tenant param) con Prisma.

Contro:

Devi gestire tu sicurezza, scaling, data residency (ma è solo codice nel tuo stack).

Lucia/Auth0/PropelAuth

Auth0 ha supporto organizations e multi‑tenant con subdomini, ma modello pricing Enterprise; blog post mostrano pattern Next.js + Auth0 per B2B multi‑tenant.

Per un progetto self‑host europeo con forte controllo compliance, Supabase Auth + modello tenants custom o Auth.js + DB sono più trasparenti lato GDPR rispetto a provider SaaS esterni, salvo accordi Enterprise specifici.

9.2 Database con pgvector
Supabase Postgres: Postgres completamente gestito con supporto estensioni (incluso pgvector), regioni EU, backup in regione, RLS; free tier + piani Pro.

Neon: Postgres serverless con free tier e regioni EU (da verificare nel dettaglio); ottimo per scaling ma non fornisce auth/REST out‑of‑the‑box.

PlanetScale: DB orientato MySQL/Vitess; utile se resti in mondo MySQL, ma meno sinergico con stack Postgres/pgvector.

9.3 Job asincroni e workflow
Trigger.dev (cloud + OSS)

Free plan con ~20 concurrent runs e unlimited tasks, 1‑day log retention, ideale per orchestrare invio certificati, generazione PDF, invio email.

Pro ~50 $/mese per 200+ concurrent runs, 30‑day retention e Slack support.

Open source, self‑host su infrastruttura tua (puoi quindi garantirti EU data residency).

Inngest

Free tier con 50k executions, piani Pro ~75 $/mese per 1M executions, orientato a “durable functions”; cloud, non self‑hosted di default.

BullMQ

Libreria Node.js su Redis; consente progress tracking, stati job, code events; devi gestire tu hosting ma è OSS puro.

9.4 Hosting video
Cloudflare Stream — vedi Area 4: forte integrazione con signed URL e Workers, regioni EU disponibili.

Mux — forte API video streaming + analytics + signed URL + watermark.

Bunny.net — CDN e Video con token authentication, costi bassi, EU PoP.

9.5 Email transazionale
Resend

Free: 3.000 email transazionali/mese (max 100/giorno).

Pro: da 20 $/mese per 50.000 email, prezzo per 1.000 email aggiuntive ben documentato.

Marketing: free 1.000 contatti con invii illimitati, Pro Marketing da 40 $/mese per 5.000 contatti.

Non ha data residency EU nativa, quindi per casi GDPR “puri” meglio usare provider con data center UE dedicato.

Brevo (ex Sendinblue)

Piani business con data center UE, orientati a compliance GDPR, 100.000 email/mese ~129 $ con unlimited contacts.

Più adatto di Resend se vuoi che tutti i dati email restino in EU, ma integration DX meno “developer‑first”.

Area 10 — Riferimenti architetturali SaaS B2B completi
Oltre agli starter Stripe visti sopra:

nextacular — multi‑tenant SaaS starter completo con auth, ruoli, organisations, billing, multi‑tenant routing; ottimo blueprint per portale aziendale (tenant, admin, seats, ruoli).

supastarter — forte focus su Stripe subscription, organizations e seat‑based billing, più componenti UI per pricing/billing.

Multi‑Tenant‑SaaS‑Starter‑NestJS — backend NestJS orientato SaaS multi‑tenant; utile se vuoi back‑end Node separato da front.

ultimate‑backend — kit multi‑tenant microservice con CQRS, GraphQL, event sourcing; probabilmente overkill per MVP ma utile da studiare per pattern di multi‑tenancy ed event sourcing.

Matrice BaaS (scelta pragmatica per 500 utenti/mese)
Indicazioni molto sintetiche (numeri arrotondati, vanno riconfermati al momento del lancio):

Servizio	Uso	Free tier	Costo tipico 500 utenti/mese	EU/GDPR	Self‑host?
Supabase	DB, Auth, Storage	Free con Postgres, auth e storage limitati	Probabilmente coperto da free/low Pro se traffico basso; billing per risorse DB/edge	Region EU (Frankfurt, London), DPA, data at rest in EU region.
Sì, possibile self‑host Postgres + stack OSS, ma meno plug‑and‑play.
Clerk	Auth B2B multi‑tenant	Free fino a piccolo numero di MAU	Pro ~25 $/mese + overage MAU.
Data residency EU solo su Enterprise custom.
No (SaaS)
Cloudflare Stream	Video hosting	Non free totale, ma piano pay‑as‑you‑go con costi bassi GB/minuto	Per 500 utenti con poche ore/video, costo modesto mensile	CDN globale; per EU compliance devi documentare trasferimenti e usare SCC, ma puoi limitare accessi con signed URL.
No (SaaS)
Mux	Video + watermark	Trial + piani usage‑based	Dipende da GB/min, in genere comparabile a Stream	Data centers multipli, devi verificare opzioni EU‑only; supporto enterprise forte.
No
Trigger.dev	Workflow/job	Free con 20 concurrent runs e usage credit.
Pro 50 $/mese con 200+ concurrent runs, sufficiente per 500 utenti.
Cloud multi‑region; per EU‑only puoi self‑host (Apache 2.0).
Sì
Inngest	Durable functions	Free 50k executions.
Pro ~75 $/mese per 1M executions.
SaaS US‑centric, da valutare per GDPR; niente self‑host ufficiale.
No
Resend	Email TX/Marketing	Free 3.000 TX email/mese e 1.000 contatti marketing.
Pro 20 $/mese (50k TX), Marketing Pro 40 $/mese (5k contatti).
Data center non EU‑only; per GDPR “rigoroso” meglio provider EU.
No
Brevo	Email EU/GDPR	Free piccolo; Business 100k email ~129 $/mese.
Per 500 utenti e poche campagne bastano piani bassi	Data center UE e strumenti GDPR, orientato a scenari europei.
No
Raccomandazione architetturale complessiva (2–3 mesi, dev senior + AI)
Per ridurre al minimo codice custom e massimizzare compliance:

Backend LMS & tracking

Adotta Wellms/EscolaLMS come backend headless: API Laravel, moduli corsi, SCORM, H5P, LRS, reports.

Estendi con:

Modulo di audit log append‑only (eventi anche fuori da xAPI).

Regole business per tempo minimo per lezione, sequenziamento, single active session, AFK (lato backend con Redis e redis‑jwt/redis‑sessions).

LRS & compliance

Per audit “forte”, integra Learning Locker come LRS principale o usa LRS Escola se vuoi restare nel monosistema.

Progetta uno schema di statements xAPI specifico per: view segmenti video, quiz inline, quiz finali, certificati, in linea con requisiti Accordo 2025.

Frontend B2B multi‑tenant

Costruisci un frontend Next.js ispirandoti a nextacular e supastarter per multi‑tenancy, org, ruoli e billing.

Usa Auth.js + Supabase Auth (DB in region EU) per auth tenant‑aware, oppure Supabase Auth diretto se vuoi ridurre complessità.

Player video antifrode

Player React custom che embeda:

Video da Cloudflare Stream/Mux con signed URL.

Overlay H5P Interactive Video per quiz inline.

Implementa heartbeat, tracking focus, gestione AFK e gating di seek/avanzamento come logica custom integrata con API Wellms/LRS.

Quiz e valutazione

Usa H5P per quiz modulari e finali, con randomizzazione e timer, e gating nel backend.

Certificati

Backend worker (Trigger.dev/BullMQ) che, al soddisfacimento dei requisiti (tempo, quiz, audit), genera cert PDF via certificate-generator (o soluzione custom ispirata) con QR verso pagina pubblica di verifica.

Pagamenti & accessi B2B

Implementa Stripe subscription + seat‑based billing seguendo i pattern di supastarter/nextacular e le guide Stripe; quantity = numero posti assegnati dall’admin aziendale.

Integra SDI tramite OpenAPI o Invoicetronic per fatturazione elettronica B2B italiana.

Sicurezza & GDPR

DB e storage su Supabase EU, video su provider con documentazione chiara per compliance (Mux/Cloudflare + DPA + SCC dove necessario).

Sessioni con Redis + redis‑jwt in modalità single session per utente, log di audit append‑only e controlli IP/device se vuoi essere più restrittivo.

Con questo stack parti da motori LMS, quiz, LRS, billing e workflow già pronti e ti concentri quasi esclusivamente su: logica antifrode di fruizione, modellazione dei requisiti normativi italiani e UX B2B, che sono le parti dove ha senso investire il tuo tempo di creative technologist.

Preparato da Deep Research
e invece per quanto riguarda lo scorm, serve per questo progetto?in che modo, in che misurs?ci sono riferimenti opensource?
Completati 2 passaggi
Ti serve SCORM?
Per i corsi “seri” sulla sicurezza lavoro in e‑learning e per vendere a clienti italiani che conoscono la materia, SCORM di fatto è fortemente raccomandato (quasi obbligatorio); per corsi ISO generici o percorsi interni puoi anche basarti solo su un motore xAPI custom, purché garantisca lo stesso livello di tracciamento (“sistema equivalente”).

Quando SCORM è davvero necessario
Per la parte sicurezza lavoro (D.Lgs. 81/08 + Accordo Stato‑Regioni 2011/2016/2025):

Le linee guida serie citano esplicitamente che ogni corso/modulo deve essere realizzato in conformità allo standard SCORM o sistema equivalente, per garantire il tracciamento puntuale dei Learning Objects (LO) dentro la piattaforma LMS.

Esempio: Megaitalia e altri riepilogano che l’LMS deve poter monitorare completamento attività, partecipazione attiva, tracciabilità di ogni LO, progressione e superamento test, e che questo è garantito tipicamente tramite pacchetti SCORM.

Molte piattaforme italiane di sicurezza dichiarano esplicitamente “piattaforma certificata SCORM 2004” come requisito marketing e di conformità.

Per corsi ISO / auditor:

Non c’è un decreto che ti imponga SCORM, ma gli enti di certificazione e i formatori abituati a usare LMS vedono SCORM come lingua franca:

Riutilizzi contenuti prodotti in Storyline/Captivate,

Garantisci portabilità su altri LMS del cliente,

Dimostri aderenza a standard consolidati.

Conclusione pratica:

Se vuoi vendere anche corsi sulla sicurezza in modalità e‑learning asincrona: ti conviene avere SCORM pienamente supportato (o dimostrare in modo molto solido che il tuo sistema xAPI è “equivalente” in termini di tracciamento).

Se invece fai solo corsi ISO/auditor per uso interno o in nicchie non legate a sicurezza lavoro, potresti vivere anche solo con xAPI + LMS proprietario, usando SCORM solo per interoperabilità con contenuti terzi.

In che modo integrare SCORM nella tua architettura
Io lo vedrei così:

Motore principale = LMS + xAPI/audit custom

La logica critica (tempo minimo, AFK, quiz sorpresa, audit trail, certificati, multi‑tenant B2B) resta nel tuo dominio, con xAPI + event store.

SCORM come “contenitore interoperabile” opzionale

Quando hai un corso in SCORM (o vuoi soddisfare formalmente il requisito in ambito sicurezza), carichi il pacchetto e:

usi il runtime SCORM JS per parlare con il tuo LMS (API SCORM 1.2/2004),

mappi le chiamate SCORM (cmi.core.lesson_status, session_time, score) in eventi xAPI/audit interni.

Dove lo usi

Corsi di sicurezza lavoro, dove i clienti si aspettano SCORM.

Eventuali corsi forniti da terze parti in formato SCORM che vuoi erogare “as‑is” sulla tua piattaforma.

Se un ente di certificazione ti chiede prova che la piattaforma rispetta “moduli SCORM o sistema equivalente”, avere il supporto nativo ti evita discussioni.

Riferimenti open source SCORM utili
Moduli integrabili in un LMS moderno
EscolaLMS/Scorm (Laravel, Wellms)

URL: https://github.com/EscolaLMS/Scorm

Cosa fa:

Libreria per caricare, archiviare e agganciare pacchetti SCORM ai corsi in EscolaLMS/Wellms.

Espone API per upload ZIP, associazione a corsi, gestione libreria di pacchetti.

Stack/licenza: pacchetto Laravel, parte dell’ecosistema Wellms (Apache‑2.0/MIT).

Come ti serve:

Se usi Wellms come backend, hai già un modulo SCORM pronto che integra i pacchetti come lezioni o corsi interi, con tracking di completamento.

EscolaLMS/Scorm‑player

URL: https://github.com/EscolaLMS/Scorm-player

Cosa fa:

Player SCORM 1.2 semplice: carica pacchetti e traccia stato/progresso, con UI minima.

Puoi copiare la cartella public nel tuo progetto e integrarla nel tuo front React/Next.js come base del runtime SCORM.

Wrapper e demo runtime
gamestdio/scorm (JS/TS wrapper)

URL: https://github.com/gamestdio/scorm

Cosa fa:

Wrapper SCORM 1.2/2004 per JavaScript/TypeScript; implementa API LMS (Initialize, GetValue, SetValue, Commit, ecc.).

Come ti serve:

Da incollare nel tuo player React per emulare l’API LMS e convogliare gli eventi verso il tuo backend/xAPI.

SCORM‑LearningManagementSystem demo

URL: https://github.com/dhodges47/SCORM-LearningManagementSystem

Cosa fa:

Demo open source di LMS SCORM 1.2 (con qualche supporto 2004): upload pacchetti, player integrato, tracking risultati per studente.

Come ti serve:

Reference architetturale su come collegare upload pacchetto → runtime JS → salvataggio stati e report.

In sintesi per il tuo progetto
Sicurezza sul lavoro in e‑learning asincrona: sì, SCORM (o equivalente forte) ti serve per essere allineato alla prassi normativa italiana e alle aspettative dei clienti; io lo implementerei.

Corsi ISO/auditor puri: SCORM non è giuridicamente obbligatorio, ma utile per interoperabilità e per rassicurare i buyer enterprise.

Dal punto di vista tecnico, puoi:

usare EscolaLMS/Scorm + Scorm‑player se scegli Wellms come backend,

oppure integrare un wrapper tipo gamestdio/scorm nel tuo player custom e mappare verso il tuo LRS/xAPI.

Se mi dici che stack front/back vuoi usare (Laravel vs Node/Next pieno), posso suggerirti una configurazione SCORM più specifica (percorso minimo per essere “normativamente presentabile” senza appesantire tutto).

Preparato da Deep Research
quindi per il nostro progetto scorm piu lms sarebbe perfetto e scalabile e ci sono soluzioni opensource che possiamo prendere, riadattare e usare sneza pagare o citarli o chiedere licenza
Completati 2 passaggi
In termini tecnici/di prodotto sì: stack = LMS headless + supporto SCORM è una base perfetta e molto scalabile per il tuo caso d’uso.
Sul piano licenze, invece, non è vero che puoi “prendere, usare e non citare nessuno”: dipende moltissimo dal progetto e dalla licenza specifica.

1. Cosa puoi usare “liberamente” in SaaS commerciale
Per il tuo progetto il combo più “tranquillo” è:

EscolaLMS / Wellms (API + moduli SCORM/H5P)

EscolaLMS/API è sotto Apache‑2.0, licenza permissiva.

Il pacchetto EscolaLMS/Scorm è anch’esso Apache‑2.0.

Altri pacchetti (H5P, ecc.) sono MIT o Apache‑2.0.

Significa:

puoi usare, modificare e vendere il tuo SaaS commerciale,

non sei obbligato ad aprire il codice della tua piattaforma,

devi solo mantenere il copyright notice e il testo di licenza nei sorgenti / about (minima citazione).

Wrapper SCORM JS/TS tipo gamestdio/scorm (MIT)

gamestdio/scorm è su licenza MIT.

Puoi integrarlo nel tuo player React, modificarlo, redistribuirlo in un prodotto commerciale; l’unico vincolo è lasciare il header di copyright/licenza nei file.

Con questo stack (EscolaLMS + moduli SCORM + wrapper MIT) puoi costruire un SaaS B2B full‑commercial senza fee di licenza, con solo gli obblighi minimi di attribuzione tipici di MIT/Apache (notice nel codice, eventuale menzione in “Open Source Credits”).

2. Cosa NON puoi prendere senza pensare alla licenza
Altri mattoni che ti avevo citato sono molto più “forti” lato copyleft:

LearnHouse

Core piattaforma sotto AGPLv3.

AGPL significa che se usi/modifichi il codice per erogare un servizio via rete, hai l’obbligo di rendere disponibile il codice sorgente modificato agli utenti del servizio (non solo se distribuisci il binario).

Quindi non è adatto se vuoi tenere chiuso il tuo backend/feature set; va bene se abbracci consapevolmente modello open‑core.

Learning Locker (LRS)

È sotto GPL‑3.0.

GPL classica: se distribuisci una tua versione modificata, devi rilasciarla sotto GPL; se invece lo usi come servizio non modificato “dietro” il tuo SaaS, in pratica fai self‑hosting di un servizio separato e non sei costretto ad aprire il resto della tua app (ma ogni modifica fatta al LRS andrebbe condivisa secondo GPL).

In sintesi:

Non puoi prendere LearnHouse o Learning Locker, incorporarli nel tuo codice, chiuderli e “far finta che siano tuoi” senza rispettare AGPL/GPL.

Puoi però self‑hostarli come componenti separati (LRS, eventualmente LMS) e tenere il tuo frontend/ orchestrazione proprietari, seguendo le regole di quelle licenze.

3. Risposta diretta alla tua frase
“soluzioni opensource che possiamo prendere, riadattare e usare senza pagare o citarli o chiedere licenza”

Senza pagare: sì, ci sono (EscolaLMS, wrapper SCORM MIT, ecc.).

Senza citare / senza licenza: no.

Con MIT/Apache‑2.0 l’obbligo è minimo ma c’è: mantenere copyright/notice, non rimuovere la licenza, idealmente menzionare gli OSS usati.

Con GPL/AGPL gli obblighi sono molto più forti (rilascio sorgenti modificati, ecc.).

Se il tuo obiettivo è: SaaS B2B chiuso, white‑label, niente obbligo di aprire il codice, la combo più sicura è:

Backend LMS + SCORM: EscolaLMS (API Apache‑2.0) + moduli SCORM (Apache‑2.0).

Runtime SCORM sul player: wrapper MIT (gamestdio/scorm o derivati).

LRS:

se vuoi zero vincoli copyleft, meglio implementare un LRS minimal tuo o usare servizi terzi;

se accetti GPL lato LRS, puoi usare Learning Locker come componente separato ma non “rinominarlo” come codice proprietario.

Se vuoi, nel prossimo step posso proporti una “short‑list” di repo solo MIT/Apache (LMS+SCORM+quiz+auth) così hai un perimetro chiaro di ciò che puoi riusare senza finire in trappole AGPL/GPL.

Preparato da Deep Research
