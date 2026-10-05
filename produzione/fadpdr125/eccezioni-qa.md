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
