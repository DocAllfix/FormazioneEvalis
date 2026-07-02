# Brief di produzione — Avatar + Audio dei corsi ISO (riferimento sessione)

> **Scopo di questo documento.** Darti il contesto COMPLETO e VERIFICATO della produzione dei corsi
> ISO con relatore avatar, così puoi decidere tu come orchestrare il lavoro. Non è un playbook rigido:
> è la mappa di *cosa* dobbiamo realizzare, *perché*, con *quali vincoli* e *quali riferimenti reali*
> nel codice. Tutti i fatti chiave sono inline: non devi inseguire altri file per capire.

## 1. Obiettivo e contesto

Dobbiamo produrre **10 corsi ISO** per la piattaforma Evalis Academy (LMS di certificazione persone —
auditor ISO, non corsi sicurezza). I corsi sono **slide + relatore avatar AI che narra ogni slide**.

- **ISO 19011** — 16h — corso propedeutico (advisory: senza 19011 le altre certificazioni ISO non sono
  spendibili sul lavoro; lo comunichiamo, non blocchiamo — feature già implementata in piattaforma).
- **9 corsi auditor** — 24h ciascuno — le altre norme (le 10 norme reali sono in `testonorme/`).
- **Totale ≈ 232h** di contenuto narrato.

**Requisito del cliente NON negoziabile:** l'avatar deve essere presente su **OGNI slide**. Non si riduce.

**Vincoli editoriali:** il testo delle norme ISO è **coperto da copyright** → i copioni devono essere
**contenuto didattico ORIGINALE** costruito a partire dai PDF in `testonorme/`, **mai copia verbatim**.

**Strategia produttiva scelta:** self-hosted a basso costo. Colossyan/HeyGen scartati per il volume
(cap 4h/giorno o costo fuori budget). Si genera l'audio con **voce clonata (TTS)** e l'avatar con
**MuseTalk** (lip-sync) su **GPU a noleggio**. Vedi §5-§6 per i dati certi.

## 2. Le funzionalità/obiettivi (ogni sotto-sistema)

1. **Voce clonata (TTS).** Clonare UNA volta una voce italiana e riusarla per tutti i corsi. Candidati:
   Qwen3-TTS / CosyVoice2 / XTTS v2 / Kokoro. Prima cosa da fare: **calibrare le parole/caratteri al
   secondo reali** della voce scelta (serve per il budget-durata dei copioni).
2. **Copioni a budget-durata.** I copioni si scrivono **puntando a una durata** (per slide e totale),
   così la somma raggiunge il monte-ore legale + margine. Contenuto originale dai `testonorme/`.
