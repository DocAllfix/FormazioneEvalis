# Eccezioni QA — fadpdr125

Residui dei controlli automatici giudicati ERRORI DEL GIUDICE, con la motivazione.

## Giudice di contestualità (qa-contestualita.mjs)

- **fadpdr125_m05_s004 — FAIL "Punteggio errato: 53 invece di 53".** Il giudice si contraddice:
  il copione dice "cinquantatré punti su cento", "mancano sette punti", "quindici indicatori su
  trentuno applicabili"; la slide mostra 53, 60 (soglia), 7, 15/31. Cifre verificate anche sulla
  fonte del committente (somma ponderata 9,0 + 9,0 + 6,0 + 9,0 + 8,0 + 12,0 = 53,0; 15 su 31).
  Confusione nota del giudice tra numeri in lettere nel parlato e cifre a schermo.

## Gate impaginazione (gate-slides.mjs)

- 39 WARN, tutti di tipo S7 (titolo del copione poco rintracciabile a schermo): accettati come
  nei corsi precedenti. 0 FAIL, altezza massima 720 px.

## qa-risposte-quiz (05/10/2026): 7 disaccordi nell'esame finale, tutti errori del giudice

Il giudice risponde dal materiale che vede e su queste domande sceglie il distrattore. Verifica a mano:

| Domanda | Marcata | Giudice | Perché la marcata è giusta |
|---|---|---|---|
| 44 dipendenti + 3 titolari + 4 coadiuvanti | b (fascia 3) | a | la prassi conta gli addetti (def. 3.1: titolari partecipanti e coadiuvanti familiari compresi) = 51 |
| Pesi delle sei aree | c (15/15/10/20/20/20) | a | pesi della prassi, in ordine |
| FAQ 2026, indicatore non misurabile | c (zero, nessuna esclusione) | a | fonte m04 r.203 |
| Opportunità di crescita in fascia 3 | d (2, 4, 5, 6, 7) | c | fonte m04 r.366: l'1 è delle fasce 1-2, il 3 della fascia 2 |
| Punti 100/80/70/25/40/55 | b (58,0, non certificabile) | a | 15+12+7+5+8+11 = 58 < 60 |
| Esonero su 900.000 € di contributi | d (9.000 €) | c | 1% dei contributi a carico del datore, tetto 50.000 € |
| Garanzia 40.000 € | c (16.000 €) | b | 50% PMI e poi 20% sul residuo |
