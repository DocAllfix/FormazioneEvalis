deepresearch
Escludendo rigorosamente PHP/Ruby e tenendo conto di stelle, licenza e freschezza, non esistono oggi progetti che coprano tutto il tuo perimetro LMS+B2B+SCORM+xAPI+antifrode rispettando allo stesso tempo soglia 250★ e last commit <6 mesi; però ci sono alcuni mattoni molto validi (soprattutto per SaaS multi‑tenant, SCORM runtime e video player) che puoi combinare in un’architettura coerente.

Di seguito ti riassumo i migliori candidati per ciascuna ricerca, segnalo esplicitamente dove violano i tuoi vincoli (stelle/recency/licenza) e chi sceglierei come base o reference.

RICERCA 1 — LMS headless / API‑first moderni
Non ho trovato alcun LMS davvero headless/API‑first in stack moderno (Next/FastAPI/Node/TS) che superi 250★ e sia aggiornato negli ultimi 6 mesi. La nicchia è ancora dominata da monoliti tipo Next.js fullstack con Stripe/Clerk e modelli corsi abbastanza ben strutturati.

I tre progetti più utili come reference, pur non rispettando la soglia stelline, sono:

LMS Next.js moderni (monolite ma buon reference)
Repo	Stelle / ultimo commit	Licenza	Stack	Cosa copre nella tua architettura	Uso nel tuo prodotto
sonnysangha/lms-course-platform-saas-nextjs15-sanity-stripe-clerk-shadcn-typescript	118★, ultimo commit 6 feb 2025 (≈1 anno fa)
MIT
Next.js 15 + TypeScript, Sanity CMS, Clerk, Stripe, Tailwind, shadcn/ui
Piattaforma corsi completa: catalogo corsi, moduli/lezioni, tracking progress, video multipli (YouTube/Vimeo/Loom), pagamenti Stripe, dashboard studente e creatore, autenticazione SaaS‑like
Ottimo reference per modellazione corsi, flussi di vendita e struttura Next.js 15 “moderna”; non multi‑tenant né headless puro, ma combinato con un SaaS starter può fungere da “verticale LMS” da integrare
shounoop/learning-management-system	38★, repo attivo ma non aggiornato nel 2025–26 (ultimo snapshot 2023)
MIT
Next.js + React, Prisma (MySQL), Stripe, Clerk, Mux, Tailwind, Zod, UploadThing
LMS fullstack: creazione corsi, capitoli/lezioni, streaming video Mux, quiz/esami, tracking avanzamento, dashboard, pagamenti Stripe
Buon reference di “monolite e‑learning” in Next.js: da riusare come esempio per schema Prisma, flussi di iscrizione e tracking, ma non come base diretta di un prodotto B2B chiuso (poche stelle, monorepo consumer‑style)
almondkiruthu/lms	2★, attivo ma piccolo (2023)
MIT
Next.js + TypeScript, Prisma (MySQL), Clerk, Stripe, Mux, UploadThing
Feature simili a shounoop (corsi, capitoli, Mux, Stripe, Clerk) ma repo più minimale
Utile come reference ultra‑snello; non abbastanza maturo per riuso diretto
Miglior progetto per il tuo caso (RICERCA 1)
Come reference prenderei sonnysangha/lms-course-platform-…, perché è costruito già con Next.js 15, Sanity come CMS headless, Clerk e Stripe, quindi molto allineato ad un’architettura moderna dove tu puoi:

tenere Sanity (o un tuo backend) come sorgente headless dei corsi;

copiare pattern di strutturazione corsi/moduli/lezioni, progress tracking e pagamenti;

spostare la parte “multi‑tenant & account aziendali” su un SaaS starter più robusto (vedi RICERCA 5).

RICERCA 2 — SCORM runtime/player moderni JS/TS
Qui invece c’è un progetto che soddisfa stelle, licenza permissiva e stack moderno, anche se non è stato aggiornato negli ultimi 6 mesi.

