# QA pre-live dei corsi ISO — contratto template + controlli automatici + revisione mirata

> **Scopo.** Garantire che tutti i 10 corsi (~232h, ~3.000 slide) funzionino in ogni singola slide
> (video, sync, layout, avatar) PRIMA del go-live, senza doverli guardare integralmente a occhio.
> **Principio: prevenire a monte (contratto) > rilevare in automatico (gate) > guardare a campione (umano).**
> Questo documento si usa in due momenti: (A) quando si genera il template su claude design;
> (B) quando si fa il controllo pre-pubblicazione di ogni corso.

---

## PARTE A — Prevenzione a monte: il CONTRATTO DEL TEMPLATE (per claude design)

La maggior parte dei difetti visivi si elimina prima che esistano, vincolando il template.
Il template slide che claude design produrrà DEVE rispettare questo contratto:

### A.1 Zona avatar fissa e non negoziabile
- **Canvas**: 1920×1080 (16:9), sempre.
- **Zona avatar**: riquadro FISSO, stessa posizione e dimensione su OGNI slide di OGNI corso.
  **Dimensione e posizione APPROVATE dall'utente (2026-07-02): come `slide4-check.jpeg`** —
  bolla compatta in alto a sinistra, non invadente ("non si notano neanche troppo i dettagli").
  Proporzione = quella del video base (che è verticale pillarboxed: si croppa il contenuto utile
  in pre-processing e la zona si dimensiona su QUEL crop, misurato con ffprobe).
- Il player inserisce il `<video>` della clip in quella zona: **la proporzione della zona DEVE
  combaciare esattamente con la proporzione del video base scelto** (si misura il base con
  ffprobe e si fissa nel template — mai adattare a occhio, mai `object-fit: cover` che taglia il volto).
- NESSUN elemento del template (testo, box, decorazioni) può invadere la zona avatar.
- La zona è presente e identica anche se la slide ha molto o poco contenuto: niente layout
  "adattivi" che spostano l'avatar.

### A.2 Vincoli sul contenuto slide (perché niente sbordi)
- Area testo con margini di sicurezza fissi; font-size minimo definito (leggibile a 1080p e su mobile).
- Limiti quantitativi per slide nel template: max caratteri titolo, max righe/bullet, max
  caratteri per bullet. **I copioni/contenuti generati rispettano questi limiti già in produzione**
  (il generatore di contenuto li conosce), così l'overflow non può accadere, non va "beccato".
- Niente contenuto che dipende da risorse esterne runtime (font remoti non affidabili, immagini
  hotlinkate): tutto self-contained o servito da noi. Una slide non può "rompersi dopo".
- Doppio template (Ambra / Evalis navy): stesso identico contratto geometrico, cambia solo la pelle.

### A.3 Input contenuti a claude design: slide-content.json (MAI i copioni grezzi, MAI la norma)
- Riferimento visivo del risultato atteso: `slide4-check.jpeg` (avatar in bolla fissa a sinistra,
  contenuto a card editoriali, poco testo, gerarchia chiara).
- A claude design NON si danno i copioni discorsivi (~650 parole/slide: o li stipa creando
  overflow, o seleziona lui cosa mostrare → scelte incoerenti tra slide) e NON si dà il testo
  della norma (copyright + creerebbe una SECONDA fonte di verità che diverge dalla narrazione).
- Gli si dà `produzione/<corso>/slide-content.json`, derivato dai copioni (che restano l'UNICA
  fonte di verità): per ogni ID → titolo, kicker/categoria, 3-6 punti brevi entro i limiti A.2,
  eventuale elemento visivo suggerito (schema, tabella, timeline), termini chiave. La slide è
  la proiezione visiva del copione, mai un contenuto autonomo.
- Fuori da palette, logo, zona avatar, limiti A.2 e slide-content.json, claude design ha
  LIBERTÀ creativa: poche specifiche → risultato migliore.
