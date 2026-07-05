# REVISIONE-MERITO — contratto per l'agente-revisore semantico

> Terzo livello di garanzia, dopo i gate meccanici (lint E1-E9 + spellcheck) e prima del
> merge definitivo. Mentre i gate controllano la FORMA, questa revisione controlla la
> SOSTANZA: che ogni slide sia tecnicamente accurata, precisa e fondata sulla norma.
> Un revisore NON riscrive: LEGGE e SEGNALA. Le slide segnalate tornano all'autore.

## Cosa riceve il revisore
- Il modulo scritto (JSON con tutte le slide + banca).
- La sezione ESATTA della norma da cui il modulo doveva nascere (la stessa del pacchetto).
- La lista dei concetti/blocchi che il modulo doveva coprire.

## Cosa verifica, slide per slide (nessuna slide esclusa)

1. **Fondatezza sulla norma**: ogni affermazione presentata come "la norma dice/richiede/
   prevede" corrisponde davvero a quanto c'è nella sezione consegnata? Nessun requisito
   INVENTATO, nessuna clausola DISTORTA, nessun numero/soglia/obbligo attribuito alla
   norma che non c'è. Il contenuto metodologico o di buona pratica va bene, ma NON deve
   essere spacciato per prescrizione della norma se la norma non lo dice.
2. **Accuratezza tecnica**: definizioni, termini e meccanismi sono corretti e coerenti col
   vocabolario della norma? Nessuna spiegazione plausibile-ma-sbagliata (es. confondere
   risultanza e conclusione, campo di applicazione e piano, correzione e azione correttiva).
3. **Contestualità**: la slide sviluppa il blocco/argomento che le compete, senza divagare
   fuori tema o anticipare in modo confuso argomenti di altri moduli?
4. **Coerenza interna**: nessuna contraddizione tra slide dello stesso modulo (una slide
   afferma X, un'altra il contrario).
5. **Esempi**: gli esempi concreti sono realistici e NON fuorvianti (un esempio sbagliato
   insegna una cosa sbagliata: va segnalato come un errore, non come dettaglio).
6. **Promesse normative false**: nessuna slide promette allo studente cose non vere sullo
   schema di certificazione, sugli obblighi di legge, o sul valore del titolo.

## Cosa NON è compito del revisore
- Non giudica lo stile, la lunghezza, gli accenti, i verbatim, la punteggiatura: quelli
  sono già passati dai gate meccanici. Non ripetere quel lavoro.
- Non riscrive le slide: solo segnala. La riscrittura la fa l'autore del modulo.

## Output del revisore (JSON)
```json
{
  "modulo": "mNN",
  "esito": "PULITO" | "DA_CORREGGERE",
  "segnalazioni": [
    { "slide": "sNNN", "gravita": "alta|media", "problema": "descrizione precisa di cosa non va e perché", "riferimento_norma": "cosa dice davvero la sezione, se pertinente" }
  ]
}
```
- **gravita alta**: errore che insegna una cosa sbagliata o attribuisce falsamente alla
  norma (DEVE essere corretto prima del merge).
- **gravita media**: imprecisione, contestualizzazione debole, esempio migliorabile
  (correggere se semplice; altrimenti annotare).
- Se il modulo è pulito: `esito PULITO`, `segnalazioni []`. Non inventare problemi per
  giustificare il lavoro: un modulo può essere corretto.

## Posto nel processo (per ogni modulo)
1. Autore scrive la bozza → 2. gate meccanici (lint+spellcheck) verdi → 3. **revisore
semantico** (questo contratto) → 4. se DA_CORREGGERE, l'autore corregge le segnalazioni
alta/media → 5. re-gate → 6. merge in copioni.json → 7. (a corso completo) coerenza
cross-modulo + banca esame + LOCK.
