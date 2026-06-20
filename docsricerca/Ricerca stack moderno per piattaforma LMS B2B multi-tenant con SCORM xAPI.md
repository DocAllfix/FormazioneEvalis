# Ricerca stack moderno per piattaforma LMS B2B multi-tenant con SCORM/xAPI

## Executive summary

Questa ricerca mappa progetti open source moderni (2023–2026) realmente mantenuti, con codice accessibile e stack compatibile (React/Next.js, TypeScript, Node.js/FastAPI, servizi headless) da usare come base architetturale per una piattaforma LMS B2B multi‑tenant con SCORM/xAPI, antifrode video, pagamenti e certificati verificabili.  Sono stati esclusi progetti principali in PHP/Ruby per la parte "core" LMS, ma viene citato Wellms/EscolaLMS solo come reference architetturale, perché pur essendo backend Laravel offre un ecosistema headless estremamente maturo.  Per ogni area (LMS headless, SCORM runtime, LRS, video player antifrode, SaaS starter, certificati, piattaforme corso complete) vengono selezionati pochi progetti chiave, con informazioni su licenza, stack, stelle GitHub, ultimo commit e ruolo potenziale nella tua architettura.[^1][^2][^3][^4]

***

## Ricerca 1 — LMS headless / API‑first moderni

### CourseLit (LMS completo tipo Teachable)

| Campo | Valore |
| --- | --- |
| Repo | https://github.com/codelitdev/courselit |
| Stelle | 958 circa (v0.61.4)|
| Ultimo rilascio | v0.61.4 – 3 agosto 2025 |
| Licenza | AGPL‑3.0 |
| Stack | Monorepo TypeScript, frontend Next.js/React, backend Node.js con MongoDB/Mongoose, Stripe per i pagamenti, architettura modulare multi‑site |

CourseLit è un LMS completo “batteries‑included” pensato come alternativa open source a Teachable/Thinkific/Podia, con authoring corsi, gestione studenti, pagamenti Stripe, pagine marketing, analytics e blog.  Il progetto è attivo, con release nel 2025 e un numero di stelle significativo, segno di community viva e codice reale in produzione.  L’architettura è tradizionale (non formalmente headless) ma separa bene API e frontend, e può essere usata come reference per:[^5][^1]

- Modello dati di corsi, lezioni, bundle, piani pricing.
- Integrazione Stripe per corso/sottoscrizione e gestione checkout.
- Flussi di onboarding utente, checkout, accesso ai corsi.

**Uso consigliato**: fortissimo come base o reference per la parte "marketplace corsi + pagamenti + access control"; meno adatto se vuoi un vero headless + multi‑tenant B2B by design, e la licenza AGPL è virale quindi non ideale se vuoi tenere chiuso il tuo SaaS.

### LMS FastAPI + React (awais7012/lms‑2)

| Campo | Valore |
| --- | --- |
| Repo | https://github.com/awais7012/lms-2 |
| Stelle | 4 |
| Ultimo commit | 2024–2025 (repo attiva, nessun tag release) |
| Licenza | MIT |
| Stack | Backend FastAPI (Python 3.9+, MongoDB, JWT), frontend React (SPA), Docker per deploy |

Questo progetto implementa un LMS classico con ruoli Admin/Teacher/Student, gestione corsi, assignment, attendance, grading, reportistica e generazione certificati.  Il backend è un’API moderna FastAPI con MongoDB e JWT, il frontend è React puro, separato e quindi facilmente sostituibile o integrabile in un tuo Next.js frontend.  Non espone nativamente multi‑tenant B2B, ma l’architettura a servizi separati e la licenza MIT lo rendono un’ottima base di partenza per:[^6]

- API per corsi, iscrizioni, progressi utenti.
- Modello dati per corsi strutturati, assignment, attendance.
- Pattern di integrazione FastAPI + React che puoi rimpiazzare con Next.js app‑router.

**Uso consigliato**: buona base per la parte "LMS core" se vuoi restare su Python/FastAPI; multi‑tenant va progettato ex‑novo (organizzazioni, tenant‑id in tutte le entità, Row Level Security se passi a Postgres).

### Wellms / EscolaLMS — headless LMS (reference architetturale)

| Campo | Valore |
| --- | --- |
| Org | https://github.com/EscolaLMS |
| Core API | https://github.com/EscolaLMS/API |
| Front demo | https://github.com/EscolaLMS/Front |
| Stelle API | 12 |
| Ultimo rilascio API | 1.0.10 – 24 gennaio 2025 |
| Licenza API | Apache‑2.0 |
| Stack | Backend Laravel REST API headless, numerosi pacchetti per Courses, Reports, Payments, H5P, SCORM; frontend demo React SPA, ecosistema modulare |

