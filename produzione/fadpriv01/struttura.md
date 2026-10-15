# Privacy e protezione dei dati per il personale — FAD-PRIV-01 (3h)

> Skeleton di produzione. Fonte: contenuto didattico ORIGINALE del committente in
> `_html/FAD-PRIV-01_Privacy_Dipendenti.html` (un file: modulo 0 di presentazione + 5 moduli,
> 34 schermate, 7 esercizi preclusivi, 20 domande di checkpoint, esame di 12 domande) — mai copia
> verbatim, distillato in copioni parlati (stile marcello-v2, lista bianca dura). Riferimento
> normativo: **Regolamento UE 2016/679 (GDPR)**, artt. 4, 5, 6, 9, 10, 13-14, 15-22, 28, 29, 30,
> 32, 33, 34; **D.Lgs. 196/2003** come modificato dal D.Lgs. 101/2018, art. 2-quaterdecies. Le
> regole, i termini (un mese, settantadue ore) e gli esempi del committente sono la fonte di verità:
> mai inventare obblighi, articoli o numeri.
> Budget: 3h = 180 minuti legali · target contenuti ≈ 183 min (margine +3).
> Slide ≈ 4,5 min di narrazione ciascuna (2,35 parole/s, marcello-v2). ID slide: `fadpriv01_mNN_sNNN`.
> Palette slide: **ambra** — alternanza con il navy di fadcfp01, l'ultimo corso prodotto.
> Area catalogo: privacy e compliance · Livello: base · Destinatari: tutto il personale autorizzato
> al trattamento (impiegati, operatori, addetti di reception, amministrazione, produzione).
> Corso **obbligatorio** per le aziende (formazione degli autorizzati, artt. 29 e 32 par. 4 GDPR).
> Caso ricorrente del committente: **Officine Meridiana S.r.l.** (lo studio di consulenza del lavoro,
> l'impiegata Anna, il sig. Russo): da conservare identico.
> Verifica: checkpoint M1-M5 + esame finale, soglia 75%. Attestato: solo EVALIS (nessun CERTIS).
> Prezzo: 50 € a persona; 30 € a persona nei pacchetti aziendali con più dipendenti.

## Moduli (5 moduli = 5 lezioni piattaforma)

| Mod | Titolo | Copre (fonte HTML) | Durata | Slide |
|---|---|---|---|---|
| M1 | Il GDPR in azienda: principi e definizioni | presentazione del corso, obiettivi e programma; perché la privacy riguarda ogni lavoratore; trattamento, dato personale, interessato; dati comuni, categorie particolari e dati giudiziari; esercizio guidato classifica il dato; i sette principi dell'articolo 5; le basi giuridiche dell'articolo 6; informativa e registro dei trattamenti | 40 min | 9 |
| M2 | Ruoli, istruzioni e diritti degli interessati | titolare, responsabile, autorizzato, DPO e referente privacy; esercizio guidato chi è chi in Officine Meridiana; le istruzioni scritte per gli autorizzati; i diritti degli interessati dagli articoli 15 a 22; il termine di un mese; cosa fare se ricevi una richiesta | 35 min | 8 |
| M3 | Sicurezza quotidiana: password, phishing, dispositivi, lavoro da remoto | il fattore umano; password e autenticazione a due fattori; il phishing e i suoi segnali; esercizio guidato i segnali nella mail; postazione, carta, dispositivi mobili e comunicazioni; lavoro da remoto e smart working; esercizio guidato controllo della postazione | 45 min | 10 |
| M4 | Data breach: riconoscerlo e segnalarlo | che cos'è un data breach: riservatezza, integrità, disponibilità; esempi reali in azienda; le settantadue ore e il registro delle violazioni; esercizio guidato i passi nell'ordine giusto; cosa fare e cosa non fare | 27 min | 6 |
| M5 | Casi pratici e istruzioni operative | cinque casi pratici: il corriere e l'indirizzo di casa, il certificato medico su WhatsApp, la richiesta di non ricevere offerte, il file con codici fiscali e IBAN al consulente, le foto della festa aziendale; le istruzioni operative di ogni giorno; preparazione all'esame | 36 min | 8 |

**Totale: 183 min (3h 3m) · 41 slide.**

## Verifiche

- **Checkpoint**: uno per modulo, M1-M5 (bloccante, banca ≥10, estrazione 5, soglia 80%). Le
  domande partono dai 20 checkpoint del committente (`_fonte/quiz.json`, campo `checkpoint`),
  completate sul contenuto del modulo di appartenenza.
- **Esame finale**: banca dalle 12 domande d'esame del committente più domande nuove sugli stessi
  moduli, estrazione 12, **soglia 75%** (9 su 12, come nel materiale del committente).
- **Esercizi preclusivi del committente**: diventano slide di **esercizio guidato** (il docente
  propone le voci e spiega la soluzione); le loro voci alimentano le banche dei checkpoint, che sono
  il blocco verificato dal server.

## Note di produzione

- **Glossario TTS** (`glossario-tts.json`): GDPR, Reg. UE 2016/679, D.Lgs. 196/2003, D.Lgs. 101/2018,
  articolo 2-quaterdecies, DPO, IBAN, VPN, Ccn, 2FA, sigle e termini inglesi (data breach, phishing,
  clean desk, smart working, password manager). Regola invariata: norme, anni e articoli in CIFRE;
  mai trattini, parentesi, barre o simboli nel parlato. Batteria di pronuncia PRIMA del batch audio.
- **Fonte**: `produzione/fadpriv01/_fonte/mNN.txt` (estratta eseguendo lo script del corso). I copioni
  ESPANDONO fino al budget con esempi d'ufficio e casi di Officine Meridiana, senza mai copiare la
  fonte né nominarla. Mai indicazioni di tasti o comandi letti a voce come sigle.

## Argomenti per modulo (slide per slide)

### M1 — Il GDPR in azienda: principi e definizioni (9 slide)
- Benvenuto: perché il corso è obbligatorio, come funziona, moduli in sequenza e checkpoint — 1 slide
- Obiettivi di apprendimento e programma dei cinque moduli — 1 slide
- Perché la privacy riguarda anche te: trattamento, dato personale identificabile, interessato — 1 slide
- Dati comuni, categorie particolari dell'articolo 9 e dati giudiziari dell'articolo 10 — 1 slide
- Esercizio guidato: classifica il dato, dalla targa alla temperatura del forno — 1 slide
- I sette principi dell'articolo 5: liceità, finalità, minimizzazione, esattezza — 1 slide
- I sette principi: conservazione, integrità e riservatezza, responsabilizzazione — 1 slide
- Le basi giuridiche dell'articolo 6: contratto, obbligo di legge, legittimo interesse, consenso — 1 slide
- Informativa e registro dei trattamenti; sintesi e verso il checkpoint — 1 slide

### M2 — Ruoli, istruzioni e diritti degli interessati (8 slide)
- Chi fa cosa: titolare e responsabile del trattamento con contratto — 1 slide
- L'autorizzato, il DPO e il referente privacy: autorizzazione legata alla mansione — 1 slide
- Esercizio guidato: chi è chi in Officine Meridiana — 1 slide
- Le istruzioni per gli autorizzati: accesso, comunicazione, strumenti personali — 1 slide
- Le istruzioni: copie, custodia, segnalazioni, cessazione; l'ex collega al telefono — 1 slide
- I diritti degli interessati: accesso, rettifica, cancellazione, limitazione — 1 slide
- Portabilità, opposizione, decisioni automatizzate e il termine di un mese — 1 slide
- Cosa fare se ricevi una richiesta; sintesi e verso il checkpoint — 1 slide

### M3 — Sicurezza quotidiana: password, phishing, dispositivi, lavoro da remoto (10 slide)
- Il fattore umano: misure tecniche e misure comportamentali — 1 slide
- Password robuste, frasi lunghe, mai condivise; password manager e autenticazione a due fattori — 1 slide
- Phishing: che cos'è, urgenza e minaccia, mittente anomalo — 1 slide
- Phishing: link, allegati, richieste insolite e la regola d'oro del canale diverso — 1 slide
- Esercizio guidato: i quattro segnali nella mail del falso direttore — 1 slide
- Postazione e carta: blocco schermo, clean desk, stampe, distruggidocumenti — 1 slide
- Dispositivi mobili e comunicazioni: cifratura, smarrimento, Ccn, allegati sensibili — 1 slide
- Lavoro da remoto e smart working: dispositivi aziendali, VPN, riservatezza in casa e in viaggio — 1 slide
- Esercizio guidato: il controllo della postazione a fine giornata — 1 slide
- Sintesi del modulo e verso il checkpoint — 1 slide

### M4 — Data breach: riconoscerlo e segnalarlo (6 slide)
- Che cos'è un data breach: riservatezza, integrità, disponibilità — 1 slide
- Esempi reali in azienda: busta paga sbagliata, foglio sulla fotocopiatrice, chiavetta, portale aperto — 1 slide
- Le settantadue ore, la comunicazione agli interessati e il registro delle violazioni — 1 slide
- Esercizio guidato: i passi nell'ordine giusto dopo un invio sbagliato — 1 slide
- Cosa fare e cosa non fare; il caso di Giulia — 1 slide
- Sintesi del modulo e verso il checkpoint — 1 slide

### M5 — Casi pratici e istruzioni operative (8 slide)
- Caso uno: il corriere chiede l'indirizzo di casa di un dipendente — 1 slide
- Caso due: il certificato medico chiesto sul WhatsApp personale — 1 slide
- Caso tre: il cliente che non vuole più ricevere offerte — 1 slide
- Caso quattro: codici fiscali e IBAN da inviare al consulente esterno — 1 slide
- Caso cinque: le foto della festa aziendale sui social — 1 slide
- Le istruzioni operative di ogni giorno e quando hai un dubbio — 1 slide
- Le cose da fare subito, senza aspettare; contatti del referente e dell'IT — 1 slide
- Sintesi del corso e preparazione all'esame finale — 1 slide
