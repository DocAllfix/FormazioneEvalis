# Registro costi GPU — produzione corsi

> Regola (richiesta utente 2026-07-02): OGNI pod noleggiato va registrato qui con il suo prezzo
> orario ESATTO (`dph_total`, che include il disco — non il prezzo di listino della search),
> scopo, durata e costo effettivo. Le oscillazioni di centesimi su decine di pod cambiano il
> totale in modo non trascurabile: il dimensionamento del blitz (12/16/32-48 GPU) si decide
> anche su questi numeri reali.

| Data | Istanza | Scopo | GPU | $/h esatto | Durata | Costo | Esito |
|---|---|---|---|---|---|---|---|
| 2026-07-02 | 43582821 | A/B voce XTTS (tentativo 1) | RTX 4090 · Finlandia | ~$0,363 | ~35 min | ~$0,21 | ❌ bootstrap fallito (bug curl 7.81 + firma S3 R2) — distrutto |
| 2026-07-02 | 43582823 | A/B voce CosyVoice (tentativo 1) | RTX 4090 · Svezia | ~$0,388 | ~35 min | ~$0,23 | ❌ idem — distrutto |
| 2026-07-02 | 43585253 | A/B voce XTTS (tentativo 2) | RTX 4090 · Finlandia | $0,3633 | ~30 min | ~$0,18 | ❌ host bloccato in `loading` (pull immagine mai completato) — distrutto |
| 2026-07-02 | 43585266 | A/B voce CosyVoice (tentativo 2) | RTX 4090 · Svezia (host 34031) | $0,3878 | ~30 min | ~$0,19 | ❌ idem — host 34031 in blacklist |
| 2026-07-02 | 43588120 | A/B voce XTTS (tentativo 3, immagine runtime 2,5GB) | RTX 4090 · Romania | $0,3414 | ~25 min | ~$0,14 | ❌ pipeline ok ma bug NOSTRI: transformers vecchio (import XTTS fallito) — distrutto |
| 2026-07-02 | 43588122 | A/B voce CosyVoice (tentativo 3, immagine runtime) | RTX 4090 · Ungheria (6,8 Gbps) | $0,4276 | ~25 min | ~$0,18 | ❌ requirements CosyVoice falliti in silenzio (pynini) — distrutto |
| 2026-07-02 | 43589092 | A/B voce XTTS (tentativo 4) | RTX 4090 · Romania | $0,3414 | ~60 min | ~$0,34 | ✅ **2 sample generati: 612s audio in 255s GPU (2,4× realtime)** + snapshot modello su R2 |
| 2026-07-02 | 43589098 | A/B voce CosyVoice (tentativo 4, fix live via SSH) | RTX 4090 · Ungheria | $0,4276 | ~85 min | ~$0,61 | ✅ **2 sample generati: 1.494s audio in 1.076s GPU (1,4× realtime)** + snapshot modelli/whisper su R2 |

| 2026-07-02 | 43598093 | CASTING voce narrante (58 speaker XTTS classificati per somiglianza col cliente + Kokoro; niente clonazione) | RTX 4090 · Bulgaria | $0,3609 | ~35 min | ~$0,21 | ✅ 58 provini + ranking + 6 provini completi su R2 (1 rilancio: mancava unzip → rclone) |

| 2026-07-02 | 43600020 | rigenerazione (nato e distrutto subito: fix env spazi) | RTX 4090 · Bulgaria | $0,3609 | ~3 min | ~$0,02 | ↺ |
| 2026-07-02 | 43600133 | Rigenerazione provini v2 (Luis Moray + Kokoro, fix punto/àudit/cadenza) | RTX 4090 · Bulgaria (host caldo) | $0,3609 | ~12 min | ~$0,07 | ✅ 2 provini v2 su R2, snapshot XTTS da R2 funzionante |

| 2026-07-02 | 43601480 | Casting v3: XTTS profondità F0 (58 voci) + Chatterbox predefinite + Qwen3 voice design | RTX 4090 · Bulgaria | $0,3711 | ~45 min | ~$0,28 | ✅ 9 provini + 2 classifiche Hz; lezione GROSSA: un motore = un venv (transformers incompatibili), torch ≤2.4 per coqui |

| 2026-07-02 | 43609008 | Voce cliente: 4+2 varianti XTTS perfezionate + 2 F5 italiano (paralleli) | RTX 4090 · Bulgaria | $0,3609 | ~75 min | ~$0,45 | ✅ 8 provini; F5 = ~20-25× realtime (!) ma output troncato a 22s (ref >15s, fix noto); disco pieno da repo 18-checkpoint (lezione: download selettivo) |

| 2026-07-02 | 43611957 | Casting v6: fix pause XTTS (trim+gap esatto, no rumore sintetico) + fix velocità F5 (ref 10s) | RTX 4090 · Bulgaria | $0,3609 | ~30 min | ~$0,18 | ✅ A3+D3+F5v2; MA v6 ha reintrodotto "punto" (punti INTERNI ai blocchi) e tagli (blocchi >213 char) → regole in RICETTA-TTS.md |
| 2026-07-02 | 43613827 | Casting v7 (nato e distrutto: split su 2 pod) | RTX 4090 · Ungheria | $0,4276 | ~5 min | ~$0,04 | ↺ |
| 2026-07-02 | 43613998 | Casting v7 pod A: Azzurra + Sibilia (gender check) | RTX 4090 · Ungheria | $0,4276 | ~30 min | ~$0,21 | ✅ **ENTRAMBE ESCLUSE: voci femminili** (Azzurra 191,6 Hz) — check da 60s ha evitato 2 provini interi |
| 2026-07-02 | 43614004 | Casting v7 pod B: VoxCPM2-clone + Qwen3-clone (voce cliente, ricetta completa) | RTX 4090 · Norvegia | $0,5352 | ~35 min | ~$0,31 | ✅ 2 provini (fix al volo: triton vuole build-essential) |