- Bonus QA: i termini chiave di ogni slide devono comparire nel copione dello STESSO ID →
  controllo automatico di coerenza slide↔narrazione (anti-mescolamento a livello contenuti, C.1-bis).

### A.4 Verifica del contratto (una volta per template, non per slide)
- Slide di prova con contenuto MIN (una riga) e MAX (limiti pieni) → screenshot 1920×1080 e
  mobile → controllo umano UNA volta.
- Clip di prova nella zona avatar → verifica proporzione/allineamento UNA volta.
- Da qui in poi la posizione avatar e il layout sono **strutturali**: se il contratto è rispettato,
  sono giusti su tutte le slide per costruzione.

---

## PARTE B — Gate automatici in pipeline (girano sul pod GPU, subito dopo il render)

Ogni clip passa questi cancelli PRIMA di essere caricata su Cloudflare. Una clip che fallisce
un gate = `FAILED`, si rigenera solo quella. Nessuna clip non validata arriva in piattaforma.

### B.1 Gate tecnico (ffprobe) — beccano: clip corrotte/troncate/vuote
- durata output = durata audio attesa ±0,3s;
- stream video presente, frame > 0, risoluzione = quella attesa dal base;
- stream audio presente, non muto.

### B.2 Gate audio: round-trip ASR (Whisper) — becca: gli errori TTS (i più insidiosi)
- Ogni audio generato si trascrive con Whisper sul pod e si confronta col copione
  (similarità testuale normalizzata: numeri, punteggiatura, maiuscole).
- Similarità sotto soglia (parole saltate, frasi biascicate, artefatti) → clip segnalata.
- In più: `ffmpeg silencedetect` (silenzi anomali > ~2,5s a metà clip) e loudness uniforme
  (EBU R128, target unico per tutto il catalogo → volume coerente tra slide e tra corsi).

### B.3 Gate sync: punteggio SyncNet — becca: lip-sync scadente senza guardare
- Ogni clip riceve uno score di confidenza labiale (syncnet_python).
- Le clip sotto soglia o le peggiori N% del corso → lista di revisione umana.

**Output dei gate**: un report per corso (`produzione/<corso>/qa-report.json`) con esito per
clip: PASS / FAILED (rigenerata) / FLAGGED (da guardare). È l'input della Parte D.

---

## PARTE C — Verifica in piattaforma (prima di pubblicare ogni corso)