Runtime SCORM JS/TS
Repo	Stelle / ultimo rilascio	Licenza	Stack	Cosa copre	Uso nel tuo prodotto
jcputney/scorm-again	273★, ultimo rilascio 2.6.5 il 20 giu 2025
MIT
TypeScript, pacchetto NPM, runtime browser e Node
Runtime moderno per AICC, SCORM 1.2 e SCORM 2004: implementa API LMSInitialize/GetValue/SetValue/Commit/Terminate, autocommit, commit via HTTP (lmsCommitUrl), supporto cross‑frame (API in parent, SCO in iframe sandbox), configurazione offline, event hooks (listener su LMSSetValue, ecc.)
È esattamente il layer runtime che ti serve: lo incapsuli in un componente React (es. <ScormRuntimeProvider>) che intercetta commit/status e li traduce in xAPI o in eventi personalizzati verso il backend
szenadam/scorm-api-wrapper	8★, update storico (non recente)
MIT
TypeScript, porting del pipwerks wrapper
Wrapper TypeScript della classica SCORM API wrapper di pipwerks; gestisce SCORM 1.2/2004 ma non offre tooling avanzato (offline, cross‑frame, ecc.)
Può servire come implementazione minimalista se vuoi un wrapper ultra‑semplice e typed; come maturità e feature è però inferiore a scorm-again
pipwerks/scorm-api-wrapper (solo snippet)	Storico, usatissimo ma con API legacy JS
JS wrapper con licenza MIT per la parte JS (il repo include anche altri file)
JavaScript puro (no TS), pensato per essere incluso direttamente nei corsi SCORM
Fornisce API di alto livello (SCORM.get/set/save) per SCORM 1.2/2004
Ottimo come reference storico e per comprendere pattern SCORM, ma oggi userei scorm-again come base
Miglior progetto per il tuo caso (RICERCA 2)
jcputney/scorm-again è il miglior candidato: soddisfa stelle≥250, licenza MIT, stack TypeScript, supporta SCORM 1.2 e 2004 e offre cross‑frame e hooks perfetti per mappare gli eventi verso il tuo backend o un LRS.

Per integrare in React:

crei un wrapper che inizializza Scorm12API o Scorm2004API e lo espone via context;

usi gli eventi (on("LMSSetValue.cmi.core.lesson_status", ...)) per tradurre in xAPI o in eventi interni;

configuri lmsCommitUrl verso un endpoint custom nel tuo backend LMS.

RICERCA 3 — xAPI e LRS moderni (self‑hosted, permissivi)
Qui il quadro è più deludente: ho trovato LRS open source noti, ma nessuno soddisfa al 100% tutti i tuoi vincoli (permissivo + moderno + attivo 2025/26 + Docker + 250★).

LRS xAPI open source rilevanti
Repo	Stelle / ultimo rilascio	Licenza	Stack	Cosa copre	Note per il tuo uso
adlnet/ADL_LRS	322★, ultimo rilascio xAPI 2.0 il 22 giu 2023
Apache‑2.0 (permissiva)
Python (84% codice) + JS, deployment via Docker/Docker Compose consigliato
LRS ufficiale ADL per xAPI (ora allineato allo standard IEEE 9274.1.1 / xAPI 2.0), progettato come proof‑of‑concept, scala limitata
È il miglior candidato come reference per modello dati, endpoints e semantica xAPI; non lo userei “as‑is” per un B2B multi‑tenant high‑volume ma puoi clonare struttura API, schema DB e configurarlo come servizio Docker separato
LearningLocker/learninglocker	561★, ultimo rilascio v7.1.1 nel 2021
GPL‑3.0 (non permissiva)
Node.js, LRS completo con UI e tanta storia
LRS xAPI molto maturo, ma codebase datata e licenza copyleft
Ottimo reference concettuale (come gestiscono statement, query, dashboard), ma non compatibile con l’uso come base per un prodotto chiuso; puoi solo studiarne l’architettura
ZanichelliEditore/LearningRecordStore-xapi	9★, ultimo commit 2020
MIT
PHP (Lumen/Laravel) + Docker + MySQL
LRS che riceve xAPI e le salva in S3, con workflow Docker, autenticazione, test, ecc.
Stack PHP (escluso dai tuoi vincoli) e poco mantenuto, ma è interessante come reference per un microservizio “gateway LRS” che valida statement e li invia a storage append‑only (S3 o DB)
webtech-uos/nodejs-lrs	9★, ultimo commit 2014
MIT
Node.js + CouchDB (CoffeeScript)
Implementazione LRS storica, ma totalmente obsoleta per stack e standard
Non consigliato come base né come reference se non per pura archeologia
Per la parte client (generazione statement xAPI via JS/TS), la libreria ancora rilevante è:

