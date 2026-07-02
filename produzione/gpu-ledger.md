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
| 2026-07-02 | 43588120 | A/B voce XTTS (tentativo 3, immagine runtime 2,5GB) | RTX 4090 · Romania | **$0,3414** | in corso | — | ⏳ |
| 2026-07-02 | 43588122 | A/B voce CosyVoice (tentativo 3, immagine runtime) | RTX 4090 · Ungheria (6,8 Gbps) | **$0,4276** | in corso | — | ⏳ |

**Totale speso finora: ~$0,81** (di cui ~$0,44 il tentativo fallito — lezione: il `dph_total`
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
