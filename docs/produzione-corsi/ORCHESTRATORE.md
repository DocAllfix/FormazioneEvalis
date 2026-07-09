# ORCHESTRATORE — Fabbrica v3: copioni (GPT-5/Azure) + audio (Azure TTS)

> Documento di riferimento dell'architettura. Congela le decisioni del 2026-07-08/09.
> I contratti di contenuto restano FABBRICA-MODULO.md, QUIZ-STANDARD.md, REVISIONE-MERITO.md.

## Perché la v3

La fabbrica v2 (agenti in sessione, condotta a mano) ha prodotto 19011 e 9001 con qualità
verificata, ma il collo di bottiglia era la quota di sessione condivisa. La v3 sposta la
generazione su **API diretta Azure OpenAI** (deployment 20M TPM, region UE) orchestrata da
script: stesso pipeline, stessi controlli, throughput non più vincolante. In parallelo il
motore audio passa da VoxCPM (GPU self-hosted, pronunce da presidiare) ad **Azure TTS**
(voci neurali it-IT affidabili, batch synthesis, word-boundary per il sync avatar).

## Principio non negoziabile

I **3 livelli di controllo** non si toccano, con qualunque modello:
1. **Gate meccanici** (lint E1-E9 + quiz-lint + spellcheck) — FORMA, bloccanti.
2. **Revisore semantico** (contratto REVISIONE-MERITO, contro la stessa sezione di norma) — SOSTANZA, bloccante su gravità alta.
3. **Occhio umano** (revisione Claude/utente per modulo + coerenza per corso) — giudizio finale.

La velocità viene dal parallelismo e da draft frontier puliti, mai dall'indebolire i gate.

## Architettura

```
base congelata (testonorme/*.txt + struttura.md + contratti + glossari + coperture)
        │
  NASTRO A — copioni · scripts/produzione/orchestratore.py
  parallelo TRA moduli (Semaphore ~20) · sequenziale DENTRO (blocchi 10+10+8)
  per modulo: gen-pacchetto → GPT-5 (JSON schema) → gate meccanici → revisore semantico
  → revisione umana → merge-bozza. Per corso: coerenza cross-modulo + esame finale
  (scritto a mano, mai delegato) → LOCK
        │  🔒 LOCK = cancello: mai audio su testo non validato
        ▼
  NASTRO B — audio · scripts/produzione/azure_tts.py + notturno.py
  copioni→SSML(+lexicon.pls) → batch synthesis job → wav + word-boundary → QA leggero
  → MuseTalk (GPU, notte, sync sui word-boundary) → mux → registro durate reali
  → riconciliazione monte-ore ≥ legale (bloccante)
```

- **Unità di lavoro = il modulo**: atomico, idempotente, stato nei file (`_bozze/`,
  `copioni.json`, git). Un modulo fallito si rilancia da solo.
- **Parallelo tra moduli, mai tra slide**: le slide dipendono l'una dall'altra
  (transizioni, anti-ripetizione, arco del modulo); i moduli no.
- **Prompt caching**: prefisso stabile (contratto + stile + glossario) prima, parte
  variabile (sezione norma + blocco skeleton) dopo.
- **Revisore semantico automatizzato** = chiamata GPT-5 col contratto REVISIONE-MERITO;
  il livello 3 resta umano/Claude → di fatto cross-family.

## Azure TTS — decisioni

- **Batch Synthesis API** (`/texttospeech/batchsyntheses`, api-version 2024-04-01):
  PUT job → poll → ZIP di wav. Mai la Long Audio API (in ritiro apr 2027).
- `wordBoundaryEnabled: true` → per ogni input un `.word.json` (offset+durata ms per
  parola) → sync labiale MuseTalk senza stime.
- Output `riff-24khz-16bit-mono-pcm`. Voce it-IT dal `voce-manifest.json`.
- **`lexicon.pls`** per le eccezioni di pronuncia (sostituisce grafia AUditor + ref v2
  di VoxCPM). Si compila SOLO dopo il test d'ascolto — la ricetta Vox resta intatta
  finché la voce Azure non è promossa dall'utente su 19011 M1.
- Costo atteso catalogo (~13M char): ~$195 standard / ~$285 HD.

## Fasi e gate (dettaglio nel piano di sessione)

| Fase | Cosa | Gate di uscita |
|---|---|---|
| 0 | credenziali + smoke test | 1 completion GPT-5 + 1 sintesi TTS → 200 |
| 1 | orchestratore.py | end-to-end su modulo di prova + kill/ripresa + sabotaggio beccato (E5 + semantico) |
| 2 | taratura 45001 M1 | segnalazioni ≈ benchmark 9001 → go; altrimenti A/B modello |
| 3 | catalogo copioni (8 corsi) | per corso: lint verde + PULITO semantico + riconcilia ≥ +1% + esame + LOCK |
| 4 | azure_tts.py | M1 19011 sintetizzato, ascolto utente promosso, word-boundary coerenti |
| 5 | avatar + notturno.py | M1 end-to-end video + sabotaggio audio rilevato e riparato |
| 6 | audio catalogo | per corso: durate reali ≥ monte-ore + spot-check 3 slide/modulo |

## Credenziali (mai in repo)

`.env.produzione` (gitignorato; template in `.env.produzione.example`):
- `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_DEPLOYMENT` (GPT-5 full)
- `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` (UE), `AZURE_SPEECH_VOICE` (it-IT-…)

## Ordine di produzione copioni

45001 → 27001 → 14001 → 22000 → 37001 → 42001 → 50001 → 39001.
L'audio (Nastro B) insegue i LOCK; 19011 e 9001 già LOCKED sono i primi in coda audio.
