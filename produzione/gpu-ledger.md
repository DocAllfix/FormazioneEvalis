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
| 2026-07-02 | 43585253 | A/B voce XTTS (fix boto3) | RTX 4090 · Finlandia | **$0,3633** | in corso | — | ⏳ |
| 2026-07-02 | 43585266 | A/B voce CosyVoice (fix boto3) | RTX 4090 · Svezia | **$0,3878** | in corso | — | ⏳ |

**Totale speso finora: ~$0,44** (di cui ~$0,44 il tentativo fallito — lezione: il `dph_total`
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