Wellms si presenta come "world's first headless LMS" con backend REST API Laravel e frontends React, admin e vari pacchetti (Courses, Reports, H5P, Payments…).  Dal punto di vista dei tuoi vincoli, la parte core è in PHP e quindi non la useresti direttamente, ma è un reference di alto livello su:[^3][^4]

- Come modellare un LMS headless con plugin SCORM, H5P, Reports, Payments.
- Come esporre API per corsi, iscrizioni, progressi, reportistica.
- Come strutturare moduli separati (Courses, Reports, H5P, Payments) integrati via API.

**Uso consigliato**: reference concettuale e per idee su design di API e pacchetti (soprattutto Reports e H5P headless), non come base di codice core per via di PHP.

### nextjs/saas‑starter (multi‑tenant SaaS base, non LMS‑specifico)

| Campo | Valore |
| --- | --- |
| Repo | https://github.com/nextjs/saas-starter |
| Stelle | ~15.8k |
| Ultimo commit | 11 dicembre 2025 |
| Licenza | MIT |
| Stack | Next.js 15, TypeScript, Postgres, Drizzle ORM, Stripe, shadcn/ui, JWT auth, RBAC base |

Template ufficiale Next.js per SaaS con auth, billing Stripe, dashboard e ruoli Owner/Member.  Non è un LMS ma copre molto bene la parte "multi‑tenant B2B + Stripe + RBAC" per organizzazioni/team, con middleware globale e customer portal Stripe già integrati.  Architetturalmente è perfetto per:[^7]

- Gestione tenant/organizzazioni, ruoli per‑tenant, memberships.
- Integrazione Stripe per subscription (seat‑based la puoi estendere).
- Pattern di protezione rotte (middleware + Server Actions validate).

**Uso consigliato**: eccellente base per il layer multi‑tenant + billing della tua piattaforma LMS; affiancherai a questo un microservizio LMS (FastAPI o Node) e servizi SCORM/LRS.

### multitenant‑ecommerce (TenantE)

| Campo | Valore |
| --- | --- |
| Repo | https://github.com/poncema4/multitenant-ecommerce |
| Stelle | 1 |
| Ultimo commit | 2 agosto 2025 |
| Licenza | non esplicitata chiaramente (verifica LICENSE nel repo) |
| Stack | Next.js (app router), TypeScript, Tailwind, shadcn/ui, Payload CMS, MongoDB, tRPC, Stripe, Vercel Blob |

TenantE è un SaaS multi‑tenant e‑commerce con multi‑store, Stripe Connect, subdomain routing e Payload CMS come backend.  È rilevante perché mostra:[^8]

- Implementazione reale di multi‑tenant con sub‑domini e separazione tenant.
- Integrazione Stripe multi‑tenant (payout per store) che puoi tradurre in "payout per azienda cliente".
- Uso di tRPC per API type‑safe end‑to‑end.

**Uso consigliato**: ottimo reference per multi‑tenancy avanzata (subdomain routing, Stripe Connect, Payload CMS), particolarmente utile se valuti Payload come CMS per contenuti non SCORM.

### Miglior progetto per la tua esigenza (Ricerca 1)

Per il tuo caso (LMS B2B multi‑tenant, stack moderno non‑PHP) la combinazione più solida è:

- **Core SaaS/multi‑tenant + billing**: partire da **nextjs/saas‑starter** per auth, organizations, RBAC, Stripe e dashboard B2B.[^7]
- **LMS core**: replicare i domain model usando **awais7012/lms‑2** come reference API (FastAPI + React) o in alternativa studiare **CourseLit** per la parte marketplace corsi/pagamenti se accetti AGPL come reference di codice.[^5][^6]

Wellms/EscolaLMS rimane una fonte preziosa di idee su moduli SCORM/H5P/Reports ma non come base code per via dello stack.[^3]

***

## Ricerca 2 — SCORM runtime e player moderni

### scorm‑again — modern SCORM runtime JS/TS

| Campo | Valore |
| --- | --- |
| Repo | https://github.com/jcputney/scorm-again |
| Stelle | 273 |
| Ultimo rilascio | 2.6.5 – 20 giugno 2025 |
| Licenza | MIT |
| Stack | TypeScript 97.7%, build ESM/CJS, runtime browser/Node, supporto AICC, SCORM 1.2, SCORM 2004 |

scorm‑again è probabilmente il runtime SCORM più moderno e attivamente mantenuto: implementa AICC, SCORM 1.2 e 2004, è LMS‑agnostic, esportato via npm, include API per cross‑frame communication e offline support, e fornisce eventi per tutte le chiamate SCORM (Initialize/GetValue/SetValue/Commit…).  Offre:[^9][^10]