RusticiSoftware/TinCanJS – JS library per xAPI (Tin Can), installabile via npm come tincanjs, con API per creare/mandare statement verso un LRS.

Non ho però nel dump corrente stelle, licenza e last commit, quindi non posso tabellarla in modo completo.

Miglior progetto per il tuo caso (RICERCA 3)
Non c’è un LRS “chiavi in mano” moderno e permissivo che soddisfi i tuoi criteri di freschezza. Per me la strategia migliore è:

usare ADL_LRS come reference per schema statement, semantica delle API e comportamento, ma non come implementazione da scalare direttamente;

costruire un LRS minimalista custom (FastAPI + Postgres o Node/Express + Postgres) che espone /xapi/statements, persiste append‑only e indicizza per reporting, il tutto containerizzato;

lato client usare TinCanJS (o un wrapper tuo) per serializzare statement dallo SCORM/xAPI player verso questo microservizio.

RICERCA 4 — Player video React con controlli antifrode
Non ho trovato componenti React open source che implementino direttamente tutte le feature antifrode che chiedi (no seek avanti, pausa su cambio tab, heartbeat, quiz overlay) e che allo stesso tempo siano progetti indipendenti con 250★+.

In pratica, il pattern comune è: usare un player potente e molto usato, poi cucirci sopra la logica antifrode. Il candidato migliore qui è:

Player React general purpose
Repo	Stelle / ultimo rilascio	Licenza	Stack	Cosa copre	Uso nella tua architettura
cookpete/react-player	≈10k★, ultimo rilascio v3.3.3 il 19 set 2025
MIT
TypeScript 75%, JS 25%
Player React universale per URL (file, HLS, DASH, YouTube, Vimeo, Mux, ecc.), con un set ricco di callback (onProgress, onTimeUpdate, onPause, onSeeking, onSeeked, ecc.) e API statiche canPlay/addCustomPlayer
Lo userei come motore video sotto un tuo wrapper antifrode: controlli custom, blocco seek avanti, heartbeat periodico, overlay quiz via stato React e callback del player
Dalla documentazione/issue emerge che la community implementa il blocco del seek avanti tenendo traccia del massimo played raggiunto e forzando il player a tornare lì se l’utente cerca di spostarsi più avanti. Inoltre puoi ascoltare eventi di progress e usare document.visibilitychange per mettere in pausa in caso di perdita focus; un issue mostra anche come ReactPlayer reagisca al focus/tab change.

Come costruire il tuo “anti‑cheat player” sopra ReactPlayer

Mantieni in stato locale maxPlayedSeconds e currentPosition.

Su onProgress aggiorna maxPlayedSeconds e invia un heartbeat (POST /api/lessons/{id}/heartbeats) con timestamp, posizione e focus attivo.

Su onSeek/onSeeked se il nuovo time > maxPlayedSeconds + tolleranza, fai subito un seekTo(maxPlayedSeconds) (esattamente il pattern suggerito in una risposta StackOverflow).

Aggancia a document.visibilitychange e window.blur/focus per mettere in pausa e inviare eventi antifrode.

Inserisci overlay quiz come un layer sopra il player che blocca la riproduzione (non fai partire playing=true) finché la domanda non è stata risposta.

Miglior progetto per il tuo caso (RICERCA 4)
react-player è il candidato migliore: non fa antifrode da solo, ma la combinazione callbacks + flessibilità + larga adozione ti permette di implementare tutte le regole di visione obbligata con poco codice custom e zero lock‑in tecnologico.

RICERCA 5 — Starter kit SaaS B2B multi‑tenant moderni
Qui finalmente c’è un progetto molto solido che soddisfa stelle, licenza e stack, anche se l’ultimo commit è appena oltre la soglia 6 mesi.

