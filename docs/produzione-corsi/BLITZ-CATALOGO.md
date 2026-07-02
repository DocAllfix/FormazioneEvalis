# BLITZ catalogo — produzione dei 10 corsi in 2 giorni (processo operativo)

> **Obiettivo.** Produrre l'INTERO catalogo (~232h, ~3.000 slide, 10 corsi) in ~2 giorni di
> lavorazione, parallelizzando ogni fase in modo ordinato, senza perdere precisione né qualità.
> Regola di fondo invariata: pipeline AUDIO-PRIMA + ID canonico `<corso>_mNN_sNNN` ovunque.
> Riferimenti: piano pilota/orchestrazione (`~/.claude/plans/quello-che-voglio-in-quirky-axolotl.md`),
> QA (`docs/produzione-corsi/QA-PRE-LIVE.md`), toolkit (`scripts/produzione/`, collaudato — Gate A ok).

## Decisioni fissate

1. **Ordine**: prima il pilota (M1 19011) che fissa voce/base/tempi; il contratto template va a
   claude design SUBITO DOPO la scelta del video base (la zona avatar deve combaciare con la sua
   proporzione, misurata con ffprobe). Poi blitz su tutto il catalogo.
2. **Input a claude design**: poche specifiche = risultato migliore. Riceve SOLO: palette (2 temi),
   logo, zona avatar fissa a sinistra (riferimento visivo `slide4-check.jpeg`), limiti anti-overflow,
   e `slide-content.json` per corso (per ID: titolo, kicker, 3-6 punti brevi, elemento visivo
   suggerito, termini chiave — estratto DAI copioni, che restano l'unica fonte di verità).
   MAI i copioni discorsivi grezzi, MAI il testo della norma.
3. **GPU**: pilota 1×4090 on-demand; blitz **12×4090 interruptible** (~20-24h per tutto il render,
   ~$60-120 totali). Audio/QA su 1-2 GPU dedicate in continuo.
4. **TTS**: A/B XTTS v2 vs CosyVoice2, vince la qualità a orecchio dell'utente (licenza XTTS:
   rischio accettato dall'utente, agli atti).
5. **Pubblicazione ≠ produzione**: si PRODUCE tutto in 2 giorni; si PUBBLICA corso per corso dopo
   la revisione mirata umana (~1h a corso: contact sheet + clip FLAGGED + campione 3-5%).
   Nessun corso arriva ai clienti senza occhio umano. NON comprimibile.

## Parallelizzazione ordinata (stessa disciplina a ogni livello)

- **Contenuti**: 1 job di scrittura per MODULO (~90 moduli totali), ognino riceve: il suo capitolo
  di norma (da `testonorme/`), lo skeleton del corso, il Modulo 1 19011 come riferimento di stile,
  i limiti A.2 del template. Output: copioni + banca quiz del modulo, ID canonici. I moduli non
  condividono stato → nessuna collisione, stesso principio degli shard GPU.
- **Audio**: appena un modulo chiude → TTS + ffprobe + Whisper QA + reconcile + LOCK di quel modulo.
  L'audio non aspetta il catalogo: gira in continuo.
- **Render**: shard statici disgiunti (`make-shards`, `indice % N`), worker per GPU, gate per clip,
  sync R2 immediato. Idempotente: un crash = si riparte dai mancanti.
- **Upload Stream + clip-map: SINGLE-WRITER** — un solo processo, mai i pod in parallelo.
- **Slide**: claude design impagina corso per corso da `slide-content.json` sul template congelato;
  non blocca mai audio/render (le slide servono solo all'ingest).
- **Anti-mescolamento (5 barriere, già collaudate col test di sabotaggio)**: ID = nome file =
  clipKey = chiave clip-map · tag ID nei metadati mp4 · cross-check durate ±1s bloccante
  all'ingest · Whisper round-trip per ID · verifica DB/Cloudflare pre-pubblicazione.

## Calendario del blitz

| Giorno | Attività | Gate |
|---|---|---|
| **G0** (mezza giornata) | Pod su · A/B voce (utente sceglie a orecchio) · check watermark/qualità base (utente) · glossario pronuncia sigle · calibrazione parole/s · contratto template → claude design (template + 13 slide M1) · utente approva TONO dei copioni M1 con la voce vera | voce+base+tono approvati |
| **G1** | Skeleton dei 9 corsi (norma→moduli, budget minuti) · fan-out copioni per modulo · TTS+QA+LOCK a rullo sui moduli chiusi · quiz generati coi copioni · slide-content.json per corso · claude design impagina | somma durate ≥ monte-ore per ogni corso lockato |
| **G2** | Render 12×4090 a shard · gate per clip · upload single-writer · ingest corso per corso · passata Playwright + contact sheet | ingest passa per tutti; qa-report per corso |
| **G3+** (post-blitz) | Revisione mirata utente ~1h/corso → publish progressivo | checklist QA-PRE-LIVE per corso |

## Prerequisiti (input SOLO utente — bloccano G0)

- [ ] `produzione/asset/base-neo2.mp4` (1 min, senza watermark) + `produzione/asset/base-alt.mp4` (3 min)
- [ ] `produzione/asset/voce-riferimento.wav` (10-30s puliti, senza musica) + conferma diritti voce
- [ ] Account Vast.ai con credito (~$25 per il blitz a 12 GPU) — guidato
- [ ] Bucket R2 `evalis-produzione` (2 min dal dashboard Cloudflare) + token Stream dedicato produzione

## Costi blitz (stime, il pilota le rende certe)

Render catalogo ~$60-120 (interruptible) · TTS+QA ~$25-35 · R2 ~$0-2/mese · Stream: solo al
publish (pro-rata; ~$70/mese a catalogo pieno = go-live). Totale compute blitz: **~$100-160**.