- API JS/TS per istanziare Scorm12API o Scorm2004API e attaccarle a `window.API` / `window.API_1484_11`.
- CrossFrameLMS/CrossFrameAPI per far girare contenuti SCORM in iframe sandboxati e comunicare via postMessage.[^10]
- Hook sugli eventi SCORM e sui singoli CMI path (es. `SetValue.cmi.*`) ottimi per mappare verso xAPI o backend custom.[^10]

**Uso nella tua architettura**:

- Nel player React/Next.js instanzi `Scorm12API`/`Scorm2004API`, configuri `lmsCommitUrl` verso un endpoint backend (es. FastAPI) che traduce il commit in statement xAPI o record proprietari.
- Usi CrossFrameAPI se carichi il pacchetto SCORM in un iframe isolato.
- Usi gli eventi `on("SetValue.cmi.*", …)` per emettere heartbeat o generare statement xAPI granulari.

### RESCORM — boilerplate React + SCORM

| Campo | Valore |
| --- | --- |
| Repo | https://github.com/agordillo/RESCORM |
| Stelle | 49 |
| Ultimo commit | 7 febbraio 2020 (non più attivo) |
| Licenza | MIT |
| Stack | React 16, Webpack, Redux, supporto SCORM 1.2 & 2004, ES6 |

RESCORM è un boilerplate storico per creare applicazioni React SCORM‑compliant, con supporto SCORM 1.2/2004 e tooling classico (Webpack, Redux, i18n).  Non è attivamente mantenuto ma il codice resta utile come reference di:[^11]

- Pattern di inizializzazione SCORM dal lifecycle React.
- Mappatura dello state Redux su CMI.

**Uso consigliato**: reference di pattern più che base da riusare direttamente (stack vecchio, React 16, Webpack 3).

### react‑scorm — hook React per wrapper SCORM

| Campo | Valore |
| --- | --- |
| Repo | https://github.com/henriqgoncalvs/react-scorm |
| Stelle | 5 |
| Ultimo commit | 2021 circa |
| Licenza | non esplicita, ma repo pubblico; verificare README |
| Stack | React, JavaScript, usa pipwerks SCORM API wrapper |

`react-scorm` espone un custom hook per usare un SCORM API wrapper (pipwerks) in componenti React.  È un approccio diverso rispetto a scorm‑again, ma può darti spunti su come incapsulare la logica SCORM in un hook.[^12]

**Uso consigliato**: reference per API React‑friendly, ma meglio costruire direttamente un hook typed su scorm‑again.

### Integration patterns React + scorm‑again

L’articolo "Communication between React and SCORM" mostra come usare scorm‑again dentro componenti React con `useEffect` per inizializzazione e `quit` a unmount, più gestione asincrona delle chiamate SCORM.  Puoi combinarlo con le guide ufficiali di scorm‑again per:[^13]

- Creare un hook `useScormRuntime` che espone init, get/set, commit e eventi.
- Wrappare il contenuto SCORM in iframe e usare CrossFrameAPI.

### Miglior progetto per la tua esigenza (Ricerca 2)

**scorm‑again** è nettamente il miglior runtime SCORM moderno per un LMS custom: TypeScript, MIT, supporto 1.2/2004, cross‑frame, offline, e hook di eventi perfetti per integrare con un backend o con xAPI.  Suggerito:[^9][^10]

- Player React proprietario + `scorm-again` come runtime + endpoint FastAPI/Node per `lmsCommitUrl`.
- RESCORM e react‑scorm solo come reference di pattern.

***

## Ricerca 3 — xAPI e LRS moderni

### Learning Locker — LRS open source Node.js

| Campo | Valore |
| --- | --- |
| Repo | https://github.com/LearningLocker/learninglocker |
| Stelle | 561 |
| Ultimo rilascio | v7.1.1 – novembre 2021 (community edition stabile) |
| Licenza | GPL‑3.0 |
| Stack | Node.js, JavaScript, MongoDB, servizi separati, interfaccia web |

Learning Locker è lo storico LRS open source, implementa xAPI completo, e viene ancora considerato uno standard de‑facto; la community edition è GPL‑3.0, ma puoi self‑hostarla via Docker (esistono repo dockerizzati community) e usarla come servizio separato.  Pro:[^14][^15]

- Compliant xAPI con query avanzate, UI di reportistica, multi‑tenant logico.
- Ecosistema maturo, documentazione ampia.[^16]

Contro per il tuo caso: licenza GPL e stack un po’ datato Node+Mongo, ma comunque moderno rispetto a molte soluzioni.

### Yet Analytics lrsql — LRS SQL‑based con Docker

| Campo | Valore |
| --- | --- |
| Repo | https://github.com/yetanalytics/lrsql |
| Stelle | 111 |
| Ultimo rilascio | v0.8.5 – 29 luglio 2025 |
| Licenza | Apache‑2.0 |
| Stack | Clojure, SQL backend (Postgres / SQLite), Docker image ufficiale |

