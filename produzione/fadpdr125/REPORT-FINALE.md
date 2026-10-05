# Report finale di produzione — Parità di genere UNI/PdR 125:2022 — FAD-PDR125-01 (8h)

Generato il 2026-10-05 14:58.

## Riepilogo

| Voce | Valore |
|---|---|
| Slide totali | 108 |
| Slide presenti in piattaforma | 0 |
| Clip nuove prodotte | 108 |
| Clip riusate dall'edizione precedente | 0 |
| Audio totale | 513m 44s (513.7 min) |
| Monte ore legale | 480 min |
| Margine sul monte ore | 7.0% |
| Slide senza clip | 0 |
| Slide senza audio | 0 |
| Fallimenti impaginazione | 0 |
| Fallimenti contestualità | 1 |
| Slide provate in piattaforma (Playwright) | 108 |
| Fallimenti apertura in piattaforma | 0 |
| Clip audio passate al QA silenzi+volume | 0 |
| Clip audio segnalate dal QA | 0 |
| Risposte quiz in disaccordo col giudice | 7 su 115 |

## Quiz

- checkpoint m01: banca 11 domande, ne estrae 5, soglia 80%
- checkpoint m02: banca 14 domande, ne estrae 5, soglia 80%
- checkpoint m03: banca 14 domande, ne estrae 5, soglia 80%
- checkpoint m04: banca 11 domande, ne estrae 5, soglia 80%
- checkpoint m05: banca 21 domande, ne estrae 5, soglia 80%
- checkpoint m06: banca 12 domande, ne estrae 5, soglia 80%
- esame finale: banca 32 domande, ne estrae 20, soglia 75%

Chiave di correzione verificata da un giudice indipendente: 108/115 concordi.

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

## Slide, una per una