3. **Pipeline AUDIO-PRIMA (ordine CRITICO — garantisce il monte-ore, evita l'errore grave):**
   a. calibra la velocità della voce; b. scrivi i copioni a budget; c. **genera PRIMA tutto l'audio**
   (economico); d. **misura** la durata reale (ffprobe); e. **riconcilia**: se la somma < monte-ore,
   **aggiungi contenuto** (la norma è ricchissima) finché ≥ monte-ore + margine; f. **LOCK** dell'audio;
   g. **SOLO POI** genera gli avatar (ogni clip dura esattamente quanto l'audio già misurato). Mai
   sprecare compute avatar su audio non ancora bloccato.
4. **Video-base dell'avatar.** MuseTalk risincronizza solo la BOCCA su un **video-base** del volto.
   Serve UN base pulito per avatar (volto frontale, inquadratura stabile, 720p+, **senza watermark** —
   MuseTalk conserva tutti i pixel tranne la bocca, quindi un watermark resterebbe). Il base può essere
   più corto dell'audio: MuseTalk lo **ripete in loop** (meglio ping-pong per nascondere la giunta).
   Fonte del base: un generatore avatar di qualità una-tantum (es. Neo2/Colossyan) oppure la foto
   `templateavatarfoto.jpg`. Un base bello = output bello (MuseTalk tiene tutto tranne la bocca).
5. **Render avatar (MuseTalk).** Input = base + audio della slide → output = MP4 con bocca sincronizzata,
   durata = durata dell'audio. `preparation=False` per riusare lo stesso avatar su molte clip senza
   rifare il pre-processing. Dati hardware in §5.
6. **Orchestrazione / parallelizzazione (principi anti-rottura).** La produzione è un **fan-out di job
   indipendenti, uno per slide**, non un unico video. Principi:
   - **Associazione per ID, non per ordine**: il nome file = l'ID slide (es. `19011_m01_s005`). Il player
     lega slide→clip via `avatarClipUid`, quindi l'ordine di elaborazione è irrilevante e una clip non
     può finire sulla slide sbagliata.
   - **Job atomici indipendenti** → un errore = una clip da rigenerare, nessuna catena che si rompe.
   - **Niente video monolitico**: ogni slide resta la sua clip (→ Cloudflare Stream → uid sulla slide).
   - **Cancello di validazione per clip**: dopo il render, `ffprobe` verifica che durata output ≈ durata
     audio (±~0.3s) e che ci siano frame; se no → `FAILED`, non caricare. Un secondo giro rigenera solo
     le FAILED.
   - **Idempotente/ripartibile**: salta gli ID già fatti e validati; se il batch crasha, riprende.
   - **Sharding sulle GPU**: dividi la lista slide in N parti (una per GPU), nessuno stato condiviso →
     zero collisioni. Per un batch una-tantum basta questo (niente scheduler complessi — vedi §7).
7. **Upload su Cloudflare Stream.** Ogni MP4 va caricato su Stream con `requireSignedURLs`, si attende il
   processing e si salva `{ uid, duration }` mappato per chiave-slide. Vedi §4 per lo strumento già
   esistente e verificato.
8. **Manifest → ingest in piattaforma.** Costruire il pacchetto corso nel formato canonico e chiamare
   l'ingest, che **valida il monte-ore** (somma delle durate slide ≥ minuti richiesti) e inserisce tutto
   in transazione. Vedi §4.
9. **Slide HTML (input a monte).** Le slide impaginate (HTML) arrivano dal **track separato di design**
   (template a 2 palette, logo Evalis Academy, bolla avatar). Il pipeline le consuma come `html` per
   slide. Non è responsabilità di questo brief disegnare il template, ma di consumarne l'output.
10. **Compliance.** monte-ore validato lato server (l'ingest RIFIUTA se corto); quiz ed esame **NON**
    rientrano nel monte-ore (banca domande separata: 1 checkpoint per modulo + 1 esame finale);
    contenuto originale; l'`audioSeconds` per slide diventa il **tempo minimo** della slide (barriera
    antifrode a valle).

## 3. Il "seam" produzione→piattaforma (VERIFICATO NEL CODICE — segui questo pattern)

Esiste già ed è collaudato con la **demo ISO 14064-1**. Imitalo.

- **Formato canonico** — `src/features/courses/course-format.ts` (`courseInputSchema`): corso → moduli →
  lezioni (`type: "html"`) → slide. Ogni slide: `title`, `blocks` (qui `{ type: "html", html }`),
  `avatarClipUid` (uid Cloudflare, nullable), **`audioSeconds`** (int, = tempo minimo slide),
  `speakerNotes?`. Quiz: `questionsToDraw`, `passThreshold`, `timeLimitSeconds`, `cooldownSeconds`,
  `maxAttempts?`, banca `questions[]`.
- **Manifest di authoring** — `src/features/courses/authoring-manifest.ts` (`courseManifestSchema`): come
  il canonico ma la slide porta `html` inline + **`clipKey`** (riferimento per chiave, non uid).
  `resolveManifestToCourse(manifest, clipMap)` lega `clipKey → { uid, duration }` e produce il CourseInput.
- **Ingest** — `src/features/courses/ingest.ts` `ingestCourse(input)`: **valida il monte-ore**
  (`somma audioSeconds ≥ requiredMinutes*60`, altrimenti THROW) e inserisce corso/moduli/lezioni/slide/
  quiz in transazione, `status: "published"`.
- **Cloudflare Stream** — `src/lib/cloudflare/stream.ts`: `createDirectUpload()` (upload diretto da
  browser), `uploadClipFromUrl(url)` (copia da URL), `getClipStatus(uid)` → `{ ready, duration, errored }`,
  `getSignedClipUrl(uid)` (HLS firmato RS256 locale), `deleteClip(uid)`. Richiede env
  `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_STREAM_API_TOKEN`, + signing key per il player.
- **Esempio concreto end-to-end (DA SEGUIRE):**
  - `scripts/upload-demo-clips.mjs` — carica gli MP4 da una cartella (chiave = `sNN` dal nome file),
    imposta `requireSignedURLs`, fa polling fino a `readyToStream`, salva `{ uid, duration }` in
    `democorso/clip-map.json`. **Idempotente** (salta i già mappati). `duration = Math.ceil(cloudflare.duration)`.
  - `scripts/build-demo-course.ts` — legge `clip-map.json` + le slide HTML, costruisce lo `SlideInput`
    per slide (`avatarClipUid` + `audioSeconds` = durata clip), definisce le banche quiz (checkpoint +
    esame finale), chiama `ingestCourse()` e assegna l'enrollment a un utente di test.
- **Fatto CRITICO che chiude il cerchio con l'audio-prima:** `audioSeconds` di ogni slide **È la durata
  reale della clip Cloudflare**. L'ingest rifiuta il corso se la somma è sotto il monte-ore. Quindi il
  monte-ore è garantito su durate REALI, non dichiarate. Se l'audio-prima è fatto bene, l'ingest passa.

## 4. Dati certi su hardware / costi / tempi (verificati online in luglio 2026)

**MuseTalk (repo TMElyralab + blog di tuning):**
- Regione bocca **256×256**, input ottimale **25fps**. **Real-time: 30fps+ su V100**. VRAM minima
  testata: 4GB (lenta). `use_float16` riduce VRAM ma cala qualità. `preparation=False` riusa l'avatar.
- Batch su **RTX 4090** (24GB): batch 1 → 0,53 req/s (18GB) · batch 4 → 3,51 (20GB) · batch 8 → 6,20
  (22GB) · **batch 16 → 10,26 req/s (24GB, limite)**; batch 20 = OOM. A100 80GB regge batch 64; H100
  batch 128. **La VRAM serve al batch (throughput), non alla capienza**: non ci serve una scheda da 80GB.
- Tempo stimato per **una clip da 5 min** su 4090 (avatar già preparato): **~3-6 min di wall-clock**
  (~2-3 min inferenza + ~1-2 min encoding/mux). Da confermare col pilota.

**Noleggio GPU (2026, multi-provider):**
| GPU | Vast.ai | RunPod | Spheron |
|---|---|---|---|
| RTX 4090 24GB | da $0,31/h | ~$0,34 community | $0,55 |
| A100 80GB | da $0,67/h | $1,39 community | $1,07 ($0,60 spot) |
| H100 | da $0,90/h | $2,69 SXM | $2,01 ($1,03 spot) |

**Raccomandazione hardware:** **RTX 4090, batch 16, su Vast/RunPod community** = miglior rapporto
semplicità/costo/velocità per un batch offline. A100 solo se si vogliono meno macchine con throughput
più alto (batch 64).

**Stima catalogo (232h):** ~250-400 ore-GPU su singola 4090 → **compute ~$85-140**. Wall-clock:
1×4090 ≈ giorni · **4×4090 ≈ 1,5-3 giorni** · 8×4090 ≈ <1 giorno (costo ~lineare, cambia solo il tempo).
**Il collo di bottiglia NON è il costo, è l'orchestrazione.**

**IMPORTANTE:** questi sono numeri STIMATI. Il modo per renderli CERTI è un **pilota**: cronometrare 1
clip reale sulla nostra GPU/avatar, poi moltiplicare. Il pilota è il prossimo passo pratico.

## 5. Vincoli non negoziabili (compliance + regole progetto)

- **monte-ore validato lato server** (l'ingest rifiuta se corto) — non aggirare.
- **quiz/esame separati** dal monte-ore; banca domande a estrazione casuale; bloccanti per avanzare.
- **contenuto ORIGINALE** (mai copia verbatim delle norme ISO — copyright).
- **audit append-only, sessione singola, certificato con revisione umana** (non toccare/indebolire).
- **Semplicità (CLAUDE.md):** niente over-engineering dell'orchestrazione. Per un batch una-tantum,
  sharding + naming per ID + validazione ffprobe bastano. Introdurre code/scheduler solo se servono davvero.
- **Regole operative:** commit firmati SOLO come `DocAllfix` (nessun trailer Claude/Anthropic); modifiche
  DB solo via migration versionata + `db:migrate`; wrappare (non alterare) codice vendorizzato.

## 6. Riferimenti (dove approfondire)

**Codice (verificato):** `src/features/courses/{course-format.ts, ingest.ts, authoring-manifest.ts,
admin-catalog.ts, content-actions.ts}`, `src/lib/cloudflare/stream.ts`,
`src/app/api/staff/clips/{direct-upload,[uid]/status}/route.ts`,
`src/components/admin/course-import-wizard.tsx`,
`scripts/{upload-demo-clips.mjs, build-demo-course.ts}`, `democorso/{clip-map.json, Corso interattivo ISO 14064-1 (standalone).html}`.
**Docs:** `CLAUDE.md` (regole), `ARCHITETTURA.md` (fonte di verità), `testonorme/` (le 10 norme, PDF),
`offerta/{Architettura-Piattaforma-Evalis.md, Costi-Esterni-Piattaforma-Evalis.md}`,
`PRE-LAUNCH.md`. **Memoria di progetto** (auto-caricata): vedi `MEMORY.md`, in particolare
`iso-course-production-pipeline`, `cloudflare-stream-setup`, `platform-admin-and-authoring-built`,
`product-positioning-certification`.
**Asset:** `templateavatarfoto.jpg` (foto relatore 1254×1254), `public/brand/monogram.png`,
`logosvg/` (lockup Evalis Academy), `mp4corsotest/` (clip demo), `democorso/` (esempio completo).
**Esterni:** MuseTalk `github.com/TMElyralab/MuseTalk`; GPU: Vast.ai / RunPod; TTS: Qwen3-TTS /
CosyVoice2 / XTTS v2 / Kokoro.

## 7. Cosa devi decidere/orchestrare tu (spazio di decisione)

Con il contesto sopra, le scelte aperte da orchestrare sono:
- **TTS**: quale modello di voce clonata (qualità italiana / velocità / setup) e come calibrarne la velocità.
- **Video-base**: da quale generatore una-tantum ricavare il base pulito senza watermark, o partire dalla foto.
- **GPU**: provider, numero di GPU, batch size (parti da 4090/batch 16), come sharding-are le slide.
- **Tooling batch**: come strutturare il "manifest → audio → misura → riconcilia → avatar → valida →
  upload → ingest" riusando gli script demo esistenti (estendere `upload-demo-clips.mjs` /
  `build-demo-course.ts`, o generalizzarli). Mantieni i principi anti-rottura del §2.6.
- **Ordine di attacco**: quasi certamente conviene un **PILOTA** (1 corso o anche solo 1 modulo di
  ISO 19011) end-to-end per misurare tempi/costi/qualità reali prima del batch completo.

## 8. Criteri di successo verificabili (per corso)

- `somma(audioSeconds) ≥ requiredMinutes*60` → **`ingestCourse` passa** (monte-ore garantito).
- Ogni slide ha un `avatarClipUid` valido e la clip Cloudflare è `readyToStream`.
- Ogni clip validata: durata output ≈ durata audio previsto (±~0.3s); nessuna clip corrotta caricata.
- Banche quiz presenti (1 checkpoint/modulo + 1 esame finale), separate dal monte-ore.
- Contenuto originale (nessuna copia verbatim delle norme).
- Il corso è riproducibile nel player (HLS firmato) con avatar su ogni slide.