lrsql è un LRS xAPI che usa database SQL (Postgres/SQLite) e viene distribuito come container Docker ufficiale `yetanalytics/lrsql:latest`.  È attivamente mantenuto (release 2025), con licenza permissiva Apache‑2.0 e documentazione per configurazione, TLS, OIDC, deployment su Postgres.[^17][^18]

**Uso nella tua architettura**:

- Esegui lrsql come microservizio Docker dedicato.
- Il player (SCORM/xAPI) invia statement xAPI direttamente all’endpoint lrsql.
- Per audit/reportistica, puoi interrogare lrsql o replicare i dati su un data warehouse.

### ADL_LRS — reference LRS ADL

| Campo | Valore |
| --- | --- |
| Repo | https://github.com/adlnet/ADL_LRS |
| Licenza | probabilmente Apache 2.0 (verifica nel repo) |
| Stack | Storico, non particolarmente aggiornato |

ADL_LRS è il reference LRS di ADL, ma non è il più moderno a livello di stack e non sembra avere attività recente significativa; utile più come reference di conformità che come servizio in produzione.[^19]

### Client xAPI lato player

Per generare statement xAPI da React/Next:

- **TinCanJS** (RusticiSoftware/TinCanJS): libreria JavaScript per xAPI/Tin Can, Apache‑2.0, 210 stelle, supporto browser e Node, installabile via npm.[^20][^21]
- **xapi-js-client** (HT2‑Labs/xapi-js-client): client JS per xAPI orientato a best practice, prodotto dai creatori di Learning Locker, distribuito via npm `@ht2-labs/xapi-js-client`.[^22]

Queste librerie ti danno:

- Costruzione di statement xAPI tipizzati (verb, actor, object, context…).
- Gestione LRS endpoint, auth e batching.

### Miglior progetto per la tua esigenza (Ricerca 3)

Per un microservizio LRS Docker separato, moderno e permissivo, **lrsql** è il candidato migliore: Apache‑2.0, Docker ufficiale, supporto Postgres, release recenti.  Per il client lato player, suggeribile usare **TinCanJS** o **xapi-js-client** a seconda di come vuoi modellare le API.[^18][^17]

- Player React/SCORM → trasforma SCORM CMI + eventi scorm‑again in statement xAPI con TinCanJS → invio a lrsql.

***

## Ricerca 4 — Player video React con controlli antifrode

Non esistono (ad oggi) componenti React open‑source "chiavi in mano" che implementino l’intero set di controlli antifrode desiderato (no seek avanti, detection cambio tab, heartbeat, progress callback granulare, quiz overlay) in modo integrato e maturo; tuttavia ci sono building blocks utili.

### Pattern per disabilitare seek avanti (ReactPlayer / HTML5 video)

- Una risposta StackOverflow del 2023 mostra come usare `ReactPlayer` con `onProgress` + `onSeek` per tenere traccia del punto massimo visto (`played`) e impedire il seek oltre quel punto, facendo `seekTo(played)` quando l’utente prova a spostarsi avanti.[^23]
- Un articolo più vecchio mostra lo stesso concetto con `<video>` nativo: usare evento `seeking` per confrontare `currentTime` e `pseudoCurrentTime`, e riportare il cursore se l’utente tenta di andare oltre il massimo guardato, memorizzando lo stato in localStorage per supportare resume.[^24]

Questi pattern sono perfettamente adattabili a un tuo custom player React con `<video>` o con una libreria tipo `react-player`.

### Player React con overlay/quiz

- L’ecosistema React ha molte librerie video (video.js + wrapper React, react-player, griffith, ecc.), ma la logica antifrode va implementata custom.[^25][^26]
- Su npm esiste `@kuldeep363/interactive-video-player`, un componente React che fornisce overlay interattivi (es. quiz) su un video HTML5, con configurazione tramite array di overlay con offset, durata, `stopOnEntry` e contenuti React custom.  Non implementa antifrode, ma fornisce un buon modello per:[^27]
  - Pausa automatica a timestamp specifici.
  - Visualizzazione quiz, raccolta risposta, richiamo callback verso il parent.

### Librerie e pattern per focus/cambio tab/heartbeat

Non ci sono librerie "video anti‑cheat" pronte, ma i building blocks sono standard:

- Uso di `visibilitychange` sul document per rilevare cambio tab/focus e mettere in pausa.[^24]
- setInterval/`requestAnimationFrame` per heartbeat al backend con timestamp e stato video.
- Eventi `timeupdate` su `<video>` per progress tracking millimetrico.[^24]

### Miglior approccio per la tua esigenza (Ricerca 4)