Starter SaaS multi‑tenant
Repo	Stelle / ultimo commit	Licenza	Stack	Cosa copre	Uso nella tua piattaforma
nextjs/saas-starter	15.8k★, ultimo commit 11 dic 2025 (Next 15.6.0 canary fix)
MIT
Next.js + TypeScript, Postgres, Drizzle ORM, Stripe, shadcn/ui
Template ufficiale Next.js per SaaS: landing + pricing, autenticazione email/password con JWT in cookie, Stripe Checkout + Customer Portal, CRUD utenti/team, RBAC Owner/Member, activity logging, middleware per proteggere routes e Server Actions
Perfetto come spina dorsale B2B multi‑tenant: modelli organizzazioni/team, ruoli per tenant, autenticazione e integrazione Stripe già presenti; ci innesti sopra i moduli LMS, SCORM, antifrode e certificati
juliusjoska/nextjs-saas-starter	0★, ultimo commit 26 mar 2026
MIT
Next.js 16 App Router, TypeScript, Supabase (auth+DB), Stripe, Tailwind, shadcn/ui, Docker multi‑stage
SaaS starter multi‑tenant con workspace/organization, Supabase RLS, Stripe subscriptions, Dockerfile + docker‑compose per deploy containerizzato
Non soddisfa la soglia stelle, ma architettonicamente è molto vicino a quello che vuoi (multi‑tenant + Docker già pronto); da considerare come reference soprattutto se vuoi Supabase invece di Postgres “raw”
archita34/SaaSify	0★, primo commit maggio 2026
(licenza non specificata nel dump)	React 18 + Vite (frontend) + Node/Express + Prisma + SQLite/Postgres, JWT auth, Stripe, Resend mail
Boilerplate multi‑tenant con workspace/team, inviti, RBAC, Stripe billing, admin dashboard e notifiche email
Buon esempio di implementazione multi‑tenant fullstack, ma non lo userei come base: poche stelle, stack meno standard per te rispetto a Next.js App Router
Miglior progetto per il tuo caso (RICERCA 5)
nextjs/saas-starter è nettamente il miglior candidato: ufficiale, MIT, molto usato, già allineato con Stripe, RBAC e team/organizations.

Per il tuo LMS B2B:

lo usi come layer “tenant management + billing”;

aggiungi tabelle/relations per courses, modules, lessons, enrollments, sempre scoping per teamId/organizationId;

lasci a Stripe/Next.js starter la gestione subscription/seat‑based e ti concentri sul dominio formativo.

RICERCA 6 — Generazione certificati PDF verificabili
Non ho trovato soluzioni con 250★+, ma ci sono due progetti che coprono bene i pezzi funzionali che ti servono:

Certificati con QR e PDF
Repo	Stelle / ultimo update	Licenza	Stack	Cosa copre	Uso nel tuo sistema
cbitosc/qr-certificate-generator	6★, repo attivo (ultimo commit 2024)
GPL‑3.0 (copyleft)
Next.js (frontend, TypeScript 80%) + FastAPI (backend Python), integrazione GitHub Pages
Webapp per generare certificati verificabili: upload template (PNG/JPG→SVG), import Excel, generazione certificati con QR, output statico in /docs con pagine di verifica, integrazione GitHub Pages
Ottimo reference di workflow end‑to‑end (template, link firma/QR, pagina pubblica di verifica). Licenza GPL ti impedisce di usarlo come base in un prodotto chiuso, ma puoi replicarne l’idea in stack tuo (FastAPI o Node)
Short-io/qreator	27★, ultimo rilascio v9.7.1 l’11 mar 2025
MIT
TypeScript (94%), libreria Node/browser per generare QR in PNG/SVG/PDF
Libreria per generare QR in vari formati, con opzioni per logo, colore, margini, border radius, ecc.; supporta output PDF con QR integrato
Perfetta come motore QR in un tuo servizio di generazione certificati Node: generi il QR come layer e poi componi il certificato (es. tipicamente via libreria PDF Node)
Miglior progetto per il tuo caso (RICERCA 6)

Come idea di workflow (template + Excel + pagine di verifica + QR verso URL pubblico) il migliore è qr-certificate-generator, ma solo come reference dato il vincolo GPL.

Come componente riusabile sceglierei qreator (MIT, TS, generazione QR anche in PDF) da integrare in un microservizio Node per certificati; il resto (template PDF, campi dinamici, firma digitale) lo costruisci tu sfruttando librerie PDF di tua scelta.

RICERCA 7 — Implementazioni complete tipo Teachable/Thinkific
Nel mondo JS moderno non c’è ancora un vero clone open source di Teachable/Thinkific con tutte le funzioni (marketplace, pagamenti, tracking, certificati) e 250★+. I progetti più vicini sono gli stessi LMS Next.js già citati:

Piattaforme corsi “complete” (ma non multi‑tenant B2B)
Repo	Ruolo	Cosa copre	Limiti rispetto al tuo target
sonnysangha/lms-course-platform-saas-nextjs15-sanity-stripe-clerk-shadcn-typescript	Piattaforma corsi moderna in stile “course marketplace”
CorsI pagabili via Stripe, autenticazione, CMS headless Sanity, tracking progress, dashboard, video player multipli
Nessun SCORM/xAPI, niente LRS, multi‑tenant solo lato utenti/creatori non B2B, assenza di antifrode spinta e certificati
shounoop/learning-management-system	LMS fullstack Next.js con creazione corsi, quiz, Stripe, Mux
Flusso end‑to‑end: creazione corso, iscrizione, fruizione video, quiz, pagamenti e dashboard
Non multi‑tenant B2B, niente SCORM/xAPI, tracking antifrode basic, niente certificati PDF
almondkiruthu/lms	Variante minimale dello stesso pattern Next.js LMS
Piattaforma corsi con Stripe, Mux, Clerk, reordering lezioni, tracking progress
Stessi limiti: consumer‑oriented, non B2B multi‑tenant, nessuna integrazione SCORM/xAPI/certificati
Miglior progetto per il tuo caso (RICERCA 7)
Come esempio di “come mettere insieme player+tracking+pagamenti in un flusso coeso” il più interessante resta ancora sonnysangha/lms-course-platform-…; lo userei come blueprint per:

flussi di acquisto, arruolamento al corso, gating delle lezioni;

modellazione dell’esperienza studente (pagina corso, pagina lezione, avanzamento).

Riepilogo scelte migliori per ciascuna ricerca
R1 (LMS headless/API‑first): nessun headless puro maturo; miglior reference: sonnysangha/lms-course-platform-… + shounoop/learning-management-system per patterns di corsi/lezioni/progress.

R2 (SCORM runtime): jcputney/scorm-again come runtime SCORM 1.2/2004 TS moderno.

R3 (xAPI/LRS): nessun LRS perfetto; miglior reference permissivo: adlnet/ADL_LRS (Python, Apache‑2.0) come guida per schema xAPI e API, ma da replicare con un microservizio tuo.

R4 (video player antifrode): cookpete/react-player come motore video su cui implementare tutta la logica antifrode custom.

R5 (SaaS multi‑tenant): nextjs/saas-starter come base per auth/team/Stripe/RBAC multi‑tenant.

R6 (certificati): workflow di riferimento da cbitosc/qr-certificate-generator (solo come idee, GPL‑3) + libreria QR Short-io/qreator (MIT) per generare QR in PDF in un servizio Node personalizzato.

R7 (implementazioni complete): nessun “Teachable clone” moderno maturo; di nuovo sonnysangha/lms-course-platform-… come riferimento più avanzato per esperienza utente end‑to‑end.

Raccomandazione architetturale finale (stack coerente 2–3 mesi dev solo)
Dato il quadro sopra, il modo più solido (e realistico in 2–3 mesi per un senior + AI assistant) è comporre una piattaforma modulare piuttosto che cercare un monolite già pronto. Una possibile architettura:

1. Spina dorsale SaaS multi‑tenant
Base: fork di nextjs/saas-starter.

Responsabilità:

gestione organizzazioni/tenant (teams) e ruoli (Owner, Admin, Member);

autenticazione, inviti, dashboard amministratore per tenant;

Stripe Checkout + Customer Portal per subscription/seat‑based billing.

Estensioni:

estendere il modello team → Company per clienti B2B;

aggiungere concetto di “seat” legato a utente+corso (per vendere bundle di utenti).

2. Dominio LMS interno al monorepo Next.js
Prendere come reference i modelli di sonnysangha/lms-course-platform-… e shounoop/learning-management-system per tabelle Course, Module, Lesson, Enrollment, Progress.

Implementare API/Server Actions interne (Next App Router) che espongano il dominio anche in chiave headless (es. /api/tenant/{id}/courses, /api/enrollments), in modo da poter cambiare frontend in futuro.

Tenere tutto multi‑tenant usando gli ID team/organization del SaaS starter come foreign key.

3. Modulo SCORM + xAPI
Frontend:

integrare scorm-again in un componente <ScormPlayer> React, che carica il pacchetto SCORM in iframe e espone progress/stato al parent tramite gli eventi di scorm-again.

