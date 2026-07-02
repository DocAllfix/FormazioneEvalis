# RICETTA TTS — parametri FISSI e vincolanti per la produzione audio

> **Scopo.** Ogni difetto sentito nei provini del 2026-07-02 ha una causa meccanica precisa e una
> regola che lo rende impossibile. Queste regole sono LEGGE per qualsiasi generazione audio del
> catalogo (232h): vanno implementate in UN modulo condiviso (`scripts/produzione/tts_ricetta.py`,
> da estrarre dai casting v6/v7 prima del pilota M1) che ogni motore è OBBLIGATO ad attraversare.
> Niente fix sparsi per script: una sola ricetta, testata, versionata.

## 1. Testo (prima della sintesi) — vale per OGNI motore

| Regola | Perché (difetto che elimina) |
|---|---|
| Frase-per-frase, MAI blocchi multi-frase | i punti interni ai blocchi vengono LETTI ("punto") da XTTS |
| Nessuna frase oltre **213 caratteri** (le lunghe si spezzano all'ultima virgola) | oltre il limite XTTS tronca l'audio a metà parola ("soddisfatto") |
| Punto finale RIMOSSO da ogni frase ("?" e "!" restano) | bug noto XTTS: legge il "." (issue coqui #2952/#3701) |
| Glossario pronuncia applicato: numeri per esteso spaziati ("diciannove milaundici"), sigle sillabate ("I E C") | il TTS inventa la lettura dei numeri lunghi |
| Riscritture accentate: "àudit", "àuditor" (confini di parola, mai dentro "auditare") | stress sbagliato sui prestiti inglesi |
| ECCEZIONE F5-italiano: la punteggiatura si CONSERVA | il finetune la usa per pause/intonazione (addestrato così) |

## 2. Riferimento voce (per i motori a clonazione)

| Regola | Perché |
|---|---|
| Pulizia SEMPRE: denoise (afftdn) + taglio silenzi + loudnorm | riferimento sporco = sillabe allucinate |
| Durata: **8-12 secondi**, il segmento a massima energia parlata | F5 accetta max 15s; segmenti lunghi = stima durata rotta (audio schiacciato/troncato) |
| `ref_text` = trascrizione Whisper DEL SEGMENTO usato (mai dell'audio intero) | ref_text sbagliato = ritmo/durata sballati |
| Il riferimento DONA anche il RITMO (soprattutto F5): sample frettoloso = clone frettoloso | il "200 all'ora" di F5; compensare con `speed` ~0,75-0,8 o sample posato |

## 3. Post-processing (dopo la sintesi) — vale per OGNI motore

| Regola | Perché |
|---|---|
| Trim SOLO in testa, soglia dolce (-55dB) | il trim aggressivo in coda mangiava le sillabe finali deboli |
| Coda: fade-out 60ms (mai taglio) | parole mai troncate |
| Gap tra frasi: **0,28s esatti** di silenzio + micro-fade | XTTS lascia silenzi residui propri: senza trim+gap esatto le pause si sommano (pause doppie percepite come "blocchi") |
| MAI rumore sintetico nelle pause | il fruscio che appare/scompare = "rumore arbitrario" |
| RMS normalizzato per frase (target unico) | picchi di volume ("urla") |

## 4. Parametri motore (consolidati dai test)

- **XTTS**: temperature **0,70** · repetition_penalty **9-9,5** · top_k 50 · top_p 0,85 · speed 0,96
  · gpt_cond_len 30 (variante "fedele") · torch **==2.4.0** · transformers **>=4.57,<5**
- **F5-italiano**: nfe_step **64** · cfg 2.0 · sway -1.0 · speed **0,75-0,8** (compensa il ritmo
  del riferimento) · checkpoint = lo step PIÙ ALTO del repo (download SELETTIVO, mai snapshot intero)
- **Limite accettato XTTS**: pronuncia dei prestiti inglesi resta stocastica (~qualche % delle frasi)
  → in produzione la becca il QA e si rigenera LA SINGOLA FRASE (mai il corso).

## 5. Infrastruttura pod (lezioni pagate ~$3, non ripagarle)

1. **Un motore = un venv** (transformers incompatibili tra coqui/chatterbox/qwen: si azzoppano)
2. torch pinnato ==2.4.0 (il 2.12 rompe coqui in silenzio)
3. bootstrap: boto3 per il download (mai curl sigv4), unzip nell'apt, rclone con --s3-no-check-bucket,
   verifica `command -v rclone` FATALE
4. create→verify→**start** (istanze nate `stopped` con success:false)
5. watchdog SEMPRE (stato+log ogni 2 min, allarmi stallo/loading)
6. host 34031 blacklist · immagine `-runtime` · disco 80GB se multi-modello · download HF selettivi
7. bootstrap collaudato su 1 pod PRIMA di scalare a N

## 6. Il gate finale che rende tutto sostenibile su 232h

La ricetta riduce i difetti, il **QA li azzera**: ogni audio passa Whisper round-trip (similarità
col copione), silence-check e loudness (QA-PRE-LIVE §B). Ciò che sfugge alla ricetta (pronuncia
stocastica) viene FLAGGED e si rigenera la singola frase/slide. Costo di rigenerazione per frase:
centesimi. È il matrimonio ricetta+QA che regge la scala, non la perfezione del motore.
