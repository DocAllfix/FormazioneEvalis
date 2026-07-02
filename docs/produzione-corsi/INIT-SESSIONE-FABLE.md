# Messaggio di inizializzazione — Sessione di produzione corsi (modello Fable)

Ciao. Questa sessione è dedicata alla **produzione dei corsi ISO** (relatore avatar + audio) della
piattaforma **Evalis Academy** (LMS di certificazione persone). Prima di proporre o scrivere QUALSIASI
cosa, voglio che tu **analizzi a fondo l'ambiente e lo stato del progetto**, così partiamo con il
massimo contesto. Procedi così, in sola lettura:

## 1. Leggi e assimila (in quest'ordine)
- `CLAUDE.md` — le regole non negoziabili del progetto (compliance, semplicità, chirurgia, commit).
- `ARCHITETTURA.md` — la fonte di verità dell'architettura.
- `MEMORY.md` e le memorie collegate (specialmente: overview progetto, pipeline produzione corsi ISO,
  setup Cloudflare Stream, platform-admin & authoring, posizionamento certificazione).
- Il "motore corsi": `src/features/courses/course-format.ts`, `ingest.ts`, `authoring-manifest.ts`.
- L'integrazione video: `src/lib/cloudflare/stream.ts` e `src/app/api/staff/clips/*`.
- L'esempio già funzionante: `scripts/upload-demo-clips.mjs`, `scripts/build-demo-course.ts`,
  `democorso/clip-map.json`.
- Le norme da produrre: la cartella `testonorme/` (PDF delle 10 norme ISO).

## 2. Restituiscimi una sintesi (prima di agire)
Dimmi, in modo conciso e concreto:
- Cos'è la piattaforma e com'è messa **oggi** (cosa è già costruito: catalogo, player, authoring,
  Cloudflare, tracciamento/monte-ore, quiz, ISO 19011 advisory, RLS, ecc.).
- Come funziona **esattamente** il flusso "clip avatar → piattaforma" (upload → clip-map → manifest →
  `ingestCourse` con validazione monte-ore → player firmato), citando i file.
- Dove siamo **rimasti** e quali sono i vincoli di compliance che impattano la produzione dei corsi.
- Eventuali dubbi o punti ambigui che vuoi chiarire con me.

## 3. Regole di comportamento per questa sessione
- **Non scrivere codice e non fare modifiche** finché non ci siamo allineati sulla sintesi al punto 2.
- Rispetta `CLAUDE.md`: semplicità (niente over-engineering), modifiche chirurgiche, **commit firmati
  SOLO come DocAllfix** (nessun trailer Claude/Anthropic), modifiche DB solo via migration versionata.
- Contenuto dei corsi **originale** (le norme ISO sono coperte da copyright: mai copia verbatim).

## 4. Poi
Quando mi hai dato la sintesi, ti allego **`docs/produzione-corsi/BRIEF-PRODUZIONE-AVATAR.md`**: spiega
nel dettaglio tutta la situazione della generazione avatar/audio (obiettivi, pipeline audio-prima,
MuseTalk, GPU/costi, orchestrazione, seam di ingest, criteri di successo). Lo leggi e **proponi tu come
orchestrare** il lavoro — verosimilmente partendo da un **pilota** (un modulo/corso end-to-end) per
misurare tempi/costi/qualità reali prima del batch completo.