| 2026-07-02 | 43616145 | Casting v8 pod A: XTTS ricetta + F5 speed 0,78 | RTX 4090 · Polonia | $0,3654 | ~35 min | ~$0,21 | ✅ **v8-xtts = GOLDEN SAMPLE approvato dall'utente** |
| 2026-07-02 | 43616148 | Casting v8 pod B + v9el (4 motori su ref ElevenLabs) + v10 (3 ref EL via tts_ricetta) | RTX 4090 · Bulgaria | $0,4014 | ~2h50 | ~$1,14 | ✅ v8 vox/qwen + pron test · v9el ×4 (v9el-xtts = il preferito) · v10 ×3 · fix torch cu126 (driver 12.6) + VoxCPM device=cuda |
| 2026-07-02 | 43621380 | v11: XTTS virgola-finale (anti-ingoio) + VoxCPM fix in-context (ref EL1 + ref_text esatto) | RTX 4090 · Ungheria | $0,4415 | ~35 min | ~$0,26 | ✅ 2 provini finali |

| 2026-07-02 | 43623701 | v12 DEFINITIVO: XTTS 3min ricetta completa + cronometro | RTX 4090 · Romania | $0,3136 | ~25 min | ~$0,13 | ✅ **198,8s audio in 35,7s = 5,57× realtime** (load 12s da snapshot) |
| 2026-07-02 | 43623705 | v12 DEFINITIVO: VoxCPM 3min fix in-context + cronometro | RTX 4090 · Ungheria | $0,3890 | ~40 min | ~$0,26 | ✅ 165s audio in 88,2s = 1,87× realtime (load 141s) |

**Totale speso GIORNATA: ~$5,45 · Esito: GOLDEN SAMPLE (v8/v9el-xtts) + tts_ricetta.py con seed deterministici + metodo del riferimento raffinato ElevenLabs + ~50 provini (v2→v11) + tutte le lezioni scritte. Istanze attive a fine giornata: 0.**

| 2026-07-03 | 43680811 | PILOTA M1 pod A (s001-007) + snapshot env/HF su R2 | RTX 4090 · Ungheria | $0,3823 | ~45 min | ~$0,29 | ✅ 7 slide, QA loop live (1 FLAGGED auto-segnalato) — 3 tentativi bootstrap (snapshot-branch, env SSH) |
| 2026-07-03 | 43680812 | PILOTA M1 pod B (s008-013) | RTX 4090 · Ungheria | $0,3903 | ~30 min | ~$0,20 | ✅ 6 slide, zero flagged |

**PILOTA M1: 56,3 min di corso in 32,2 min GPU (1,75× medio, ~2,0× a regime) · 257 blocchi QA · 1,2% retry · 0,4% FLAGGED · proiezione: corso 19011 ≈ $3,50, catalogo ≈ $45-50.**

## Dati misurati (2026-07-02, riferimento per dimensionare il burst TTS del blitz)

- **XTTS v2**: 2,4× realtime su 4090 (incluso caricamento modello) · ritmo parlato ~2,0 parole/s
  → 232h di catalogo ≈ **97 ore-GPU** ≈ 5 pod per farlo in una notte, ~20 pod in ~5h.
- **CosyVoice2**: 1,4× realtime · MA ritmo parlato ~0,8 parole/s (audio 2,4× più lungo degli
  stessi testi: da capire all'ascolto se è pausa/lentezza patologica o cadenza del riferimento).
- I due ritmi cambiano la calibrazione dei copioni: con XTTS ~2,0 p/s reali (budget provvisorio
  2,4 era ottimista del 20%); riconciliazione monte-ore lo assorbe. (di cui ~$0,44 il tentativo fallito — lezione: il `dph_total`
reale è ~4-7% sopra il prezzo di search, e il bootstrap va sempre collaudato su UN pod prima
di lanciarne N).

## Lezioni operative accumulate

1. `curl --aws-sigv4` sul pod (Ubuntu 22.04, curl 7.81) NON firma correttamente verso R2
   ("Missing x-amz-content-sha256") → il bootstrap usa **boto3** (sempre affidabile con R2).
2. `vastai execute` accetta solo comandi ristretti → non si può riparare un onstart rotto da
   remoto senza SSH: se il bootstrap fallisce, si distrugge e si ricrea (5 min col fix).
3. `success: false` nella risposta di `vastai create` non è affidabile: verificare SEMPRE con
   `vastai show instances` cosa esiste davvero prima di ricreare.
4. Al blitz: collaudare il bootstrap su 1 pod, POI scalare a N. Mai N pod con bootstrap non provato.
5. `loading` oltre ~15-20 min = host lento a fare il pull dell'immagine → distruggere e cambiare
   host (il watchdog ora lo segnala a 20 min). Host 34031 (Svezia) in blacklist per questo.
6. Immagine `pytorch:*-runtime` (2,5GB) invece di `-devel` (8GB) quando non serve compilare:
   pull 3× più veloce, meno finestre di fallimento.
7. Watchdog SEMPRE attivo sui pod (stato + gpu_util + log ogni 2,5 min, allarme stallo/loading):
   un pod rotto in silenzio si vede in minuti, non a fine timeout.
8. `vastai create` con "success: false" ma istanza esistente = istanza creata FERMA
   (`intended_status: stopped`): controllare intended_status e fare `vastai start`. Al blitz:
   il controllo create→verify→start va nello script di orchestrazione, mai a mano.
