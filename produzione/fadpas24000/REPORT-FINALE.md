# Report finale di produzione — PAS 24000:2022 — Sistema di gestione sociale: dai requisiti alla certificazione — FAD-PAS24000-01 (24h)

Generato il 2026-10-13 02:26.

## Riepilogo

| Voce | Valore |
|---|---|
| Slide totali | 326 |
| Slide presenti in piattaforma | 0 |
| Clip nuove prodotte | 326 |
| Clip riusate dall'edizione precedente | 0 |
| Audio totale | 1553m 7s (1553.1 min) |
| Monte ore legale | 1440 min |
| Margine sul monte ore | 7.9% |
| Slide senza clip | 0 |
| Slide senza audio | 0 |
| Fallimenti impaginazione | 0 |
| Fallimenti contestualità | 0 |
| Slide provate in piattaforma (Playwright) | 326 |
| Fallimenti apertura in piattaforma | 0 |
| Clip audio passate al QA silenzi+volume | 0 |
| Clip audio segnalate dal QA | 0 |
| Risposte quiz in disaccordo col giudice | 12 su 386 |

## Quiz

- checkpoint m01: banca 27 domande, ne estrae 5, soglia 80%
- checkpoint m02: banca 27 domande, ne estrae 5, soglia 80%
- checkpoint m03: banca 27 domande, ne estrae 5, soglia 80%
- checkpoint m04: banca 27 domande, ne estrae 5, soglia 80%
- checkpoint m05: banca 27 domande, ne estrae 5, soglia 80%
- checkpoint m06: banca 27 domande, ne estrae 5, soglia 80%
- checkpoint m07: banca 25 domande, ne estrae 5, soglia 80%
- checkpoint m08: banca 27 domande, ne estrae 5, soglia 80%
- checkpoint m09: banca 25 domande, ne estrae 5, soglia 80%
- checkpoint m10: banca 27 domande, ne estrae 5, soglia 80%
- esame finale: banca 120 domande, ne estrae 20, soglia 75%

Chiave di correzione verificata da un giudice indipendente: 374/386 concordi.

# Eccezioni QA — fadpas24000 (PAS 24000:2022)

## Giudice indipendente delle risposte (qa-risposte-quiz.mjs), 13/10/2026

386 domande (266 di verifica + 120 d'esame), 12 disaccordi. Tutti verificati a mano sul testo
ufficiale (`testonorme/PAS24000-2022.txt`) e sul caso studio del committente: in tutti e 12 la
chiave del corso è CORRETTA e sbaglia il giudice. Nessuna chiave modificata.

| Dove | Domanda | Chiave | Perché la chiave è giusta |
|---|---|---|---|
| checkpoint m01 | Strumento che NON porta a certificazione | SMETA | Protocollo di audit di filiera: rapporto, non certificato. La UNI/PdR 125 è certificabile sotto accreditamento. |
| checkpoint m01 | L'Annex A è | normativo | Il testo intitola «Annex A (Normative)». |
| checkpoint m01 | Escludere un tema dell'Annex A | no, senza esclusioni | Clausola 1: requisiti «fulfilled without exclusion». |
| checkpoint m02 | «Minore» per la PAS | meno di 18 anni | Definizione 3.2: «human being below the age of 18 years». |
| checkpoint m02 | Tema meno coperto nel caso | A.1 diritti umani e due diligence | Dato della gap analysis del caso studio del committente. |
| checkpoint m08 | Soglia alta delle ore totali | 60 | A.9, requisiti 2 e 3: 60 h per settimana, straordinari compresi. |
| checkpoint m08 | Accesso al reclamo (A.10, req. 1) | lavoratori e soggetti esterni | «accessible to all workers and external parties». |
| checkpoint m10 | Causa radice dei due superamenti | rischio e allarme solo per gli stagionali | Analisi dei 5 perché del caso studio del committente (unità 10). |
| esame finale | La PAS tutela più della legge | si applica la PAS | Regola del livello più favorevole, nei due sensi (unità 1). |
| esame finale | «Direttamente collegata» | danno causato da un partner senza contributo | Principi guida ONU: causare / contribuire / essere direttamente collegati. |
| esame finale | Allontanamento per fuga di vapore | nessuna sanzione | Diritto di allontanarsi da un pericolo grave senza permesso e senza ritorsioni. |
| esame finale | Il salario dignitoso è | raccomandazione con piano | A.8: è una NOTA («should develop a plan»), non un requisito. |

## Domande del committente non sostenute dal solo modulo (_banche-committente.py)

5 domande segnalate perché il giudice vedeva solo la narrazione del modulo di appartenenza;
verificate a mano e tenute (SMETA m01, A.10 e 10.2 m02, punto 5.3 m05 coperto in m03, punto 8.2 f)
m07, multa disciplinare m08). Dettaglio nel rapporto `_staging/slide-gates/fadpas24000/banche-committente.json`.

## Slide, una per una