La soluzione più robusta è costruire un **player video custom React** su `<video>` o su `react-player`, implementando:

- Pattern **no‑seek‑forward** da StackOverflow (tracking `played` e blocco di `onSeek`) adattato a TypeScript.[^23]
- Event listener `visibilitychange` + pausa automatica e heartbeat verso backend.
- Overlay quiz ispirati a `@kuldeep363/interactive-video-player` (data‑driven, offset/durata, callback su risposta).[^27]

Non c’è un progetto "perfetto" ma i pattern sono chiari, e puoi modularizzare il tuo componente in modo riusabile nel LMS.

***

## Ricerca 5 — Starter kit SaaS B2B multi‑tenant moderni

### Next.js SaaS Starter (ufficiale)

Già descritto sopra, copre:

- Auth email/password con JWT in cookie.
- Dashboard utenti/team con ruoli Owner/Member.
- Stripe Checkout + Customer Portal + webhook base.
- Activity logging.[^7]

Non è formalmente multi‑tenant a livello di isolamento dati per B2B enterprise, ma già supporta team e membership; puoi estendere il modello `Team` per rappresentare le aziende clienti.

### multitenant‑ecommerce (TenantE)

Come visto nella Ricerca 1, TenantE è una reference forte per multi‑tenancy "vera" (multi store) con:

- Payload CMS multi‑tenant.
- Subdomain routing per tenant.
- Stripe Connect.[^8]

Usato insieme a nextjs/saas‑starter ti dà tutti i pattern per multi‑tenant B2B con Stripe (incluse sottoscrizioni per seat se modellate come prodotti/price per membro).

### Adrian Hajdin — LMS SaaS app (Next.js + Supabase + Stripe)

| Campo | Valore |
| --- | --- |
| Repo | https://github.com/adrianhajdin/saas-app |
| Stelle | 269 |
| Ultimo commit | maggio 2025 |
| Licenza | non esplicitata nel contenuto mostrato (verifica LICENSE) |
| Stack | Next.js, TypeScript, Supabase, Stripe, Clerk, Tailwind, shadcn/ui, Sentry, Vapi |

Questo progetto è un LMS SaaS con Next.js, Supabase e Stripe, posizionato come piattaforma per tutoring con AI voice agent.  Non è multi‑tenant B2B, ma offre un esempio completo di:[^28]

- LMS SaaS monocliente con subscriptions/billing.
- Architettura Next.js + Supabase.

**Uso consigliato**: reference per un LMS SaaS "monolith" in Next.js, soprattutto per il layer UI, auth e billing; per il B2B multi‑tenant conviene invece rifarsi a nextjs/saas‑starter + pattern TenantE.

### Miglior base per la tua esigenza (Ricerca 5)

- **nextjs/saas‑starter** come base ufficiale Next.js per auth, Stripe, team e RBAC.[^7]
- Pattern di **TenantE** per multi‑tenancy avanzata (organizzazioni, subdomain, Stripe Connect).[^8]

Puoi combinare i due concettualmente: adottare il codice di saas‑starter e incorporare concetti di multi‑tenant routing e Stripe multi‑tenant da TenantE.

***

## Ricerca 6 — Generazione certificati PDF verificabili

Non emergono molti progetti completi "end‑to‑end" (template + QR + verifica) moderni con stack Node/Python, ma ci sono building blocks e un servizio Node relativamente recente.

### pdf‑cert — generatore di certificati PDF Node.js

| Campo | Valore |
| --- | --- |
| Repo | https://github.com/jinine/pdf-cert |
| Stelle | 0 |
| Ultimo commit | 2 dicembre 2024 |
| Licenza | ISC |
| Stack | Node.js + pdfkit, ES modules |

`pdf-cert` (Cert‑Gen‑Service) è un package Node che genera certificati PDF personalizzabili con dati utente dinamici e immagini (firma, timbro) usando pdfkit.  È minimale ma moderno e attivo nel 2024.[^29]

Per il tuo use case, ti copre:

- Generazione PDF con layout personalizzabile (puoi estendere il template).
- Inserimento di testi e immagini dinamiche.

Non include nativamente QR code o verifica online, ma:

- Puoi generare QR code con librerie Node come `qrcode` (lista librerie Node/Python per QR è facilmente reperibile).[^30]
- Puoi includere nel template un `certificate_id` e URL di verifica (`/verify/:id`).

### Pattern per certificati verificabili

Architettura suggerita:

1. Microservizio Node (o Python con ReportLab + libreria QR) che espone un’API tipo `POST /certificates` con payload (userId, courseId, completionDate…).
2. Il servizio genera un `certificate_id` univoco e punta a una route pubblica `/certificates/:id` sul frontend.
3. Il PDF viene creato con pdfkit (o libreria analoga) inserendo:
   - Dati utente/corso.
   - QR code generato runtime con URL di verifica.
   - Firma digitale (se vuoi, mediante integrazione con soluzione di firma esterna).