### C.1 Controllo di integrità dati (script, zero occhi)
Per il corso ingestato verifica: ogni slide ha `avatarClipUid` valido · ogni uid è
`readyToStream` su Cloudflare · `audioSeconds` in DB = durata Cloudflare · somma ≥
`requiredMinutes×60` (ridondante con l'ingest, ma qui è il controllo pre-pubblicazione) ·
checkpoint per modulo + esame finale presenti · nessuna slide senza blocchi HTML.

### C.1-bis Controllo quiz-per-quiz e coerenza contenuti (script, zero occhi)
Per OGNI quiz di ogni corso (checkpoint + esame finale):
- struttura: banca ≥ `questionsToDraw`, ogni domanda ha 3-4 opzioni tutte diverse, UNA sola
  corretta ed esiste tra le opzioni (già forzato dallo zod all'ingest — qui ridondante), soglie
  e tempi nei range di progetto, nessuna domanda duplicata (confronto normalizzato);
- semantica: la risposta corretta di ogni domanda deve trovare riscontro nel copione del modulo
  (verifica automatica per termini chiave + campione umano in Parte D);
- funzionale (con C.3): il quiz si apre, estrae il numero giusto di domande, accetta la risposta
  corretta, rifiuta l'errata, blocca l'avanzamento sotto soglia (tentativo simulato su utente di
  test in ambiente di verifica, MAI su utenti reali).
Coerenza slide↔copione: per ogni ID, i termini chiave di `slide-content.json` compaiono nel
copione dello stesso ID → un mismatch segnala slide montata sul contenuto sbagliato.

### C.2 Anteprima staff (piccola aggiunta di piattaforma, da costruire)
Pagina gated `requirePlatformAdmin` che apre QUALSIASI slide di qualsiasi corso con la sua clip
firmata, senza enrollment e senza gating sequenziale. NON tocca né indebolisce l'antifrode dei
discenti (percorso separato, solo staff). Serve sia al controllo umano sia all'automazione C.3.

### C.3 Passata Playwright automatica (di notte, da sola)
Sull'anteprima staff, per OGNI slide di ogni corso:
- la pagina carica senza errori console;
- il video parte (evento `playing` entro timeout) e l'HLS firmato risponde;
- screenshot 1920×1080 della slide renderizzata con avatar.
Gli screenshot si assemblano in **contact sheet** (griglie di miniature per corso, HTML/PDF).

### C.4 Scansione umana dei contact sheet
Scorri le miniature di un corso (~300) in ~10 minuti: si beccano a colpo d'occhio slide vuote,
testo che sborda, layout rotti, avatar mancante. È il controllo visivo al 100% delle slide,
in minuti invece che in ore.

---

## PARTE D — Revisione umana mirata (cosa guardi TU, davvero)

Per corso:
1. **Tutte le clip FLAGGED** dai gate B.2/B.3 (di solito poche).
2. **Prima e ultima slide di ogni modulo** (le giunte più delicate).
3. **Campione casuale ~3-5%** delle slide restanti, guardate per intero.
4. Contact sheet completo (C.4).

Stima realistica per l'intero catalogo: **8–12 ore di visione totali invece di 232**, con
confidenza superiore a una visione integrale distratta.

---

## Checklist pre-pubblicazione (per ogni corso, in ordine)

- [ ] Gate B.1–B.3 tutti PASS o rigenerati; report QA archiviato.
- [ ] Upload Cloudflare completo, tutte le clip `readyToStream`.
- [ ] Ingest riuscito (monte-ore validato dal server).
- [ ] Controllo integrità C.1 pulito.
- [ ] Controllo quiz-per-quiz + coerenza slide↔copione C.1-bis pulito.
- [ ] Passata Playwright C.3 senza errori + contact sheet generato.
- [ ] Scansione contact sheet fatta (C.4).
- [ ] Revisione umana mirata fatta (D): FLAGGED + prime/ultime + campione.
- [ ] Fruizione di prova reale: 2-3 slide come discente di test (tracking accredita, checkpoint funziona).
- [ ] → Pubblica.

## Note costi della finestra QA

Stream fattura pro-rata giornaliero anche a corso fermo: QA di un corso da 24h tenuto su 1
settimana ≈ **$1,70**; l'intera finestra QA del catalogo costa pochi euro. I $70/mese pieni
partono solo a catalogo completamente caricato (= go-live). I master MP4 restano in R2 come
archivio (~$0–2/mese).

## Cosa va costruito per questo QA (quando arriverà il momento)

1. Script gate sul pod: ffprobe + Whisper round-trip + silencedetect/loudness + SyncNet → `qa-report.json`.
2. Script integrità piattaforma (C.1) — riusa `getClipStatus` di `src/lib/cloudflare/stream.ts`.
2-bis. Script quiz+coerenza (C.1-bis) — legge manifest/DB + slide-content.json + copioni.json.
3. Pagina anteprima staff (C.2) — gated `requirePlatformAdmin`, nessuna modifica all'antifrode.
4. Passata Playwright + generatore contact sheet (C.3).
5. Il contratto template (Parte A) si consegna a claude design PRIMA di generare i template.

Il **pilota (Modulo 1 ISO 19011)** collauda anche questo QA: sulle 13 slide si verifica che i
gate becchino davvero i difetti (es. introducendo ad arte una clip corta e un copione storpiato).