| ID | Titolo | Parole | Audio | Parole/min | Origine | Clip | In piattaforma | Impaginazione | Contestualità | QA audio (LUFS) | Apertura |
|---|---|---|---|---|---|---|---|---|---|---|---|
| fadpas24000_m01_s001 | Benvenuto: perché oggi si gestisce il social | 578 | 4m 33s | 127 | nuovo | 6d7996fbdb… | no | PASS | — | — | PASS |
| fadpas24000_m01_s002 | Che cos'è responsabilità sociale d'impresa | 711 | 5m 39s | 126 | nuovo | bafc2cbe77… | no | PASS | — | — | PASS |
| fadpas24000_m01_s003 | Dalla piramide di Carroll alle richieste del | 621 | 5m 1s | 124 | nuovo | 38b41d7c34… | no | WARN | — | — | PASS |
| fadpas24000_m01_s004 | I numeri che mostrano la dimensione del prob | 709 | 5m 22s | 132 | nuovo | b5ae9bad46… | no | WARN | — | — | PASS |
| fadpas24000_m01_s005 | Dove nasce il rischio sociale, anche in Ital | 688 | 5m 25s | 127 | nuovo | 64c1f180b6… | no | PASS | — | — | PASS |
| fadpas24000_m01_s006 | Dal principio al requisito: il quadro intern | 650 | 5m 4s | 128 | nuovo | 3a61be502c… | no | PASS | — | — | PASS |
| fadpas24000_m01_s007 | ILO, ONU e altre cornici di riferimento | 662 | 5m 13s | 127 | nuovo | 7e6655b44f… | no | PASS | — | — | PASS |
| fadpas24000_m01_s008 | Europa: dalla trasparenza alla due diligence | 660 | 5m 9s | 128 | nuovo | c8b0b03009… | no | PASS | — | — | PASS |
| fadpas24000_m01_s009 | Italia, standard volontario e livello più fa | 575 | 4m 18s | 134 | nuovo | 567c81d94a… | no | PASS | — | — | PASS |
| fadpas24000_m01_s010 | Gli strumenti sociali sul mercato: una prima | 628 | 4m 56s | 127 | nuovo | 35da4d6555… | no | PASS | — | — | PASS |
| fadpas24000_m01_s011 | PAS 24000 e SA8000: punti in comune, differe | 651 | 5m 6s | 128 | nuovo | a35384558b… | no | PASS | — | — | PASS |
| fadpas24000_m01_s012 | Come nasce la PAS 24000: sigle, attori e ori | 648 | 4m 51s | 134 | nuovo | 1728b218d8… | no | PASS | — | — | PASS |
| fadpas24000_m01_s013 | Dalla pubblicazione all'accreditamento in It | 646 | 4m 57s | 131 | nuovo | 7f57d95ad9… | no | PASS | — | — | PASS |
| fadpas24000_m01_s014 | La carta d'identità della PAS 24000: numeri, | 589 | 4m 43s | 125 | nuovo | 511accfd3a… | no | PASS | — | — | PASS |
| fadpas24000_m01_s015 | Annex A, aree dei requisiti e regola senza e | 691 | 5m 17s | 131 | nuovo | fcc3f32fc5… | no | PASS | — | — | PASS |
| fadpas24000_m01_s016 | Accreditamento e catena della fiducia: come  | 648 | 4m 46s | 136 | nuovo | 10a152982e… | no | PASS | — | — | PASS |
| fadpas24000_m01_s017 | Rischio del settore, ciclo triennale e rappo | 712 | 5m 20s | 134 | nuovo | ff196fa54d… | no | PASS | — | — | PASS |
| fadpas24000_m01_s018 | Vantaggi della certificazione e legame con l | 593 | 4m 49s | 123 | nuovo | 0ee830173f… | no | PASS | — | — | PASS |
| fadpas24000_m01_s019 | La richiesta che fa partire il progetto e i  | 611 | 4m 46s | 128 | nuovo | 103f91fbc7… | no | PASS | — | — | PASS |
| fadpas24000_m01_s020 | Che cosa la certificazione è e che cosa non  | 576 | 4m 28s | 129 | nuovo | e007d556ec… | no | PASS | — | — | PASS |
| fadpas24000_m01_s021 | Agroconserve Matesina: chi è e perché il con | 651 | 5m 4s | 129 | nuovo | f28e835a1a… | no | WARN | — | — | PASS |
| fadpas24000_m01_s022 | Ruoli del progetto e punto di partenza: la g | 626 | 4m 44s | 132 | nuovo | 6da8310dee… | no | WARN | — | — | PASS |
| fadpas24000_m01_s023 | Obiettivi, piano in dieci mesi e scelta fina | 738 | 5m 50s | 127 | nuovo | d98c69c12c… | no | PASS | — | — | PASS |
| fadpas24000_m01_s024 | Come prosegue il percorso: programma, tempi  | 626 | 4m 38s | 135 | nuovo | ce29e9f38e… | no | WARN | — | — | PASS |
| fadpas24000_m01_s025 | Chi fa che cosa in un progetto PAS 24000 e p | 620 | 4m 53s | 127 | nuovo | 413d7645d5… | no | WARN | — | — | PASS |
| fadpas24000_m01_s026 | Autovalutazione: che cosa devi saper spiegar | 718 | 5m 27s | 132 | nuovo | 939d0ac0cb… | no | PASS | — | — | PASS |
| fadpas24000_m01_s027 | Errori da evitare, dieci idee chiave e passa | 645 | 4m 59s | 129 | nuovo | 629d0ba65c… | no | WARN | — | — | PASS |
| fadpas24000_m02_s001 | Bentornato e mappa della PAS 24000 | 567 | 4m 16s | 133 | nuovo | 4f55eec9ad… | no | PASS | — | — | PASS |
| fadpas24000_m02_s002 | Come è organizzata la specifica e dove ti po | 623 | 5m 5s | 122 | nuovo | 72384898f2… | no | WARN | — | — | PASS |
| fadpas24000_m02_s003 | Come leggere un requisito e collegare clauso | 674 | 5m 1s | 134 | nuovo | 80790b1846… | no | WARN | — | — | PASS |
| fadpas24000_m02_s004 | I principi di gestione sociale e la logica d | 644 | 4m 43s | 137 | nuovo | 0f8cdea7e5… | no | PASS | — | — | PASS |
| fadpas24000_m02_s005 | Siamo già a norma: che cosa cambia davvero | 669 | 5m 5s | 131 | nuovo | 5b2665d139… | no | WARN | — | — | PASS |
| fadpas24000_m02_s006 | I fattori di successo che fanno vivere il si | 647 | 4m 58s | 130 | nuovo | 37d2a8e771… | no | PASS | — | — | PASS |
| fadpas24000_m02_s007 | Approccio per processi: dall'assunzione ai r | 650 | 4m 57s | 131 | nuovo | c591088bc0… | no | PASS | — | — | PASS |
| fadpas24000_m02_s008 | Il ciclo PDCA applicato all'orario di lavoro | 646 | 4m 58s | 130 | nuovo | 56941a8cae… | no | PASS | — | — | PASS |
| fadpas24000_m02_s009 | Pensiero basato sul rischio nel sociale: ris | 637 | 4m 40s | 136 | nuovo | 567286604e… | no | PASS | — | — | PASS |
| fadpas24000_m02_s010 | Dal contesto alla valutazione: il ciclo del  | 639 | 4m 53s | 131 | nuovo | 8e7da77b76… | no | PASS | — | — | PASS |
| fadpas24000_m02_s011 | Le persone nella clausola 3: chi è davvero p | 653 | 4m 50s | 135 | nuovo | 17fbe82238… | no | PASS | — | — | PASS |
| fadpas24000_m02_s012 | Quanto è ampia la definizione di lavoratore  | 623 | 4m 56s | 126 | nuovo | 660e182a6d… | no | WARN | — | — | PASS |
| fadpas24000_m02_s013 | I termini dei diritti fondamentali: sei defi | 612 | 4m 31s | 135 | nuovo | ec0fe2816d… | no | PASS | — | — | PASS |
| fadpas24000_m02_s014 | Minore non significa non può lavorare: le so | 631 | 4m 38s | 136 | nuovo | c6bdfad854… | no | PASS | — | — | PASS |
| fadpas24000_m02_s015 | Dall'attività all'impatto sociale: come legg | 645 | 4m 48s | 134 | nuovo | 815469d2c6… | no | PASS | — | — | PASS |
| fadpas24000_m02_s016 | Punto 4.1: comprendere il contesto senza fer | 652 | 4m 46s | 137 | nuovo | 52cb73945e… | no | WARN | — | — | PASS |
| fadpas24000_m02_s017 | L'analisi di contesto in pratica: fattori ri | 650 | 4m 50s | 134 | nuovo | fe7a727936… | no | WARN | — | — | PASS |
| fadpas24000_m02_s018 | Il workshop di contesto: perché le informazi | 638 | 4m 38s | 137 | nuovo | da8927449e… | no | PASS | — | — | PASS |
| fadpas24000_m02_s019 | Punto 4.2: le parti interessate e i quattro  | 623 | 4m 59s | 125 | nuovo | 78dd4a74e7… | no | PASS | — | — | PASS |
| fadpas24000_m02_s020 | Mappare le parti interessate: influenza, int | 652 | 4m 59s | 131 | nuovo | f9627759e8… | no | PASS | — | — | PASS |
| fadpas24000_m02_s021 | Dal registro delle aspettative alle decision | 631 | 4m 52s | 130 | nuovo | 03e1d0530d… | no | PASS | — | — | PASS |
| fadpas24000_m02_s022 | Quando un alloggio proposto da un'agenzia en | 614 | 4m 35s | 134 | nuovo | 3ff893c29a… | no | PASS | — | — | PASS |
| fadpas24000_m02_s023 | Requisiti legali e altri requisiti: il filo  | 655 | 4m 60s | 131 | nuovo | 11b68fd0c0… | no | PASS | — | — | PASS |
| fadpas24000_m02_s024 | Che cosa entra nel registro e come lo tieni  | 672 | 5m 12s | 129 | nuovo | 3e1df2ba59… | no | WARN | — | — | PASS |
| fadpas24000_m02_s025 | La regola del più favorevole e ciò che mostr | 671 | 5m 3s | 133 | nuovo | 131138e353… | no | WARN | — | — | PASS |
| fadpas24000_m02_s026 | Punto 4.3: che cos'è davvero il campo di app | 622 | 4m 28s | 139 | nuovo | 7eabd1d7c1… | no | PASS | — | — | PASS |
| fadpas24000_m02_s027 | Controllo, influenza e collegamento: i livel | 615 | 4m 46s | 129 | nuovo | 2980315ac2… | no | PASS | — | — | PASS |
| fadpas24000_m02_s028 | Scrivere il campo di applicazione senza rest | 621 | 4m 39s | 134 | nuovo | 2c91bce830… | no | PASS | — | — | PASS |
| fadpas24000_m02_s029 | Punto 4.4: il sistema di gestione sociale e  | 625 | 4m 34s | 137 | nuovo | 7f3fc49758… | no | PASS | — | — | PASS |
| fadpas24000_m02_s030 | La mappa dei processi: che cosa riusi e che  | 628 | 4m 60s | 126 | nuovo | 2a4f48b9ee… | no | WARN | — | — | PASS |
| fadpas24000_m02_s031 | Punto 4.4, copertura iniziale dell'Annex A e | 619 | 4m 39s | 133 | nuovo | bd653e655c… | no | PASS | — | — | PASS |
| fadpas24000_m02_s032 | Clausola 4, le evidenze attese e le domande  | 678 | 4m 59s | 136 | nuovo | a2a97530df… | no | PASS | — | — | PASS |
| fadpas24000_m02_s033 | Autovalutazione guidata, so spiegare con chi | 662 | 4m 46s | 139 | nuovo | 3c7f154ded… | no | WARN | — | — | PASS |
| fadpas24000_m02_s034 | Buone pratiche, errori tipici e i dieci punt | 641 | 4m 52s | 132 | nuovo | 35dc1c7e58… | no | WARN | — | — | PASS |
| fadpas24000_m03_s001 | Bentornato, dal contesto alla leadership | 634 | 4m 54s | 129 | nuovo | d0e96037f9… | no | PASS | PASS | — | PASS |
| fadpas24000_m03_s002 | La clausola 5 in una pagina, tra forma e sos | 662 | 5m 2s | 131 | nuovo | 4e8dad2c15… | no | PASS | WARN | — | PASS |
| fadpas24000_m03_s003 | I tredici impegni dell'alta direzione, raggr | 655 | 4m 48s | 136 | nuovo | 2cf8cef498… | no | WARN | PASS | — | PASS |
| fadpas24000_m03_s004 | Dall'impegno all'evidenza, fino alla prima d | 641 | 4m 49s | 133 | nuovo | 4c5901366b… | no | WARN | WARN | — | PASS |
| fadpas24000_m03_s005 | Le tre tutele specifiche, perché stanno in c | 627 | 4m 35s | 137 | nuovo | 39b1b668a8… | no | WARN | PASS | — | PASS |
| fadpas24000_m03_s006 | Sicurezza fisica, anche oltre il cancello | 636 | 4m 42s | 135 | nuovo | 749f210d34… | no | PASS | PASS | — | PASS |
| fadpas24000_m03_s007 | Protezione da ritorsioni e conformità legale | 658 | 4m 49s | 137 | nuovo | 3a134f0bfd… | no | PASS | PASS | — | PASS |
| fadpas24000_m03_s008 | La politica sociale, struttura e quattro amb | 628 | 4m 27s | 141 | nuovo | a46e6d80eb… | no | PASS | PASS | — | PASS |
| fadpas24000_m03_s009 | Gli impegni obbligatori della politica e il  | 633 | 4m 47s | 132 | nuovo | af5b1f1896… | no | PASS | PASS | — | PASS |
| fadpas24000_m03_s010 | Dalla bozza alla politica applicata | 593 | 4m 22s | 136 | nuovo | 2ff7381c0d… | no | PASS | PASS | — | PASS |
| fadpas24000_m03_s011 | Scrivere bene la politica, evitando il copia | 684 | 5m 14s | 131 | nuovo | 4ebe0a884b… | no | PASS | PASS | — | PASS |
| fadpas24000_m03_s012 | Diffondere la politica nelle lingue giuste e | 706 | 5m 33s | 127 | nuovo | d717e737b7… | no | WARN | WARN | — | PASS |
| fadpas24000_m03_s013 | Ruoli, responsabilità e autorità: la respons | 702 | 5m 28s | 128 | nuovo | 1126f871f9… | no | PASS | PASS | — | PASS |
| fadpas24000_m03_s014 | I sette compiti delle persone incaricate e l | 730 | 5m 40s | 129 | nuovo | 9e61494cee… | no | WARN | WARN | — | PASS |
| fadpas24000_m03_s015 | Attribuire i ruoli senza discriminare, guard | 681 | 5m 9s | 132 | nuovo | 94fd7e0bf4… | no | WARN | PASS | — | PASS |
| fadpas24000_m03_s016 | Il Comitato sociale come strumento stabile d | 658 | 4m 60s | 132 | nuovo | f353c6351f… | no | PASS | PASS | — | PASS |
| fadpas24000_m03_s017 | Informare, consultare, far partecipare: tre  | 606 | 4m 18s | 141 | nuovo | ed61732d39… | no | PASS | PASS | — | PASS |
| fadpas24000_m03_s018 | Le condizioni della partecipazione effettiva | 588 | 4m 30s | 131 | nuovo | a3e16101cd… | no | WARN | PASS | — | PASS |
| fadpas24000_m03_s019 | I nove temi su cui i lavoratori non manageri | 617 | 4m 29s | 137 | nuovo | eabdb20ed0… | no | PASS | PASS | — | PASS |
| fadpas24000_m03_s020 | I sette temi di partecipazione, il calendari | 620 | 4m 45s | 131 | nuovo | 0a5f833885… | no | PASS | PASS | — | PASS |
| fadpas24000_m03_s021 | Su che cosa consultare e su che cosa far par | 641 | 4m 45s | 135 | nuovo | 7df244444f… | no | PASS | WARN | — | PASS |
| fadpas24000_m03_s022 | Ostacoli alla partecipazione e contromisure  | 620 | 4m 33s | 136 | nuovo | 7c855df434… | no | WARN | PASS | — | PASS |
| fadpas24000_m03_s023 | Strumenti di partecipazione, sondaggio e pia | 653 | 4m 53s | 134 | nuovo | 302a810e25… | no | PASS | PASS | — | PASS |
| fadpas24000_m03_s024 | Come si misurano leadership e partecipazione | 643 | 4m 43s | 136 | nuovo | c61ee6cb65… | no | PASS | PASS | — | PASS |
| fadpas24000_m03_s025 | Indicatori, proposte dei lavoratori e interv | 663 | 4m 41s | 141 | nuovo | f62c865217… | no | WARN | PASS | — | PASS |
| fadpas24000_m03_s026 | La clausola 5 in numeri e autovalutazione fi | 591 | 4m 39s | 127 | nuovo | 3451457550… | no | PASS | WARN | — | PASS |
| fadpas24000_m03_s027 | Errori da evitare e passaggio alla pianifica | 629 | 4m 45s | 133 | nuovo | 93930a1a27… | no | WARN | PASS | — | PASS |
| fadpas24000_m04_s001 | Bentornato e mappa della pianificazione | 613 | 4m 23s | 140 | nuovo | 55e9062830… | no | PASS | — | — | PASS |
| fadpas24000_m04_s002 | Dal mese uno al mese quattro, dagli input al | 654 | 4m 47s | 137 | nuovo | 1344394a0c… | no | PASS | — | — | PASS |
| fadpas24000_m04_s003 | Punto 6.1.1, che cosa chiede e come si dimos | 637 | 4m 36s | 138 | nuovo | 55c0a7f3a0… | no | WARN | — | — | PASS |
| fadpas24000_m04_s004 | Le quattro finalità, rischi e opportunità pe | 640 | 4m 49s | 133 | nuovo | 785f599688… | no | PASS | — | — | PASS |
| fadpas24000_m04_s005 | Un metodo di valutazione, probabilità per gr | 647 | 5m 1s | 129 | nuovo | 3348b64fe4… | no | PASS | — | — | PASS |
| fadpas24000_m04_s006 | Le scale da uno a cinque e la gravità letta  | 643 | 4m 52s | 132 | nuovo | 01bfe18c9a… | no | PASS | — | — | PASS |
| fadpas24000_m04_s007 | La matrice dei nove rischi prioritari e la r | 649 | 4m 53s | 133 | nuovo | 94505f0c5c… | no | PASS | — | — | PASS |
| fadpas24000_m04_s008 | A.1, l'inventario dei rischi per i diritti u | 608 | 4m 35s | 133 | nuovo | 741a57af36… | no | PASS | — | — | PASS |
| fadpas24000_m04_s009 | Come si costruisce l'inventario, gruppi di p | 651 | 5m 1s | 130 | nuovo | c4157f2100… | no | PASS | — | — | PASS |
| fadpas24000_m04_s010 | Il workshop del mese quattro, come nasce un  | 660 | 4m 58s | 133 | nuovo | f97293a504… | no | PASS | — | — | PASS |
| fadpas24000_m04_s011 | A.1, requisiti 2 e 3: che cosa chiedono e co | 641 | 4m 27s | 144 | nuovo | beeab5f8b0… | no | WARN | — | — | PASS |
| fadpas24000_m04_s012 | Tre modi di essere coinvolti in un impatto | 647 | 4m 44s | 137 | nuovo | c0d327ff64… | no | PASS | — | — | PASS |
| fadpas24000_m04_s013 | Il programma dei conferimenti cambia all'ult | 669 | 4m 58s | 135 | nuovo | 0bd0a04886… | no | WARN | — | — | PASS |
| fadpas24000_m04_s014 | A.1, requisito 4: che cosa deve fare il proc | 645 | 4m 44s | 136 | nuovo | 0a5d75134c… | no | WARN | — | — | PASS |
| fadpas24000_m04_s015 | I sei passi della due diligence e chi fa che | 660 | 5m 6s | 130 | nuovo | 3d21f4d4c7… | no | WARN | — | — | PASS |
| fadpas24000_m04_s016 | La due diligence nel calendario del progetto | 652 | 4m 36s | 142 | nuovo | 0102512ed0… | no | PASS | — | — | PASS |
| fadpas24000_m04_s017 | La mappa della filiera e i criteri di priori | 635 | 4m 38s | 137 | nuovo | 1cbfa0b7e7… | no | PASS | — | — | PASS |
| fadpas24000_m04_s018 | Dalla mappa alle priorità di verifica | 621 | 4m 41s | 133 | nuovo | ff9358cb42… | no | PASS | — | — | PASS |
| fadpas24000_m04_s019 | Leva e influenza sui partner | 645 | 4m 40s | 138 | nuovo | ccd04cc214… | no | PASS | — | — | PASS |
| fadpas24000_m04_s020 | Punto 6.1.2: che cosa chiede e come si dimos | 614 | 4m 33s | 135 | nuovo | 90c23ffd78… | no | WARN | — | — | PASS |
| fadpas24000_m04_s021 | La gerarchia delle misure, scegliere azioni  | 647 | 4m 40s | 139 | nuovo | fe77b60d48… | no | PASS | — | — | PASS |
| fadpas24000_m04_s022 | Il piano di trattamento dei rischi prioritar | 631 | 4m 48s | 132 | nuovo | d04231d977… | no | PASS | — | — | PASS |
| fadpas24000_m04_s023 | Punto 6.2.1, che caratteristiche devono aver | 628 | 4m 48s | 131 | nuovo | e3ad176fca… | no | WARN | — | — | PASS |
| fadpas24000_m04_s024 | Da dove nascono gli obiettivi e come formula | 657 | 5m 3s | 130 | nuovo | 104b428731… | no | WARN | — | — | PASS |
| fadpas24000_m04_s025 | Obiettivo, indicatore, traguardo e rischio c | 600 | 4m 37s | 130 | nuovo | 07187fcf78… | no | PASS | — | — | PASS |
| fadpas24000_m04_s026 | Punto 6.2.2, i cinque elementi del piano per | 602 | 4m 39s | 129 | nuovo | 964d384525… | no | PASS | — | — | PASS |
| fadpas24000_m04_s027 | Un esempio completo, il piano per non supera | 654 | 4m 47s | 137 | nuovo | 69eb22de25… | no | PASS | — | — | PASS |
| fadpas24000_m04_s028 | Il piano nel tempo, i traguardi intermedi e  | 627 | 4m 43s | 133 | nuovo | db4580e2a2… | no | WARN | — | — | PASS |
| fadpas24000_m04_s029 | Punto 6.3, pianificare i cambiamenti prima c | 588 | 4m 21s | 135 | nuovo | afabc42b68… | no | WARN | — | — | PASS |
| fadpas24000_m04_s030 | Il percorso di un cambiamento ben gestito e  | 581 | 4m 26s | 131 | nuovo | 6eafcf4d94… | no | PASS | — | — | PASS |
| fadpas24000_m04_s031 | Il terzo turno, un'azione di miglioramento c | 659 | 4m 56s | 134 | nuovo | 8dcf13b278… | no | PASS | — | — | PASS |
| fadpas24000_m04_s032 | La pianificazione di Agroconserve Matesina i | 648 | 4m 56s | 131 | nuovo | b10d4175f1… | no | PASS | — | — | PASS |
| fadpas24000_m04_s033 | So spiegare che cosa conta, e riconosco gli  | 663 | 4m 51s | 137 | nuovo | 0580be75dc… | no | PASS | — | — | PASS |
| fadpas24000_m04_s034 | I dieci punti chiave, verso il checkpoint e  | 645 | 4m 52s | 132 | nuovo | 65ed2db90c… | no | WARN | — | — | PASS |
| fadpas24000_m05_s001 | Bentornato: il supporto nel ciclo PDCA | 550 | 4m 23s | 126 | nuovo | 8adb4aac8a… | no | PASS | — | — | PASS |
| fadpas24000_m05_s002 | Punto 7.1: quali risorse servono davvero | 644 | 4m 53s | 132 | nuovo | d8b085ae8a… | no | PASS | — | — | PASS |
| fadpas24000_m05_s003 | Dalla capacità attuale al piano documentato | 668 | 5m 2s | 133 | nuovo | ee08799619… | no | PASS | — | — | PASS |
| fadpas24000_m05_s004 | Il budget del primo anno di sistema sociale | 582 | 4m 27s | 131 | nuovo | b388274126… | no | PASS | — | — | PASS |
| fadpas24000_m05_s005 | Il piano di sviluppo della capacità in prati | 652 | 5m 9s | 127 | nuovo | e22dc2710f… | no | PASS | — | — | PASS |
| fadpas24000_m05_s006 | Il budget che dimenticava le ore degli stagi | 646 | 5m 1s | 129 | nuovo | d82493c411… | no | PASS | — | — | PASS |
| fadpas24000_m05_s007 | Punto 7.2: il ciclo della competenza | 659 | 5m 18s | 124 | nuovo | d0b987f47f… | no | PASS | — | — | PASS |
| fadpas24000_m05_s008 | Matrice delle competenze e focus sui capitur | 656 | 4m 58s | 132 | nuovo | 4eb13fbfc9… | no | PASS | — | — | PASS |
| fadpas24000_m05_s009 | Dal fabbisogno al piano di formazione | 667 | 4m 49s | 139 | nuovo | 25384c41af… | no | PASS | — | — | PASS |
| fadpas24000_m05_s010 | Calendario della formazione ed efficacia del | 599 | 4m 30s | 133 | nuovo | fd7ea11c34… | no | WARN | — | — | PASS |
| fadpas24000_m05_s011 | Punto 7.3: consapevolezza, politica, ruolo e | 648 | 4m 47s | 136 | nuovo | d3e4292002… | no | PASS | — | — | PASS |
| fadpas24000_m05_s012 | Come l'auditor verifica la consapevolezza: i | 680 | 4m 53s | 139 | nuovo | d200075fa1… | no | WARN | — | — | PASS |
| fadpas24000_m05_s013 | Prima della campagna: sensibilizzazione degl | 645 | 5m 2s | 128 | nuovo | fb66eb167a… | no | WARN | — | — | PASS |
| fadpas24000_m05_s014 | Punto 7.4.1: progettare la comunicazione con | 684 | 5m 21s | 128 | nuovo | 04b6d6d14c… | no | PASS | — | — | PASS |
| fadpas24000_m05_s015 | Le lingue degli stagionali e il piano di com | 672 | 5m 7s | 131 | nuovo | a338b4f9e1… | no | PASS | — | — | PASS |
| fadpas24000_m05_s016 | Punto 7.4.2: comunicazione interna, almeno a | 639 | 4m 49s | 133 | nuovo | a9758f25d8… | no | PASS | — | — | PASS |
| fadpas24000_m05_s017 | Calendario della comunicazione interna e can | 671 | 5m 3s | 133 | nuovo | 63a4e159c2… | no | WARN | — | — | PASS |
| fadpas24000_m05_s018 | Punto 7.4.3: comunicazione esterna, rendicon | 582 | 4m 38s | 125 | nuovo | ea2b37064d… | no | WARN | — | — | PASS |
| fadpas24000_m05_s019 | Partner commerciali e destinatari esterni: a | 682 | 5m 21s | 128 | nuovo | ce73efc603… | no | WARN | — | — | PASS |
| fadpas24000_m05_s020 | Rendiconto sociale annuale e comunicazioni e | 634 | 4m 52s | 130 | nuovo | 26bf7c48cd… | no | WARN | — | — | PASS |
| fadpas24000_m05_s021 | Punto 7.5: quali informazioni documentate se | 612 | 4m 36s | 133 | nuovo | d19ce760bd… | no | WARN | — | — | PASS |
| fadpas24000_m05_s022 | Clausole, Annex A e criterio pratico su quan | 649 | 5m 6s | 127 | nuovo | fd56c38aa7… | no | PASS | — | — | PASS |
| fadpas24000_m05_s023 | Creare, aggiornare e controllare: il ciclo d | 649 | 4m 58s | 131 | nuovo | 50cb1bed3c… | no | PASS | — | — | PASS |
| fadpas24000_m05_s024 | Documenti esterni, accesso e riservatezza: c | 664 | 4m 55s | 135 | nuovo | 60eca23d09… | no | PASS | — | — | PASS |
| fadpas24000_m05_s025 | Dati personali, pratiche corrette e pratiche | 652 | 5m 4s | 129 | nuovo | a16d49bddf… | no | PASS | — | — | PASS |
| fadpas24000_m05_s026 | L'architettura documentale del caso e gli in | 651 | 4m 52s | 134 | nuovo | c67f5bd89b… | no | WARN | — | — | PASS |
| fadpas24000_m05_s027 | Sintesi della clausola 7 e passaggio ai diri | 661 | 5m 17s | 125 | nuovo | 0b912aeea9… | no | PASS | — | — | PASS |
| fadpas24000_m06_s001 | Bentornato, mappa dei diritti fondamentali d | 501 | 3m 33s | 141 | nuovo | 94eefc6d24… | no | PASS | — | — | PASS |
| fadpas24000_m06_s002 | Cinque domande per leggere ogni requisito | 617 | 4m 20s | 142 | nuovo | 64ba9f6af2… | no | PASS | — | — | PASS |
| fadpas24000_m06_s003 | Quattro temi, venticinque requisiti, livello | 590 | 4m 33s | 130 | nuovo | a3e0bb189c… | no | PASS | — | — | PASS |
| fadpas24000_m06_s004 | Lavoro forzato, che cos'è davvero e perché r | 636 | 4m 27s | 143 | nuovo | 25d53745ac… | no | PASS | — | — | PASS |
| fadpas24000_m06_s005 | A.2, requisiti uno e due, lavoro scelto libe | 620 | 4m 38s | 134 | nuovo | 194dbb8859… | no | PASS | — | — | PASS |
| fadpas24000_m06_s006 | Indicatori di lavoro forzato e punti di risc | 660 | 4m 50s | 136 | nuovo | b04ae132ce… | no | PASS | — | — | PASS |
| fadpas24000_m06_s007 | Sei tutele attorno alla libertà di andarsene | 637 | 4m 35s | 139 | nuovo | 8bbabf82e7… | no | PASS | — | — | PASS |
| fadpas24000_m06_s008 | Requisiti da tre a otto, che cosa chiedono e | 642 | 4m 36s | 140 | nuovo | 4ef2f96488… | no | WARN | — | — | PASS |
| fadpas24000_m06_s009 | La custodia volontaria dei documenti, quando | 600 | 4m 17s | 140 | nuovo | dfa2a7e53b… | no | PASS | — | — | PASS |
| fadpas24000_m06_s010 | Il caso dei costi di reclutamento, quaranta  | 651 | 4m 53s | 133 | nuovo | 7c903cb9b2… | no | PASS | — | — | PASS |
| fadpas24000_m06_s011 | A.2, requisiti nove e dieci: agenzie, appalt | 606 | 4m 22s | 139 | nuovo | c82f7dc612… | no | WARN | — | — | PASS |
| fadpas24000_m06_s012 | Chi fornisce manodopera ad Agroconserve Mate | 613 | 4m 36s | 133 | nuovo | 5ca71952bc… | no | PASS | — | — | PASS |
| fadpas24000_m06_s013 | Il ciclo di controllo su agenzie e appaltato | 657 | 4m 41s | 140 | nuovo | b827a0237f… | no | WARN | — | — | PASS |
| fadpas24000_m06_s014 | Navetta, foresteria e controlli a metà campa | 650 | 4m 27s | 146 | nuovo | 1400b71267… | no | PASS | — | — | PASS |
| fadpas24000_m06_s015 | A.2, requisito undici: rimediare quando il l | 625 | 4m 26s | 141 | nuovo | 3e244d7f49… | no | WARN | — | — | PASS |
| fadpas24000_m06_s016 | Il processo di rimedio in sei passi | 624 | 4m 31s | 138 | nuovo | 9a858bc4e3… | no | PASS | — | — | PASS |
| fadpas24000_m06_s017 | La segnalazione su un'azienda agricola confe | 625 | 4m 50s | 129 | nuovo | a8a588f87f… | no | PASS | — | — | PASS |
| fadpas24000_m06_s018 | A.3, le fasce d'età: che cosa vale e quando | 643 | 4m 30s | 143 | nuovo | d53fb8f43f… | no | WARN | — | — | PASS |
| fadpas24000_m06_s019 | A.3, requisiti uno e due: età minima, lavoro | 641 | 4m 44s | 136 | nuovo | 4d44f16e53… | no | PASS | — | — | PASS |
| fadpas24000_m06_s020 | A.3: giovani lavoratori, verifica dell'età e | 648 | 4m 38s | 140 | nuovo | 00d7e3ff23… | no | PASS | — | — | PASS |
| fadpas24000_m06_s021 | A.3, requisiti tre, quattro, cinque e sei: c | 678 | 4m 54s | 138 | nuovo | e89ac43b1a… | no | WARN | — | — | PASS |
| fadpas24000_m06_s022 | I lavoratori di sedici e diciassette anni: q | 652 | 4m 47s | 136 | nuovo | 496af4babb… | no | PASS | — | — | PASS |
| fadpas24000_m06_s023 | La verifica dell'età all'ingresso: dalla fid | 657 | 4m 52s | 135 | nuovo | 1bf44f302c… | no | PASS | — | — | PASS |
| fadpas24000_m06_s024 | Il rimedio nell'interesse superiore del mino | 683 | 4m 43s | 145 | nuovo | f0a54a1e51… | no | PASS | — | — | PASS |
| fadpas24000_m06_s025 | A.4, i quattro requisiti: diritto di aderire | 632 | 4m 33s | 139 | nuovo | 0497a58c7e… | no | PASS | — | — | PASS |
| fadpas24000_m06_s026 | I canali del dialogo in Agroconserve Matesin | 661 | 4m 47s | 138 | nuovo | 7fdd9788bf… | no | PASS | — | — | PASS |
| fadpas24000_m06_s027 | Gli indicatori di libertà di associazione e  | 641 | 4m 52s | 132 | nuovo | ee67960817… | no | PASS | — | — | PASS |
| fadpas24000_m06_s028 | A.5, requisito uno: pari opportunità e non d | 630 | 4m 37s | 136 | nuovo | 88342a5662… | no | PASS | — | — | PASS |
| fadpas24000_m06_s029 | Quattro numeri da leggere bene: ruoli, retri | 630 | 4m 49s | 131 | nuovo | ea18b68acf… | no | PASS | — | — | PASS |
| fadpas24000_m06_s030 | Le mansioni degli stagionali: quando l'effet | 651 | 4m 39s | 140 | nuovo | 421570e8d7… | no | PASS | — | — | PASS |
| fadpas24000_m06_s031 | A.5, requisito 2: nessun abuso, nemmeno mina | 725 | 5m 15s | 138 | nuovo | 5cddc69fab… | no | PASS | — | — | PASS |
| fadpas24000_m06_s032 | Prevenire molestie e abusi, dal vertice al r | 669 | 5m 1s | 133 | nuovo | 8e770ef62f… | no | PASS | — | — | PASS |
| fadpas24000_m06_s033 | Una segnalazione dalla linea di cernita | 638 | 5m 6s | 125 | nuovo | 0bc8f4a235… | no | WARN | — | — | PASS |
| fadpas24000_m06_s034 | A.5, requisiti 3 e 4: regole scritte e regis | 648 | 4m 41s | 138 | nuovo | 080b1b1482… | no | PASS | — | — | PASS |
| fadpas24000_m06_s035 | Il procedimento disciplinare, passo per pass | 644 | 4m 40s | 138 | nuovo | 68017bab64… | no | WARN | — | — | PASS |
| fadpas24000_m06_s036 | Che cosa rivela il registro disciplinare | 644 | 4m 46s | 135 | nuovo | fd3380c688… | no | WARN | — | — | PASS |
| fadpas24000_m06_s037 | La sanzione che non risulta da nessuna parte | 656 | 4m 51s | 135 | nuovo | 5745f1f09d… | no | WARN | — | — | PASS |
| fadpas24000_m06_s038 | Da A.2 ad A.5: che cosa garantire e quali ev | 639 | 4m 37s | 138 | nuovo | b877f921e2… | no | WARN | — | — | PASS |
| fadpas24000_m06_s039 | L'avanzamento del caso: evidenze complete e  | 636 | 4m 42s | 135 | nuovo | 73cbfdd838… | no | PASS | — | — | PASS |
| fadpas24000_m06_s040 | So spiegare che… | 630 | 4m 27s | 141 | nuovo | bff3140dde… | no | PASS | — | — | PASS |
| fadpas24000_m06_s041 | Sintesi finale, errori tipici e passaggio al | 643 | 4m 42s | 137 | nuovo | 3e194943a2… | no | WARN | — | — | PASS |
| fadpas24000_m07_s001 | Bentornato e mappa: la sicurezza dentro il s | 588 | 4m 23s | 134 | nuovo | f7a08de8ee… | no | PASS | — | — | PASS |
| fadpas24000_m07_s002 | A.6, requisito 1: la sicurezza è parte integ | 583 | 4m 30s | 129 | nuovo | 6e275c4fe1… | no | PASS | — | — | PASS |
| fadpas24000_m07_s003 | Legge, ISO 45001 e PAS 24000: chi copre che  | 643 | 5m 2s | 128 | nuovo | 0d5e73aa1f… | no | WARN | — | — | PASS |
| fadpas24000_m07_s004 | A.6, requisito 2: condizioni sicure, salubri | 620 | 4m 44s | 131 | nuovo | 2ad2acdbd4… | no | PASS | — | — | PASS |
| fadpas24000_m07_s005 | La mappa dei luoghi da presidiare in Agrocon | 637 | 4m 42s | 136 | nuovo | f3d04848b4… | no | PASS | — | — | PASS |
| fadpas24000_m07_s006 | Controllo diretto o influenza: come cambia l | 589 | 4m 42s | 125 | nuovo | a200b63dc2… | no | PASS | — | — | PASS |
| fadpas24000_m07_s007 | Valutare e controllare i rischi: il richiamo | 594 | 4m 35s | 130 | nuovo | 74b9f3bc79… | no | WARN | — | — | PASS |
| fadpas24000_m07_s008 | I rischi di sicurezza della campagna: dal qu | 613 | 4m 34s | 134 | nuovo | 97cba158d0… | no | PASS | — | — | PASS |
| fadpas24000_m07_s009 | A.6, requisiti 3 e 4: quando formare, e a qu | 606 | 4m 16s | 142 | nuovo | 6559a6c203… | no | PASS | — | — | PASS |
| fadpas24000_m07_s010 | Il percorso formativo di uno stagionale in A | 617 | 4m 41s | 132 | nuovo | 508330b1e9… | no | WARN | — | — | PASS |
| fadpas24000_m07_s011 | A.6, requisiti 5 e 6: registrare tutto, capi | 606 | 4m 26s | 137 | nuovo | e261188326… | no | WARN | — | — | PASS |
| fadpas24000_m07_s012 | La piramide degli eventi e i dati di Agrocon | 651 | 4m 54s | 133 | nuovo | a93e992cb8… | no | PASS | — | — | PASS |
| fadpas24000_m07_s013 | Dall'evento all'azione correttiva: come evit | 599 | 4m 35s | 131 | nuovo | 4fe3e67cb9… | no | PASS | — | — | PASS |
| fadpas24000_m07_s014 | A.6, requisito 7: il ciclo dei DPI, dalla sc | 675 | 5m 3s | 133 | nuovo | 463d80b881… | no | PASS | — | — | PASS |
| fadpas24000_m07_s015 | I DPI per mansione, e il punto delicato di s | 659 | 5m 2s | 131 | nuovo | aa3dd65b20… | no | WARN | — | — | PASS |
| fadpas24000_m07_s016 | Quando il DPI non viene usato: il caso dei g | 641 | 5m 8s | 125 | nuovo | 269ea4faff… | no | PASS | — | — | PASS |
| fadpas24000_m07_s017 | A.6, requisiti 8 e 9: primo soccorso, assist | 630 | 4m 32s | 139 | nuovo | f2543452b5… | no | PASS | — | — | PASS |
| fadpas24000_m07_s018 | Il picco di campagna: dimensionare le dotazi | 650 | 4m 55s | 132 | nuovo | 3d8125b29b… | no | PASS | — | — | PASS |
| fadpas24000_m07_s019 | Un malore nel piazzale: dal soccorso al ries | 666 | 4m 59s | 133 | nuovo | 32be040e7c… | no | PASS | — | — | PASS |
| fadpas24000_m07_s020 | A.7, requisito 1: vie di fuga e antincendio, | 633 | 4m 31s | 140 | nuovo | 7af6bee792… | no | PASS | — | — | PASS |
| fadpas24000_m07_s021 | A.7, requisito 2: prove, ispezioni e anomali | 647 | 4m 49s | 134 | nuovo | 01fb349e5e… | no | PASS | — | — | PASS |
| fadpas24000_m07_s022 | A.7, requisito 3: valutare e monitorare stab | 609 | 4m 41s | 130 | nuovo | 029a285bd9… | no | PASS | — | — | PASS |
| fadpas24000_m07_s023 | Che cosa monitora Agroconserve, e perché la  | 691 | 5m 14s | 132 | nuovo | 130b448140… | no | WARN | — | — | PASS |
| fadpas24000_m07_s024 | A.7, requisito 4: alloggi forniti o imposti, | 603 | 4m 32s | 133 | nuovo | 80a66b719a… | no | WARN | — | — | PASS |
| fadpas24000_m07_s025 | Punto 8.2: le sette lettere della preparazio | 641 | 4m 51s | 132 | nuovo | e4d3c570bb… | no | PASS | — | — | PASS |
| fadpas24000_m07_s026 | Punto 8.2: come si attua, quali evidenze ser | 650 | 4m 55s | 132 | nuovo | b3caebb39c… | no | WARN | — | — | PASS |
| fadpas24000_m07_s027 | I primi minuti di un'evacuazione, e chi deve | 638 | 4m 35s | 139 | nuovo | 2e4a48a70f… | no | PASS | — | — | PASS |
| fadpas24000_m07_s028 | La prima prova di evacuazione in campagna: c | 712 | 5m 14s | 136 | nuovo | 2b96f6d384… | no | PASS | — | — | PASS |
| fadpas24000_m07_s029 | Tempi di arrivo, appello e punti di perdita  | 758 | 5m 43s | 132 | nuovo | 0a8b045356… | no | WARN | — | — | PASS |
| fadpas24000_m07_s030 | Dalla prova al miglioramento: azioni decise  | 652 | 4m 52s | 134 | nuovo | 340b5d676a… | no | PASS | — | — | PASS |
| fadpas24000_m07_s031 | A.6 in sintesi: requisito ed evidenza chiave | 641 | 4m 41s | 137 | nuovo | fd46dfdefa… | no | WARN | — | — | PASS |
| fadpas24000_m07_s032 | A.7 e punto 8.2 in sintesi | 663 | 4m 58s | 133 | nuovo | 244cab36f1… | no | PASS | — | — | PASS |
| fadpas24000_m07_s033 | So spiegare che... | 688 | 4m 58s | 138 | nuovo | 227e1af0f8… | no | PASS | — | — | PASS |
| fadpas24000_m07_s034 | Gli errori da evitare e i dieci punti chiave | 664 | 4m 57s | 134 | nuovo | ed761d29aa… | no | WARN | — | — | PASS |
| fadpas24000_m08_s001 | Bentornato e mappa dell'unità | 698 | 4m 42s | 149 | nuovo | e342174d52… | no | PASS | — | — | PASS |
| fadpas24000_m08_s002 | Condizioni scritte prima di iniziare | 725 | 4m 58s | 146 | nuovo | 777d6c9adc… | no | PASS | — | — | PASS |
| fadpas24000_m08_s003 | Dall'offerta al primo giorno | 707 | 5m 6s | 138 | nuovo | 1cf56685e4… | no | PASS | — | — | PASS |
| fadpas24000_m08_s004 | Rapporto formale, nessuna elusione | 728 | 5m 17s | 138 | nuovo | c51c4ae858… | no | PASS | — | — | PASS |
| fadpas24000_m08_s005 | Retribuzione minima per l'orario standard | 689 | 4m 52s | 141 | nuovo | ba2b2aff43… | no | PASS | — | — | PASS |
| fadpas24000_m08_s006 | Dal minimo al salario dignitoso | 697 | 4m 53s | 143 | nuovo | 01e170e116… | no | PASS | — | — | PASS |
| fadpas24000_m08_s007 | Stimare un salario dignitoso | 652 | 4m 51s | 135 | nuovo | d58b633c26… | no | PASS | — | — | PASS |
| fadpas24000_m08_s008 | Confronto e piano verso il salario dignitoso | 662 | 4m 40s | 142 | nuovo | 287f960e4e… | no | WARN | — | — | PASS |
| fadpas24000_m08_s009 | I quattro attributi del pagamento | 679 | 4m 41s | 145 | nuovo | 7a340b67a1… | no | WARN | — | — | PASS |
| fadpas24000_m08_s010 | Cottimo e straordinari | 652 | 4m 32s | 144 | nuovo | b1848c850c… | no | PASS | — | — | PASS |
| fadpas24000_m08_s011 | A.8, requisito 8: prospetto paga comprensibi | 567 | 4m 20s | 131 | nuovo | 47119235c7… | no | PASS | — | — | PASS |
| fadpas24000_m08_s012 | A.8, requisito 9: quali trattenute sono amme | 534 | 3m 59s | 134 | nuovo | 468d5089ff… | no | PASS | — | — | PASS |
| fadpas24000_m08_s013 | A.8, requisito 10: nessuna trattenuta discip | 555 | 4m 9s | 134 | nuovo | dc699e04bb… | no | WARN | — | — | PASS |
| fadpas24000_m08_s014 | A.8, requisito 11: prestazioni obbligatorie  | 546 | 4m 8s | 132 | nuovo | cd88b2ff8e… | no | PASS | — | — | PASS |
| fadpas24000_m08_s015 | A.9: le soglie orarie tra PAS e legge italia | 560 | 3m 52s | 145 | nuovo | 6dcca81d36… | no | WARN | — | — | PASS |
| fadpas24000_m08_s016 | A.9: la scala delle soglie settimanali | 495 | 3m 35s | 138 | nuovo | ba6dc19182… | no | WARN | — | — | PASS |
| fadpas24000_m08_s017 | A.9, requisiti 2 e 3: tutele e registrazione | 539 | 3m 57s | 136 | nuovo | 506515c841… | no | PASS | — | — | PASS |
| fadpas24000_m08_s018 | A.9, requisito 4: straordinario concordato,  | 555 | 4m 0s | 139 | nuovo | 2928488a37… | no | PASS | — | — | PASS |
| fadpas24000_m08_s019 | A.9, requisito 5: autorizzare lo straordinar | 565 | 4m 14s | 134 | nuovo | 9d9bae983c… | no | PASS | — | — | PASS |
| fadpas24000_m08_s020 | A.9: straordinario medio, due campagne a con | 549 | 3m 54s | 141 | nuovo | 4f0766f418… | no | PASS | — | — | PASS |
| fadpas24000_m08_s021 | Pause e riposi tra PAS e legge italiana | 567 | 3m 59s | 142 | nuovo | 7feae6a710… | no | PASS | — | — | PASS |
| fadpas24000_m08_s022 | Un turno di campagna, minuto per minuto | 536 | 3m 39s | 147 | nuovo | 145115f484… | no | WARN | — | — | PASS |
| fadpas24000_m08_s023 | Ferie, permessi e controllo dei riposi | 555 | 4m 12s | 132 | nuovo | 5229ea99d7… | no | PASS | — | — | PASS |
| fadpas24000_m08_s024 | Presenze e paghe: il ciclo di controllo | 537 | 4m 12s | 128 | nuovo | 615256d7bd… | no | PASS | — | — | PASS |
| fadpas24000_m08_s025 | Tre catene di paga, tre livelli di vigilanza | 536 | 4m 2s | 133 | nuovo | c62ce68892… | no | PASS | — | — | PASS |
| fadpas24000_m08_s026 | L'allarme settimanale sulle ore e gli indica | 587 | 4m 11s | 141 | nuovo | 3892d4b3ff… | no | WARN | — | — | PASS |
| fadpas24000_m08_s027 | Il meccanismo di reclamo: requisiti e access | 526 | 3m 58s | 132 | nuovo | 2c3d4380ad… | no | WARN | — | — | PASS |
| fadpas24000_m08_s028 | I canali di reclamo scelti da Agroconserve | 499 | 3m 42s | 135 | nuovo | ed9df83af1… | no | WARN | — | — | PASS |
| fadpas24000_m08_s029 | Riservatezza, non ritorsione ed efficacia de | 515 | 3m 54s | 132 | nuovo | 3a8c545b29… | no | PASS | — | — | PASS |
| fadpas24000_m08_s030 | Dalla segnalazione al rimedio: le sette fasi | 558 | 4m 3s | 138 | nuovo | d736f8031e… | no | PASS | — | — | PASS |
| fadpas24000_m08_s031 | Reclamo PAS ventiquattromila e whistleblowin | 761 | 5m 20s | 143 | nuovo | e28187b64c… | no | WARN | — | — | PASS |
| fadpas24000_m08_s032 | Dai numeri del canale ai tempi di risposta | 793 | 5m 40s | 140 | nuovo | d3e47d8c6a… | no | WARN | — | — | PASS |
| fadpas24000_m08_s033 | Di che cosa parlano i reclami e il caso dell | 766 | 5m 22s | 143 | nuovo | d3a7f31183… | no | PASS | — | — | PASS |
| fadpas24000_m08_s034 | A.11: le condotte vietate e il loro impatto  | 667 | 4m 49s | 139 | nuovo | 088151a0ce… | no | WARN | — | — | PASS |
| fadpas24000_m08_s035 | Dai rischi etici ai presidi: conflitti, dati | 713 | 5m 24s | 132 | nuovo | a0b0c90923… | no | PASS | — | — | PASS |
| fadpas24000_m08_s036 | Nessuna falsificazione, nessun inganno: il t | 719 | 5m 32s | 130 | nuovo | 0fb7b83407… | no | PASS | — | — | PASS |
| fadpas24000_m08_s037 | A.8 in sintesi: dal requisito all'evidenza | 678 | 5m 6s | 133 | nuovo | d51ed83863… | no | PASS | — | — | PASS |
| fadpas24000_m08_s038 | A.9, A.10 e A.11 in sintesi: che cosa guarda | 644 | 4m 51s | 133 | nuovo | d9d2534f89… | no | WARN | — | — | PASS |
| fadpas24000_m08_s039 | Dal mese cinque al mese otto: il calendario  | 690 | 4m 45s | 145 | nuovo | 2ad28b99ef… | no | PASS | — | — | PASS |
| fadpas24000_m08_s040 | So spiegare che cosa conta davvero | 697 | 4m 53s | 143 | nuovo | 836af161fa… | no | PASS | — | — | PASS |
| fadpas24000_m08_s041 | I dieci punti chiave dell'unità, verso il ch | 942 | 7m 4s | 133 | nuovo | 086dd839b1… | no | PASS | — | — | PASS |
| fadpas24000_m09_s001 | Bentornato e mappa dell'unità | 581 | 4m 9s | 140 | nuovo | 1319f47e5a… | no | PASS | — | — | PASS |
| fadpas24000_m09_s002 | Pianificazione e controllo operativo: dal re | 644 | 4m 53s | 132 | nuovo | 19d61908bc… | no | PASS | — | — | PASS |
| fadpas24000_m09_s003 | Il piano di lavoro annuale: che cosa richied | 648 | 4m 45s | 136 | nuovo | 0040a3d6e9… | no | PASS | — | — | PASS |
| fadpas24000_m09_s004 | Come costruire un piano di lavoro annuale ch | 652 | 4m 47s | 136 | nuovo | 5b267cb332… | no | WARN | — | — | PASS |
| fadpas24000_m09_s005 | Gestire i cambiamenti operativi: dalla propo | 634 | 4m 40s | 136 | nuovo | 2922c3c6d7… | no | WARN | — | — | PASS |
| fadpas24000_m09_s006 | I cambiamenti tipici e il caso del picco di  | 673 | 4m 48s | 140 | nuovo | c57780d96d… | no | WARN | — | — | PASS |
| fadpas24000_m09_s007 | L'approvvigionamento sociale e il suo perime | 671 | 4m 49s | 140 | nuovo | 4015c32a54… | no | PASS | — | — | PASS |
| fadpas24000_m09_s008 | La filiera di Agroconserve e la scala dei co | 646 | 4m 48s | 135 | nuovo | 92af730ff0… | no | WARN | — | — | PASS |
| fadpas24000_m09_s009 | Sei criteri per valutare il rischio sociale  | 629 | 4m 41s | 134 | nuovo | e978450959… | no | WARN | — | — | PASS |
| fadpas24000_m09_s010 | Dove stanno le priorità: fornitori mappati e | 632 | 4m 44s | 134 | nuovo | b2ec4377ba… | no | PASS | — | — | PASS |
| fadpas24000_m09_s011 | Qualificare i fornitori: dal rischio alla de | 647 | 4m 43s | 137 | nuovo | 8353db9bdf… | no | PASS | — | — | PASS |
| fadpas24000_m09_s012 | Codice di condotta, clausole e autovalutazio | 657 | 5m 16s | 125 | nuovo | 2c56c7d99a… | no | PASS | — | — | PASS |
| fadpas24000_m09_s013 | Monitorare i fornitori ad alto rischio: che  | 654 | 4m 51s | 135 | nuovo | 1b98462e0b… | no | PASS | — | — | PASS |
| fadpas24000_m09_s014 | Dai rilievi ai piani correttivi: esiti delle | 664 | 4m 58s | 134 | nuovo | ded5b79335… | no | PASS | — | — | PASS |
| fadpas24000_m09_s015 | Quando il rischio nasce dagli acquisti: il c | 659 | 4m 43s | 140 | nuovo | b44a9bb585… | no | WARN | — | — | PASS |
| fadpas24000_m09_s016 | Agenzie e appalti interni: chi lavora nel si | 659 | 4m 38s | 142 | nuovo | fb0144f575… | no | PASS | — | — | PASS |
| fadpas24000_m09_s017 | Che cosa controllare su agenzie e appalti: l | 661 | 4m 44s | 140 | nuovo | 2db3fdfa97… | no | PASS | — | — | PASS |
| fadpas24000_m09_s018 | Controlli a campione e il caso della coopera | 625 | 4m 27s | 141 | nuovo | 07f49be6b2… | no | PASS | — | — | PASS |
| fadpas24000_m09_s019 | Punto 9.1.1: che cosa chiedono gli indicator | 631 | 4m 44s | 133 | nuovo | c5080d8684… | no | PASS | — | — | PASS |
| fadpas24000_m09_s020 | Indicatori per le aree dell'Annex A: esempi  | 639 | 4m 49s | 132 | nuovo | dcfcb18fdc… | no | PASS | — | — | PASS |
| fadpas24000_m09_s021 | Quando misurare e quando analizzare: il ritm | 606 | 4m 20s | 140 | nuovo | 8c78eebef1… | no | PASS | — | — | PASS |
| fadpas24000_m09_s022 | Raccogliere i dati e costruire il cruscotto  | 673 | 4m 50s | 139 | nuovo | cc4cd25c97… | no | PASS | — | — | PASS |
| fadpas24000_m09_s023 | Leggere il cruscotto: allarmi, profilo per a | 656 | 4m 31s | 145 | nuovo | e3e22b0808… | no | WARN | — | — | PASS |
| fadpas24000_m09_s024 | Punto 9.1.2: le sei valutazioni dell'analisi | 645 | 4m 48s | 134 | nuovo | 68685c16bf… | no | PASS | — | — | PASS |
| fadpas24000_m09_s025 | Dai dati alle decisioni: fine campagna e per | 670 | 4m 49s | 139 | nuovo | f416970105… | no | WARN | — | — | PASS |
| fadpas24000_m09_s026 | So spiegare che: autovalutazione finale sui  | 595 | 4m 23s | 136 | nuovo | 7519b446c8… | no | PASS | — | — | PASS |
| fadpas24000_m09_s027 | Errori da evitare e dieci punti chiave verso | 629 | 4m 36s | 136 | nuovo | 58ddfb3d84… | no | WARN | — | — | PASS |
| fadpas24000_m10_s001 | Bentornato: chiudere il ciclo e verificare c | 538 | 3m 56s | 137 | nuovo | 3ae757beb2… | no | WARN | — | — | PASS |
| fadpas24000_m10_s002 | Principi credibili e tutela di chi verifica | 555 | 4m 14s | 131 | nuovo | ba4248a90d… | no | PASS | — | — | PASS |
| fadpas24000_m10_s003 | Dal piano alla verifica dell'efficacia: il c | 614 | 4m 36s | 134 | nuovo | 1d299969d7… | no | PASS | — | — | PASS |
| fadpas24000_m10_s004 | Priorità ragionate: dove concentrare tempo e | 607 | 4m 18s | 141 | nuovo | 633b8d6db7… | no | WARN | — | — | PASS |
| fadpas24000_m10_s005 | Dodici mesi ben distribuiti e consultati dav | 627 | 4m 28s | 140 | nuovo | 772dfe244c… | no | WARN | — | — | PASS |
| fadpas24000_m10_s006 | Triangolare le fonti: quando un fatto divent | 549 | 3m 59s | 138 | nuovo | 05d996c9d9… | no | PASS | — | — | PASS |
| fadpas24000_m10_s007 | Interviste riservate e campione: chi ascolti | 590 | 4m 34s | 129 | nuovo | 09beecb124… | no | PASS | — | — | PASS |
| fadpas24000_m10_s008 | Presenze, paghe e sopralluogo: seguire il la | 563 | 4m 3s | 139 | nuovo | b790ab4316… | no | PASS | — | — | PASS |
| fadpas24000_m10_s009 | Dai fatti ai rilievi: classificare senza con | 564 | 4m 8s | 137 | nuovo | 35038a8268… | no | PASS | — | — | PASS |
| fadpas24000_m10_s010 | Esiti del mese otto e la maggiore che ha cam | 600 | 4m 25s | 136 | nuovo | 242a888baf… | no | WARN | — | — | PASS |
| fadpas24000_m10_s011 | Il rapporto di audit che apre le decisioni | 655 | 4m 49s | 136 | nuovo | 5ca4eebeee… | no | PASS | — | — | PASS |
| fadpas24000_m10_s012 | Punto 9.3: che cosa entra e che cosa esce da | 582 | 4m 24s | 132 | nuovo | a1eca7223c… | no | WARN | — | — | PASS |
| fadpas24000_m10_s013 | Dal dato alla decisione: come si svolge un r | 638 | 4m 39s | 137 | nuovo | 0333c2ba97… | no | WARN | — | — | PASS |
| fadpas24000_m10_s014 | Il riesame del mese nove: numeri, giudizio e | 613 | 4m 20s | 141 | nuovo | c583856735… | no | PASS | — | — | PASS |
| fadpas24000_m10_s015 | Punto 10.2: un solo processo per eventi dive | 588 | 4m 17s | 137 | nuovo | def8a95e59… | no | PASS | — | — | PASS |
| fadpas24000_m10_s016 | Dall'evento alla chiusura: passaggi, priorit | 626 | 4m 43s | 133 | nuovo | 7cfa20df68… | no | PASS | — | — | PASS |
| fadpas24000_m10_s017 | Il reclamo sulla navetta: un caso completo d | 624 | 4m 31s | 138 | nuovo | 1b604b2fd4… | no | PASS | — | — | PASS |
| fadpas24000_m10_s018 | Correzione e azione correttiva: dove molte r | 624 | 4m 32s | 137 | nuovo | 7e9e39836f… | no | WARN | — | — | PASS |
| fadpas24000_m10_s019 | Dai sintomi alla causa: Ishikawa e cinque pe | 617 | 4m 21s | 142 | nuovo | b84826ffb9… | no | PASS | — | — | PASS |
| fadpas24000_m10_s020 | Piano di azione ed efficacia: la prova arriv | 590 | 4m 31s | 131 | nuovo | 23efe9f7d2… | no | PASS | — | — | PASS |
| fadpas24000_m10_s021 | Miglioramento continuo: da quali segnali nas | 690 | 5m 10s | 133 | nuovo | f79241e87f… | no | PASS | — | — | PASS |
| fadpas24000_m10_s022 | Dieci mesi dopo: la nuova gap analysis e l'a | 656 | 4m 46s | 138 | nuovo | 12fd893b3e… | no | PASS | — | — | PASS |
| fadpas24000_m10_s023 | Il percorso di certificazione: dalle prime v | 594 | 4m 15s | 140 | nuovo | b98d555258… | no | WARN | — | — | PASS |
| fadpas24000_m10_s024 | Dopo la verifica esterna: rilievi, delibera  | 789 | 5m 44s | 138 | nuovo | 632145a801… | no | PASS | — | — | PASS |
| fadpas24000_m10_s025 | Durata delle verifiche: addetti, rischio e l | 749 | 5m 29s | 136 | nuovo | 929cb65da7… | no | PASS | — | — | PASS |
| fadpas24000_m10_s026 | Competenze del gruppo e scelta tra PAS 24000 | 757 | 5m 47s | 131 | nuovo | 1f2eb95ea8… | no | WARN | — | — | PASS |
| fadpas24000_m10_s027 | Il caso Agroconserve: la fase uno e le aree  | 750 | 5m 18s | 142 | nuovo | fd3a218535… | no | PASS | — | — | PASS |
| fadpas24000_m10_s028 | Verifica interna severa e fase due: che cosa | 732 | 5m 19s | 138 | nuovo | f451d00b7c… | no | WARN | — | — | PASS |
| fadpas24000_m10_s029 | La fase due, le due minori e il piano che po | 737 | 5m 12s | 142 | nuovo | 63085ef511… | no | WARN | — | — | PASS |
| fadpas24000_m10_s030 | Dieci mesi di progetto: risultati, lezioni a | 777 | 5m 30s | 141 | nuovo | ab2aeeaed9… | no | WARN | — | — | PASS |
| fadpas24000_m10_s031 | La mappa finale del corso: dieci unità, diec | 654 | 4m 51s | 135 | nuovo | 7a0ceead24… | no | PASS | — | — | PASS |
| fadpas24000_m10_s032 | Le frequenze da ricordare e ciò che devi sap | 635 | 4m 54s | 129 | nuovo | e6b7b1a389… | no | PASS | — | — | PASS |
| fadpas24000_m10_s033 | Gli errori da evitare, fase per fase | 693 | 5m 12s | 133 | nuovo | 1786889e8b… | no | WARN | — | — | PASS |
| fadpas24000_m10_s034 | La lista di controllo del consulente e i die | 671 | 5m 9s | 130 | nuovo | 0354e2f359… | no | WARN | — | — | PASS |