### Miglior approccio per la tua esigenza (Ricerca 6)

Non c’è un framework completo "certificati con QR e verifica" moderno e open source, ma **pdf‑cert** ti offre una codebase Node 2024 già focalizzata sui certificati che puoi estendere con:

- Integrazione QR (usando libreria Node QR code).[^29]
- Endpoint di verifica e persistenza `certificate_id` nel tuo database LMS.

In alternativa puoi costruire il servizio da zero con Node (pdfkit + qrcode) o Python (ReportLab + `qrcode`), ma pdf‑cert è un acceleratore pratico.

***

## Ricerca 7 — Implementazioni complete di piattaforme corsi online

### CourseLit — piattaforma corsi tipo Teachable (di nuovo)

Come visto, CourseLit è il candidato principale e moderno come clone Teachable/Thinkific open source.  Copre:[^1][^5]

- Marketplace corsi con pagine di vendita.
- Pagamenti Stripe.
- Gestione accesso ai corsi.
- CMS/blog.

Non ha SCORM/xAPI né antifrode video per compliance, ma copre bene "pagamento → enrollment → accesso" in un’unica architettura Node/TS.

### Ecosistema Wellms (EscolaLMS)

Wellms è già un LMS enterprise con:

- Backend headless API Laravel.
- Frontend React SPA demo (EscolaLMS/Front).[^3]
- Moduli per SCORM, H5P, Reports, Payments ecc. (vari pacchetti Laravel).[^3]

Anche se lo stack è PHP, l’architettura dimostra come integrare:

- Player contenuti (incluso H5P) + tracking tempo.
- Pagamenti + enrollment.
- Reporting avanzato (package Reports) per corso/utente.[^31]

Puoi usare questa architettura come blueprint logico per il tuo ecosistema di microservizi moderni.

### Adrian Hajdin LMS SaaS app

Come già menzionato, la sua LMS SaaS app Next.js + Supabase + Stripe è una implementazione completa "LMS‑as‑a‑service" single‑tenant con AI tutor, utile come reference end‑to‑end di integrazione UI + auth + billing + contenuti.[^28]

### Miglior progetto come reference completo (Ricerca 7)

Per vedere come mettere insieme "player video protetto + tracking + pagamenti + certificati" in un unico sistema coerente non esiste il clone perfetto, ma la combinazione più utile è:

- **CourseLit** per marketplace corsi + pagamenti + access control Node/TS.[^5]
- **Ecosistema Wellms** per moduli SCORM/H5P/Reports e organisational features, come reference di domini e relazioni.[^3]
- **LMS SaaS (adrianhajdin/saas‑app)** per il layer SaaS UI/Stripe in Next.js.[^28]

***

## Sintesi architetturale — come combinare i progetti in un LMS moderno B2B multi‑tenant

### Vista ad alto livello

Una possibile architettura target per il tuo scenario ISO/sicurezza sul lavoro:

- **Frontend B2B (Next.js)**
  - Basato su nextjs/saas‑starter per auth, team/organizations, Stripe e dashboard.[^7]
  - UI per amministratori aziendali (gestione utenti, assegnazione corsi, report compliance) e per discenti.
- **Servizio LMS core (FastAPI o Node)**
  - Api per corsi, moduli, lezioni, enrollment, completion rules.
  - Ispirato a `awais7012/lms-2` per dominio LMS e pattern FastAPI, oppure a CourseLit per entità business.[^6][^5]
- **Servizio SCORM runtime / player**
  - SCORM runtime client: `scorm-again` integrato nel frontend React/Next.[^9]
  - Backend endpoint `lmsCommitUrl` (FastAPI/Node) che riceve commit SCORM e li trasforma in:
    - aggiornamenti progress LMS core;
    - statement xAPI verso LRS.
- **LRS xAPI (Docker)**
  - `yetanalytics/lrsql` come microservizio Docker Apache‑2.0 con backend Postgres.[^17][^18]
  - Il player invia statement xAPI via TinCanJS/xapi-js-client.
- **Video player antifrode**
  - Componente React custom basato su `<video>`/`react-player` con:
    - no‑seek‑forward (pattern StackOverflow);[^23]
    - detection `visibilitychange` + pausa e heartbeat;[^24]
    - overlay quiz stile `@kuldeep363/interactive-video-player`.
  - Eventi di progress → API LMS core + statement xAPI.
- **Servizio certificati**
  - Microservizio Node usando `pdf-cert` + `qrcode` per generare PDF con `certificate_id` e QR di verifica.[^30][^29]
  - Endpoint pubblico `/verify/:certificate_id` sul frontend Next.js.