per pacchetti SCORM 1.2/2004 usi Scorm12API/Scorm2004API con lmsCommitUrl puntato ad un endpoint backend tuo.

Backend:

endpoint /api/scorm/commit che riceve i commit da scorm-again (JSON flatten o nested, a seconda della configurazione) e li:

mappa su CourseCompletion/LessonStatus nel DB LMS,

opzionalmente li trasforma in statement xAPI (verb: completed, object: lesson, result.score, ecc.) e li inoltra al microservizio LRS.

LRS:

implementare un microservizio lrs-service (FastAPI o Node) ispirato ad ADL_LRS: endpoint /xapi/statements con auth, storage append‑only in Postgres, query base per reporting e audit.

4. Video player antifrode
Costruire <SecureVideoPlayer> sopra react-player con:

stato maxWatched, currentTime, isFocused;

blocco seek avanti usando strategia descritta nelle issue/risposte community (redirect al massimo tempo visto se l’utente spinge oltre).

listener visibilitychange/blur per pausa automatica e log evento “lost focus”;

heartbeat via onProgress ogni X secondi con POST a /api/lessons/{id}/heartbeat salvato nel DB per audit;

interfaccia per overlay quiz (prop onQuizTrigger e stato isQuizBlocking).

5. Certificati PDF verificabili
Servizio Certificates (Node microservice o modulo interno Next.js):

modelli CertificateTemplate, CertificateInstance, VerificationToken;

generazione QR via qreator verso URL pubblico https://lms.it/certificates/{token}.

composizione PDF certificate + QR e dati utente (nome, corso, ore, esito) usando una libreria PDF Node.

Flusso:

quando un utente completa un corso (verificato da SCORM/xAPI + antifrode video), generi una CertificateInstance con token unico e PDF;

l’endpoint pubblico GET /certificates/{token} mostra dati e stato “valido/revocato” (utile per audit ISO);

opzionale: firma digitale del PDF e log in LRS di un statement certified.

6. Packaging e deploy (per stare nei 2–3 mesi)
Monorepo con:

apps/web → Next.js (basato su nextjs/saas-starter);

services/lrs → microservizio xAPI minimal (FastAPI/Node);

services/certificates → microservizio Node per PDF+QR (se non lo integri direttamente in Next).

Docker:

Next.js già deployabile via Vercel/containers;

LRS e Certificates con Dockerfile semplici;

docker-compose per ambiente dev locale.

Con questa combinazione:

Riusi molto codice maturo (SaaS, SCORM runtime, player video, libreria QR);

Limiti i pezzi “from scratch” a quelli davvero differenzianti per il tuo prodotto (logiche antifrode, integrazione ISO/sicurezza, certificati, audit trail);

Resti tranquillamente nel range 2–3 mesi per un senior che lavora focalizzato con supporto di un assistant tipo Claude Code, perché ogni blocco è relativamente circoscritto e supportato da reference concreti.

Preparato da Deep Research

research normale
Ho trovato alcuni candidati solidi, ma con i vincoli che hai imposto il panorama è molto più stretto di quanto sembri: su GitHub esistono pochi progetti LMS moderni, con stack recente, almeno 250 stelle, aggiornati negli ultimi 6 mesi e con licenza permissiva; in particolare, per LMS e SCORM molte opzioni attive usano licenze copyleft oppure non raggiungono la soglia di maturità che chiedi.

LMS moderni
Il candidato più evidente è LearnHouse, che ha architettura moderna, stack separato frontend/backend, supporto multi-organizzazione, progress tracking e self-hosting via Docker, quindi copre buona parte del core LMS/headless che ti serve. Tuttavia è rilasciato in AGPL-3.0, quindi è ottimo come riferimento tecnico e architetturale, ma non è una base tranquilla da derivare direttamente per un prodotto commerciale chiuso.