| ID | Titolo | Parole | Audio | Parole/min | Origine | Clip | In piattaforma | Impaginazione | Contestualità | QA audio (LUFS) | Apertura |
|---|---|---|---|---|---|---|---|---|---|---|---|
| fadpdr125_m01_s001 | Benvenuta, mappa del percorso e idea central | 598 | 4m 22s | 137 | nuovo | 905d0a4a34… | no | WARN | — | — | PASS |
| fadpdr125_m01_s002 | Come funziona il percorso e come conviene se | 653 | 4m 47s | 136 | nuovo | b9d40158f1… | no | PASS | — | — | PASS |
| fadpdr125_m01_s003 | Prima il sistema, poi i numeri | 632 | 4m 59s | 127 | nuovo | d342c73821… | no | PASS | — | — | PASS |
| fadpdr125_m01_s004 | Il caso ricorrente di Logistica Tifata | 668 | 4m 59s | 134 | nuovo | c3205f386d… | no | PASS | — | — | PASS |
| fadpdr125_m01_s005 | Una prassi di riferimento non è una norma IS | 655 | 4m 47s | 137 | nuovo | a878f9df8e… | no | PASS | — | — | PASS |
| fadpdr125_m01_s006 | Il limite dei cinque anni e il tema della sc | 617 | 4m 27s | 139 | nuovo | 455bcd5794… | no | PASS | — | — | PASS |
| fadpdr125_m01_s007 | Com'è fatta la UNI/PdR 125:2022 e in che ord | 635 | 4m 36s | 138 | nuovo | c09155c6c8… | no | WARN | — | — | PASS |
| fadpdr125_m01_s008 | Certificare sotto accreditamento: chi rilasc | 583 | 4m 24s | 133 | nuovo | 458bcc0b39… | no | PASS | — | — | PASS |
| fadpdr125_m01_s009 | Le FAQ UNI Accredia e perché l'edizione gius | 627 | 5m 1s | 125 | nuovo | 5da87d6cca… | no | PASS | — | — | PASS |
| fadpdr125_m01_s010 | Che cosa valuta davvero la certificazione | 645 | 4m 46s | 135 | nuovo | 3c8cf0baf1… | no | PASS | — | — | PASS |
| fadpdr125_m01_s011 | La legge 162 del 2021: la cornice che ha acc | 630 | 5m 9s | 122 | nuovo | 414f7a7505… | no | WARN | — | — | PASS |
| fadpdr125_m01_s012 | Il rapporto biennale sulla situazione del pe | 636 | 5m 6s | 125 | nuovo | 91bc58bfc0… | no | PASS | — | — | PASS |
| fadpdr125_m01_s013 | Certificazione volontaria e non obbligatoria | 637 | 5m 7s | 124 | nuovo | c20aee7ae7… | no | PASS | — | — | PASS |
| fadpdr125_m01_s014 | Articolo 46 bis e decreto del ventinove apri | 647 | 4m 46s | 136 | nuovo | 66336574b8… | no | PASS | — | — | PASS |
| fadpdr125_m01_s015 | Tre piani distinti: rapporto biennale, trasp | 664 | 5m 7s | 130 | nuovo | afb5a739cf… | no | PASS | — | — | PASS |
| fadpdr125_m01_s016 | Il decreto legislativo 96 del 2026 in breve: | 604 | 4m 26s | 136 | nuovo | 629fac8f5f… | no | WARN | — | — | PASS |
| fadpdr125_m01_s017 | Mettere ordine prima di partire: come usare  | 645 | 5m 9s | 125 | nuovo | 93b2753f2c… | no | WARN | — | — | PASS |
| fadpdr125_m01_s018 | Riepilogo, checkpoint e aggancio al prossimo | 600 | 4m 45s | 126 | nuovo | 44f787fd20… | no | WARN | — | — | PASS |
| fadpdr125_m02_s001 | Le quattro fasce dimensionali | 597 | 4m 29s | 133 | nuovo | a241df7897… | no | WARN | — | — | PASS |
| fadpdr125_m02_s002 | Tifata in fascia tre | 690 | 5m 1s | 138 | nuovo | 8c3b1d5c6a… | no | PASS | — | — | PASS |
| fadpdr125_m02_s003 | Le semplificazioni per micro e piccole organ | 602 | 4m 33s | 132 | nuovo | a39f514c9e… | no | PASS | — | — | PASS |
| fadpdr125_m02_s004 | Quanto vale il sessanta per cento per una mi | 562 | 4m 12s | 134 | nuovo | b0163f36c6… | no | WARN | — | — | PASS |
| fadpdr125_m02_s005 | Fasce tre e quattro, quanti indicatori davve | 593 | 4m 18s | 138 | nuovo | f86a22df7b… | no | WARN | — | — | PASS |
| fadpdr125_m02_s006 | Il perimetro non si ritaglia | 600 | 4m 21s | 138 | nuovo | 677f0b0ecf… | no | PASS | — | — | PASS |
| fadpdr125_m02_s007 | Che cos'è la politica di parità | 578 | 4m 37s | 125 | nuovo | 14f88ae6ef… | no | PASS | — | — | PASS |
| fadpdr125_m02_s008 | Le condizioni della politica | 683 | 5m 15s | 130 | nuovo | 073b7acf1c… | no | PASS | — | — | PASS |
| fadpdr125_m02_s009 | Le politiche collegate | 725 | 5m 20s | 136 | nuovo | 3da7bd5d7c… | no | PASS | — | — | PASS |
| fadpdr125_m02_s010 | Dalla bozza alla politica | 679 | 5m 16s | 129 | nuovo | 0f8ffa9118… | no | WARN | — | — | PASS |
| fadpdr125_m02_s011 | Comunicare la politica | 595 | 4m 26s | 134 | nuovo | 8b42029175… | no | PASS | — | — | PASS |
| fadpdr125_m02_s012 | Gli errori tipici | 633 | 4m 49s | 131 | nuovo | 4b0595a664… | no | PASS | — | — | PASS |
| fadpdr125_m02_s013 | Il comitato guida | 715 | 5m 9s | 139 | nuovo | 0ab05755cd… | no | PASS | — | — | PASS |
| fadpdr125_m02_s014 | Gli impegni dell'alta direzione | 591 | 4m 12s | 140 | nuovo | ba0826d2ee… | no | PASS | — | — | PASS |
| fadpdr125_m02_s015 | Responsabile della politica e presidio | 577 | 4m 11s | 138 | nuovo | b0e05001df… | no | PASS | — | — | PASS |
| fadpdr125_m02_s016 | Il comitato di Tifata | 567 | 4m 14s | 134 | nuovo | ea5e2846a0… | no | PASS | — | — | PASS |
| fadpdr125_m02_s017 | Ruoli da non confondere | 761 | 5m 27s | 140 | nuovo | 6955497134… | no | PASS | — | — | PASS |
| fadpdr125_m02_s018 | Il piano strategico come documento operativo | 642 | 4m 59s | 129 | nuovo | 05b6d541b3… | no | PASS | — | — | PASS |
| fadpdr125_m03_s001 | I sei temi del piano | 576 | 4m 31s | 128 | nuovo | 303ea6162b… | no | PASS | — | — | PASS |
| fadpdr125_m03_s002 | Selezione e assunzione | 625 | 4m 41s | 134 | nuovo | 7db4b17bf2… | no | PASS | — | — | PASS |
| fadpdr125_m03_s003 | Gestione della carriera | 632 | 4m 39s | 136 | nuovo | b18e7ff035… | no | WARN | — | — | PASS |
| fadpdr125_m03_s004 | La carriera in Tifata | 637 | 4m 40s | 137 | nuovo | 96f2aed160… | no | PASS | — | — | PASS |
| fadpdr125_m03_s005 | Equità salariale | 623 | 4m 52s | 128 | nuovo | 1741b31452… | no | PASS | — | — | PASS |
| fadpdr125_m03_s006 | Il tema non è l'indicatore | 608 | 4m 37s | 132 | nuovo | 8cf2a38b62… | no | PASS | — | — | PASS |
| fadpdr125_m03_s007 | Genitorialità e cura | 610 | 4m 37s | 132 | nuovo | e33934349c… | no | PASS | — | — | PASS |
| fadpdr125_m03_s008 | Conciliazione dei tempi di vita e di lavoro | 618 | 4m 28s | 138 | nuovo | 3851b3b31b… | no | PASS | — | — | PASS |
| fadpdr125_m03_s009 | Il part time in Tifata | 663 | 4m 44s | 140 | nuovo | 09eda4bd1d… | no | PASS | — | — | PASS |
| fadpdr125_m03_s010 | Abusi e molestie: prevenzione e gestione | 632 | 4m 43s | 134 | nuovo | 409c57fae4… | no | PASS | — | — | PASS |
| fadpdr125_m03_s011 | Il piano di prevenzione in pratica | 649 | 4m 55s | 132 | nuovo | 42ee1842a4… | no | WARN | — | — | PASS |
| fadpdr125_m03_s012 | Documenti, monitoraggio e non conformità | 647 | 5m 13s | 124 | nuovo | 5e335541ac… | no | WARN | — | — | PASS |
| fadpdr125_m03_s013 | Il mandato | 646 | 4m 44s | 137 | nuovo | 6c0c43b084… | no | PASS | — | — | PASS |
| fadpdr125_m03_s014 | Punti di forza e di debolezza | 713 | 5m 14s | 136 | nuovo | a47b35dd38… | no | WARN | — | — | PASS |
| fadpdr125_m03_s015 | Gli obiettivi: selezione, carriera, retribuz | 669 | 5m 11s | 129 | nuovo | 9fb09643bc… | no | PASS | — | — | PASS |
| fadpdr125_m03_s016 | Gli obiettivi: cura, conciliazione, molestie | 704 | 5m 30s | 128 | nuovo | b36ea8a806… | no | PASS | — | — | PASS |
| fadpdr125_m03_s017 | Sintesi della Parte 1, ciò che è stabile e c | 646 | 5m 3s | 128 | nuovo | 2c60659d49… | no | WARN | — | — | PASS |
| fadpdr125_m03_s018 | Glossario, cautele d'uso e passaggio alla Pa | 665 | 4m 54s | 136 | nuovo | 33b383304c… | no | WARN | — | — | PASS |
| fadpdr125_m04_s001 | Bentornato, entri nella seconda metà del per | 612 | 4m 24s | 139 | nuovo | a94c2cf0a6… | no | PASS | — | — | PASS |
| fadpdr125_m04_s002 | La tesi della parte due: una somma di interr | 670 | 5m 0s | 134 | nuovo | 83eed31dfc… | no | WARN | — | — | PASS |
| fadpdr125_m04_s003 | Che cosa saprai fare in modo operativo | 688 | 4m 48s | 143 | nuovo | f0b53e570c… | no | WARN | — | — | PASS |
| fadpdr125_m04_s004 | Tifata alla prima rilevazione: la fotografia | 594 | 4m 29s | 132 | nuovo | b6c12df35e… | no | WARN | — | — | PASS |
| fadpdr125_m04_s005 | Sei aree, sei pesi, una logica unica | 672 | 4m 58s | 135 | nuovo | 6db54f8be7… | no | WARN | — | — | PASS |
| fadpdr125_m04_s006 | Gli indicatori qualitativi: presenza reale,  | 667 | 5m 8s | 130 | nuovo | bf8fedd5f7… | no | PASS | — | — | PASS |
| fadpdr125_m04_s007 | Gli indicatori quantitativi: soglie, confron | 590 | 4m 21s | 136 | nuovo | 5fbd393419… | no | PASS | — | — | PASS |
| fadpdr125_m04_s008 | Quando il dato manca: zero punti e niente sc | 589 | 4m 13s | 140 | nuovo | b93ed01560… | no | PASS | — | — | PASS |
| fadpdr125_m04_s009 | Area Cultura e strategia: i segnali che rend | 564 | 4m 29s | 126 | nuovo | de25e90f88… | no | PASS | — | — | PASS |
| fadpdr125_m04_s010 | Area Governance: quando la parità entra nei  | 575 | 4m 33s | 126 | nuovo | ecb5106b89… | no | PASS | — | — | PASS |
| fadpdr125_m04_s011 | Area Processi HR: dove la parità entra nel c | 651 | 4m 57s | 132 | nuovo | fdba76c448… | no | WARN | — | — | PASS |
| fadpdr125_m04_s012 | Area Opportunità di crescita: i numeri della | 675 | 4m 58s | 136 | nuovo | 21c85cc737… | no | WARN | — | — | PASS |
| fadpdr125_m04_s013 | L'area Opportunità applicata a Tifata: cinqu | 672 | 5m 3s | 133 | nuovo | baa2bde3e0… | no | WARN | — | — | PASS |
| fadpdr125_m04_s014 | Area Equità remunerativa: il punto più pesan | 655 | 4m 50s | 136 | nuovo | 7acddc7e25… | no | PASS | — | — | PASS |
| fadpdr125_m04_s015 | Genitorialità e conciliazione: le policy con | 724 | 5m 21s | 135 | nuovo | b7ca5cf42f… | no | PASS | — | — | PASS |
| fadpdr125_m04_s016 | La raccolta dei dati HR: se il cantiere info | 624 | 4m 48s | 130 | nuovo | cb060a086e… | no | WARN | — | — | PASS |
| fadpdr125_m04_s017 | Mettere insieme le sei aree: leggere la foto | 623 | 4m 29s | 139 | nuovo | 963e662bfd… | no | WARN | — | — | PASS |
| fadpdr125_m04_s018 | Tirare le fila: che cosa porti con te e che  | 582 | 4m 13s | 138 | nuovo | fbc0b84c5e… | no | WARN | — | — | PASS |
| fadpdr125_m05_s001 | Bentornato: la formula del punteggio pondera | 559 | 4m 4s | 138 | nuovo | 51f53f15dd… | no | WARN | PASS | — | PASS |
| fadpdr125_m05_s002 | La soglia non è per area | 605 | 4m 20s | 140 | nuovo | 91618df08a… | no | PASS | PASS | — | PASS |
| fadpdr125_m05_s003 | Perché la media semplice è sbagliata | 579 | 4m 5s | 142 | nuovo | c40899c8ac… | no | PASS | PASS | — | PASS |
| fadpdr125_m05_s004 | Tifata alla prima rilevazione: cinquantatré  | 607 | 4m 29s | 135 | nuovo | 6374d055b2… | no | PASS | FAIL | — | PASS |
| fadpdr125_m05_s005 | Quanto vale ogni indicatore sul totale | 620 | 4m 39s | 133 | nuovo | abaf624841… | no | PASS | WARN | — | PASS |
| fadpdr125_m05_s006 | Che cosa il punteggio non dice | 603 | 4m 32s | 133 | nuovo | 70704f75e2… | no | WARN | PASS | — | PASS |
| fadpdr125_m05_s007 | Equità remunerativa: che cosa si confronta | 569 | 4m 3s | 141 | nuovo | 0f066543d7… | no | PASS | PASS | — | PASS |
| fadpdr125_m05_s008 | Divario grezzo e a parità di livello | 555 | 3m 59s | 140 | nuovo | d9e1f3ed59… | no | PASS | PASS | — | PASS |
| fadpdr125_m05_s009 | Il calcolo per livello nel caso Tifata | 576 | 4m 7s | 140 | nuovo | 1050405d3b… | no | PASS | PASS | — | PASS |
| fadpdr125_m05_s010 | Le regole delle FAQ per l'indicatore princip | 586 | 4m 10s | 140 | nuovo | 098b1fcc8e… | no | PASS | PASS | — | PASS |
| fadpdr125_m05_s011 | Promozioni e variabile: due uguaglianze diff | 684 | 5m 4s | 135 | nuovo | aa0c988275… | no | PASS | PASS | — | PASS |
| fadpdr125_m05_s012 | Il raccordo con la trasparenza retributiva | 681 | 4m 54s | 139 | nuovo | ab495e6998… | no | PASS | PASS | — | PASS |
| fadpdr125_m05_s013 | Verifiche interne ed evidenze: come si prova | 754 | 5m 30s | 137 | nuovo | 67a9a3e456… | no | WARN | PASS | — | PASS |
| fadpdr125_m05_s014 | Le situazioni non conformi: un perimetro più | 759 | 5m 42s | 133 | nuovo | 4789d278d6… | no | PASS | WARN | — | PASS |
| fadpdr125_m05_s015 | Revisione periodica e calendario di Tifata v | 736 | 5m 18s | 139 | nuovo | 5394ecaf3b… | no | WARN | PASS | — | PASS |
| fadpdr125_m05_s016 | Le regole di certificazione e il gruppo di a | 711 | 4m 55s | 145 | nuovo | 8d6887a8cb… | no | PASS | PASS | — | PASS |
| fadpdr125_m05_s017 | Tempi di audit e ciclo triennale | 640 | 4m 44s | 135 | nuovo | bcc8e5caf2… | no | PASS | PASS | — | PASS |
| fadpdr125_m05_s018 | Tre orologi: come si tiene vivo il certifica | 640 | 4m 47s | 134 | nuovo | cb40032224… | no | PASS | PASS | — | PASS |
| fadpdr125_m06_s001 | Tre benefici, una condizione comune | 577 | 4m 16s | 135 | nuovo | e5a8013fc4… | no | PASS | — | — | PASS |
| fadpdr125_m06_s002 | L'esonero contributivo, letto senza illusion | 618 | 4m 36s | 134 | nuovo | d883e30484… | no | WARN | — | — | PASS |
| fadpdr125_m06_s003 | I conti di Tifata e il vero valore dell'eson | 615 | 4m 44s | 130 | nuovo | 154defcb5d… | no | PASS | — | — | PASS |
| fadpdr125_m06_s004 | L'esonero si chiede, non si presume | 601 | 4m 35s | 131 | nuovo | 5837fc0516… | no | WARN | — | — | PASS |
| fadpdr125_m06_s005 | Il punteggio premiale nelle gare e nei proge | 631 | 4m 33s | 139 | nuovo | df0f40f8e2… | no | PASS | — | — | PASS |
| fadpdr125_m06_s006 | La riduzione della garanzia, vantaggio picco | 622 | 4m 35s | 136 | nuovo | 4521a0ea23… | no | PASS | — | — | PASS |
| fadpdr125_m06_s007 | Il raccordo con il decreto legislativo 96 de | 641 | 4m 51s | 132 | nuovo | 20394f0810… | no | WARN | — | — | PASS |
| fadpdr125_m06_s008 | Una sola base dati per tre esigenze diverse | 642 | 4m 48s | 134 | nuovo | 38d3575ae4… | no | WARN | — | — | PASS |
| fadpdr125_m06_s009 | Che cosa guarda la sorveglianza | 623 | 4m 39s | 134 | nuovo | 1c4f93a2f8… | no | WARN | — | — | PASS |
| fadpdr125_m06_s010 | Quando il certificato viene meno e che cosa  | 658 | 4m 55s | 134 | nuovo | cca15a5d88… | no | WARN | — | — | PASS |
| fadpdr125_m06_s011 | La linea del tempo delle regole | 609 | 4m 41s | 130 | nuovo | 42512daf08… | no | WARN | — | — | PASS |
| fadpdr125_m06_s012 | Gruppi, più sedi e sistemi integrati | 735 | 5m 27s | 135 | nuovo | f67c41e77c… | no | PASS | — | — | PASS |
| fadpdr125_m06_s013 | Caso finale, il mandato del comitato guida | 678 | 5m 0s | 136 | nuovo | 302c128e62… | no | WARN | — | — | PASS |
| fadpdr125_m06_s014 | Scegliere le due aree, valore e fattibilità | 662 | 5m 7s | 129 | nuovo | 74b3e2e050… | no | PASS | — | — | PASS |
| fadpdr125_m06_s015 | Il ricalcolo dopo dieci mesi di piano | 689 | 4m 56s | 140 | nuovo | 6e0e2fe54d… | no | PASS | — | — | PASS |
| fadpdr125_m06_s016 | Che cosa resta fuori dal sessantanove | 664 | 4m 43s | 141 | nuovo | a89baadc2a… | no | PASS | — | — | PASS |
| fadpdr125_m06_s017 | Sintesi finale, ciò che è stabile e ciò che  | 652 | 4m 56s | 132 | nuovo | 2f666fb9ec… | no | PASS | — | — | PASS |
| fadpdr125_m06_s018 | Glossario essenziale, limiti dichiarati e do | 695 | 5m 13s | 133 | nuovo | 6ac039ebb8… | no | WARN | — | — | PASS |