### Mappatura alle tue esigenze specifiche

1. **Multi‑tenant B2B**
   - Usa il modello team/organizations di nextjs/saas‑starter come tenant.
   - Tutti i record LMS (enrollment, completions, certificati, log) hanno un `tenant_id`.
   - Per scenari complessi, studia TenantE (multitenant‑ecommerce) per subdomain routing e multi‑tenant Stripe Connect.[^8]

2. **SCORM 1.2/2004**
   - `scorm-again` gestisce runtime lato client; CrossFrameAPI se usi iframe per il pacchetto.[^10][^9]
   - Endpoint di commit backend converte CMI → progressi LMS + optional xAPI.

3. **xAPI + LRS**
   - Player genera statement con TinCanJS/xapi-js-client; LRS = lrsql in Docker.[^22][^20][^17]
   - L’LRS funge da audit log append‑only per conformità ISO.

4. **Tracciamento antifrode fruizione**
   - Player video React custom con no‑seek‑forward, detection cambio tab, heartbeat, overlay quiz, avanzamento minimo per completamento.[^27][^23][^24]
   - Per SCORM, vincoli analoghi possono essere gestiti a livello di pacchetto o di wrapper attorno al pacchetto.

5. **Certificati PDF verificabili**
   - Trigger di generazione certificato quando `completion` corso = true e tutti i vincoli antifrode soddisfatti.
   - pdf‑cert come base Node per generare certificato con QR verso url di verifica.[^29]

6. **Pagamenti e controllo accesso**
   - Stripe (saas‑starter) gestisce abbonamenti a piani (es. n seats/azienda; seat → utente attivo).
   - LMS core controlla l’enrollment in base al piano e ai seat disponibili.

### Giudizio complessivo sui progetti

- **Da usare come base diretta (fork/derivazione)**:
  - nextjs/saas‑starter per SaaS B2B auth/billing/team.[^7]
  - scorm‑again come runtime SCORM TS lato client.[^9]
  - yetanalytics/lrsql come LRS Docker separato.[^17]
  - pdf‑cert come base per servizio certificati Node.[^29]

- **Da usare come reference architetturale e di dominio**:
  - awais7012/lms‑2 (FastAPI + React LMS core).[^6]
  - CourseLit (LMS marketplace completo in TypeScript, ma AGPL).[^5]
  - Ecosistema Wellms/EscolaLMS per design di pacchetti LMS (SCORM/H5P/Reports/Payments).[^3]
  - TenantE multitenant‑ecommerce per multi‑tenancy avanzata con Stripe Connect.[^8]

Questo set di progetti copre praticamente tutti i blocchi che ti servono per progettare un LMS moderno, scalabile e compliant, con codice reale e attivo nel 2024–2025.

---

## References