Progetto	GitHub	Stelle	Ultimo update	Licenza	Stack	Copertura architettura	Uso per prodotto chiuso
LearnHouse	
github.com/learnhouse/learnhouse
1.1k+ 
31 mag 2026 
AGPL-3.0 
Next.js 14, React, Tailwind, Radix UI, FastAPI, PostgreSQL, Redis, Docker 
Corsi a moduli/blocchi, video/PDF, quiz, progress, gruppi, multi-organization, API-oriented, self-hosting 
Riferimento sì, base diretta no per via di AGPL 
CourseLit	github.com/codelitdev/courselit	801 
25 mag 2025 
non verificata qui con evidenza sufficiente 
TypeScript-based secondo topic listing 
Più vicino a Teachable/creator platform che a LMS B2B compliance 
Solo riferimento parziale; non abbastanza verificato con i vincoli correnti 
Per il tuo caso specifico, il migliore come riferimento LMS è LearnHouse, perché mostra codice reale con separazione moderna, supporto multi-organizzazione e deployment self-hosted già presenti. Non lo userei come fondazione di un prodotto proprietario chiuso, ma lo userei come blueprint per modellare course graph, progress model e organizzazione multi-tenant.

SCORM e xAPI
Sul lato SCORM, il progetto più utile e pulito che emerge è @gamestdio/scorm, un wrapper JavaScript/TypeScript per SCORM 1.2 e 2004 con licenza MIT, pensato proprio per ambienti moderni. È però una libreria piccola, con maturità comunitaria limitata rispetto a quella che chiedi, quindi va considerata come componente integrabile, non come soluzione completa di runtime/player/LMS.

Per xAPI/LRS, nella ricerca emersa qui non compare un LRS moderno con tutte le tue soglie già verificate e con licenza permissiva abbastanza chiaramente documentata nei risultati ottenuti. I risultati disponibili mostrano implementazioni Node storiche o locali con poche stelle, quindi al momento non ho un candidato che rispetti insieme modernità, attività recente, soglia stelle e licenza permissiva verificata.

Progetto	GitHub	Stelle	Ultimo update	Licenza	Stack	Copertura architettura	Uso per prodotto chiuso
@gamestdio/scorm	
github.com/gamestdio/scorm
37 
non chiaramente esposta nei risultati recuperati 
MIT 
JavaScript / TypeScript 
Wrapper API SCORM 1.2/2004 lato client, integrabile in player React custom 
Sì come libreria embedded, no come soluzione end-to-end 
szenadam/scorm-api-wrapper	
github.com/szenadam/scorm-api-wrapper
8 
non verificata qui	MIT 
TypeScript 
Wrapper alternativo minimale	Solo riferimento, troppo piccolo 
webtech-uos/nodejs-lrs	
github.com/webtech-uos/nodejs-lrs
9 
progetto storico, pubblicato 2013 
MIT 
Node.js 
LRS xAPI concettuale	Non adatto come base moderna 
Per questa sezione, il migliore per il tuo uso immediato è @gamestdio/scorm come layer SCORM client-side dentro un player React custom. Per l’LRS xAPI, con i dati raccolti qui non c’è ancora un vincitore credibile che rispetti tutti i filtri che hai imposto.

Video antifrode e SaaS multi-tenant
Per il player video antifrode, i risultati recuperati mostrano librerie utili per progress tracking ma non un player React già pronto con enforcement completo di no-seek-forward, focus loss pause, heartbeat firmato e quiz overlay integrati. In pratica, oggi GitHub offre mattoni riusabili più che una soluzione chiusa pronta: dovrai quasi certamente costruire un player custom sopra React e video.js o wrapper analoghi, applicando tu la logica antifrode lato app e backend.

Per la parte B2B multi-tenant, il repository più convincente emerso nei risultati è mickasmt/next-saas-stripe-starter, descritto come starter Next.js 14 con ruoli utente, admin panel, Prisma, Auth.js v5, Stripe, Neon e shadcn/ui. Anche juliusjoska/nextjs-saas-starter appare promettente con workspace/org architecture e Stripe, ma nei risultati qui non ho abbastanza evidenza su stelle, licenza e manutenzione per classificarlo con la stessa sicurezza.

Progetto	GitHub	Stelle	Ultimo update	Licenza	Stack	Copertura architettura	Uso per prodotto chiuso
mickasmt/next-saas-stripe-starter	
github.com/mickasmt/next-saas-stripe-starter
2.8k circa 
repo attivo; release citata 26 giu 2024 
MIT secondo fonte secondaria recuperata 
Next.js 14, TypeScript, Prisma, Neon, Auth.js v5, Stripe, Resend, shadcn/ui 
Organizations/users, ruoli, admin, billing Stripe, base SaaS B2B 
Ottimo come base diretta per tenancy e billing 
juliusjoska/nextjs-saas-starter	
github.com/juliusjoska/nextjs-saas-starter
non verificato nei risultati 
2026 
non verificata qui	Next.js 16, Supabase, Stripe, shadcn/ui 
Workspace/org multi-tenant, billing, auth 
Riferimento interessante, ma da verificare meglio 
stack-auth/multi-tenant-starter-template	
github.com/stack-auth/multi-tenant-starter-template
non verificato nei risultati 
2024 
non verificata qui	Next.js, modular starter 
tenancy minimale	Solo reference, troppo incompleto 
Per tenancy e billing, il migliore per il tuo caso è next-saas-stripe-starter di mickasmt, perché è vicino al problema reale enterprise: auth, ruoli, pannello admin e Stripe sono già pensati come superfici di prodotto, non come demo accademica.