1. [GitHub - codelitdev/courselit](https://github.com/codelitdev/courselit) - CourseLit is a batteries included learning management system (aka LMS) for everyone. It is an open s...

2. [Wellms](https://github.com/EscolaLMS) - World's first headless LMS (Learning Management System) - Wellms

3. [Wellms LMS docs](https://docs.wellms.io) - Wellms is the world's first open-source headless Learning management system (LMS) that puts develope...

4. [Frequently Asked Questions | Wellms LMS docs](https://docs.wellms.io/faq/) - Wellms is the world's first open-source headless Learning management system (LMS) that puts develope...

5. [CourseLit](https://courselit.app) - Build, Sell & Market Your Courses And Digital Downloads ... CourseLit is an open-source alternative ...

6. [GitHub - awais7012/lms-2](https://github.com/awais7012/lms-2) - Contribute to awais7012/lms-2 development by creating an account on GitHub.

7. [nextjs/saas-starter: Get started quickly with Next.js ... - GitHub](https://github.com/nextjs/saas-starter) - This is a starter template for building a SaaS application using Next.js with support for authentica...

8. [poncema4/multitenant-ecommerce: A full-featured e- ...](https://github.com/poncema4/multitenant-ecommerce) - A full-featured e-commerce marketplace platform that is built for scalability and performace for use...

9. [jcputney/scorm-again: A modern SCORM JavaScript runtime library.](https://github.com/jcputney/scorm-again) - This project provides a stable, tested platform for running SCORM 1.2 and SCORM 2004 modules. It is ...

10. [scorm-again/docs/developer/development_workflow.md at master · jcputney/scorm-again](https://github.com/jcputney/scorm-again/blob/master/docs/developer/development_workflow.md) - A modern SCORM JavaScript runtime library. Contribute to jcputney/scorm-again development by creatin...

11. [GitHub - agordillo/RESCORM: A boilerplate for creating SCORM-compliant React applications](https://github.com/agordillo/RESCORM) - A boilerplate for creating SCORM-compliant React applications - agordillo/RESCORM

12. [GitHub - henriqgoncalvs/react-scorm: Custom Hook made for use SCORM API Wrapper with React.](https://github.com/henriqgoncalvs/react-scorm) - Custom Hook made for use SCORM API Wrapper with React. - henriqgoncalvs/react-scorm

13. [Communication between react and scorm](https://dorsetrigs.org.uk/post/communication-between-react-and-scorm) - Effective Communication Between React Applications and SCORM In modern e learning environments integ...

14. [Learning Locker](https://github.com/orgs/LearningLocker/repositories) - Learning Locker is the open source Learning Record Store for tracking learning data using the Experi...

15. [Learning Locker - GitHub](https://github.com/learninglocker) - Learning Locker is the open source Learning Record Store for tracking learning data using the Experi...

16. [How to Install the Open Source Learning Locker LRS using the Install Script | HT2 Labs](https://www.youtube.com/watch?v=tc_VDNjXLSc) - In this video, we talk through the installation process for version 2 of the Open Source edition of ...

17. [lrsql/doc/postgres.md at main · yetanalytics/lrsql](https://github.com/yetanalytics/lrsql/blob/main/doc/postgres.md) - A SQL-based Learning Record Store. Contribute to yetanalytics/lrsql development by creating an accou...

18. [lrsql/doc/docker.md at main · yetanalytics/lrsql - GitHub](https://github.com/yetanalytics/lrsql/blob/main/doc/docker.md) - Yet Analytics publishes Docker container images of SQL LRS on DockerHub in the format yetanalytics/l...

19. [GitHub - adlnet/ADL_LRS: ADL's Open Source Learning Record Store (LRS) is used to store learning data collected with the Experience API.](https://github.com/adlnet/ADL_LRS) - ADL's Open Source Learning Record Store (LRS) is used to store learning data collected with the Expe...

20. [RusticiSoftware/TinCanJS: JavaScript library for the ... - GitHub](https://github.com/RusticiSoftware/TinCanJS) - TinCanJS is available via npm and Bower. The browser environment is well tested and supports two kin...

21. [TinCanJS by Rustici Software - GitHub Pages](https://rusticisoftware.github.io/TinCanJS/) - TinCanJS can be included as a dependency when using bower. Include 'tincan' as the component name. B...

22. [GitHub - HT2-Labs/xapi-js-client: A JavaScript client for the xAPI from the creators of @LearningLocker.](https://github.com/HT2-Labs/xapi-js-client) - A JavaScript client for the xAPI from the creators of @LearningLocker. - HT2-Labs/xapi-js-client

23. [Disabling seeking functionality in react-player not working](https://stackoverflow.com/questions/76227343/disabling-seeking-functionality-in-react-player-not-working) - I'm trying to disable seeking in react-player, so the user needs to watch full video without any ski...

24. [Video Resume and Seek Disable in HTML5 Using ReactJS - Blogger](https://jayadaadrit.blogspot.com/2017/01/18-th-of-jan17-video-resume-and-seek.html) - 1. Introduction Videos play an important role to in providing detailed information. Whether it’s a t...

25. [A React-based web video player that makes streaming easy : r/reactjs](https://www.reddit.com/r/reactjs/comments/b98kis/a_reactbased_web_video_player_that_makes/) - A React-based web video player that makes streaming easy ... I have made an opensource (MIT) HTML5 v...

26. [How to Implement Custom Controls with React-Player▶️](https://oluwadaprof.medium.com/how-to-implement-custom-controls-with-react-player-%EF%B8%8F-a-step-by-step-guide-with-8068e2717590) - The only guide you would find out there 🥴…

27. [@kuldeep363/interactive-video-player](https://www.npmjs.com/package/@kuldeep363/interactive-video-player) - InteractiveVideoPlayer is a custom, lightweight, and fully React-based HTML5 video player component....

28. [adrianhajdin/saas-app: LMS SaaS app featuring user ... - GitHub](https://github.com/adrianhajdin/saas-app) - Create an LMS SaaS app from scratch featuring user authentication, subscriptions, and payments using...

29. [GitHub - jinine/pdf-cert: Service used to create PDF Certificates of Completion based on user-generated information.](https://github.com/jinine/pdf-cert) - Service used to create PDF Certificates of Completion based on user-generated information. - jinine/...

30. [A Guide to Generate Barcodes and QRcodes - CraftMyPDF.com](https://craftmypdf.com/blog/a-guide-to-generate-barcodes-and-qrcodes/) - Node.js and Python have existing open-source libraries that you can take advantage of to generate ba...

31. [codelitdev/courselit-themes - GitHub](https://github.com/codelitdev/courselit-themes) - Themes for CourseLit CMS. Contribute to codelitdev/courselit-themes development by creating an accou...