Certificati e sistemi completi
Nei risultati ottenuti qui non emerge ancora un progetto open source forte e già validato per certificati PDF verificabili end-to-end con QR pubblico, seriale univoco e workflow completo. Questo vuol dire che, realisticamente, la generazione certificati va progettata come microservizio dedicato in Node.js o Python, non affidata a un singolo progetto maturo individuato in questa tranche di ricerca.

Allo stesso modo, non è emerso un clone moderno “all-in-one” tipo Thinkific/Teachable che soddisfi insieme stack moderno, permissive license, 250+ stelle, aggiornamento recente e copertura completa di pagamenti + accesso + tracking + certificati. Questo rafforza una conclusione pratica: per il tuo prodotto non conviene inseguire un monolite perfetto che quasi non esiste; conviene comporre 3-5 blocchi moderni ben separati.

Architettura consigliata
Per un singolo sviluppatore senior con Claude Code in 2-3 mesi, la strada più realistica è: base SaaS multi-tenant in Next.js, LMS custom leggero ispirato a LearnHouse, player React custom con wrapper SCORM, e backend eventi/audit separato. In concreto, la combinazione più coerente è: tenancy/billing da next-saas-stripe-starter, modello LMS e concetti course/progress/multi-org da LearnHouse, integrazione SCORM client-side con @gamestdio/scorm, e un tuo event store append-only per audit, invece di dipendere da un LRS open source debole o obsoleto.

Stack raccomandato:

Frontend/app shell: Next.js + TypeScript + shadcn/ui, partendo da next-saas-stripe-starter.

Backend core: API route/Server Actions per tenancy e admin, più servizio Python/FastAPI separato solo se vuoi un dominio LMS/eventi più pulito, prendendo ispirazione strutturale da LearnHouse.

Player: React custom con video.js o player HTML5, callback granulari, pause on blur, anti-seek applicato via progress ledger server-side, heartbeat firmati ogni 10-15 secondi; SCORM 1.2/2004 bridged con @gamestdio/scorm.

Persistence: Postgres per utenti, org, enrollments, progress snapshots, certificati; tabella append-only separata per eventi di fruizione e audit.

Certificati: microservizio Node/Python che genera PDF con seriale, hash, QR e pagina pubblica di verifica; questo pezzo è meglio costruirlo su misura.

Deployment: Docker Compose in dev, poi frontend su Vercel o self-host, backend e Postgres su VPS/container dedicati; LearnHouse conferma che la combinazione Docker + Postgres + Redis è sensata per questo dominio.

La scelta migliore non è prendere un LMS open source e adattarlo brutalmente. La scelta migliore è usare uno starter SaaS moderno come fondazione commerciale, poi copiare solo i pattern giusti dai pochi LMS moderni esistenti, soprattutto LearnHouse, e costruire internamente i moduli critici di compliance: tracciamento antifrode, evidenza di fruizione e certificazione verificabile.

Vuoi che nel prossimo passaggio ti prepari una shortlist operativa di 10 repository finali, già ripulita e ordinata per priorità di adozione, con una proposta di repository-per-modulo e una roadmap build di 8 settimane?

Follow-up

Blueprint architetturale: LMS multi-tenant per ISO/sicurezza — stack tecnologico, isolamento tenant e conformità certificativa
Computer
​

Confronto build vs buy: LMS open-source (LearnHouse/CourseLit) vs framework headless (Payload/Strapi) per i tuoi requisiti B2B
Computer
​

Differenze architetturali tra LMS multi-tenant e single-tenant

Standard SCORM e xAPI nell'e-learning professionale

Best practice per gestione certificati ISO e audit log in LMS
