# D.Lgs. 231/2001 per il personale operativo — FAD-231-02 (8h)

> Skeleton di produzione. Fonte: contenuto didattico ORIGINALE del committente in
> `_html/FAD-231-02_Formazione_231_Personale_Operativo.html` (un file: 4 moduli da 2 ore, 31 schermate, 21 step di controllo con spiegazione, 4 test di fine modulo da 10 domande, esame di 15 domande). Estratto con `scripts/produzione/_estrai-fonte-231.mjs` in
> `_fonte/mNN.txt` (circa 7.200 parole, step di controllo con la spiegazione compresi) e
> `_fonte/quiz.json`. Mai copia verbatim: distillato in copioni parlati (stile marcello-v2, lista bianca dura).
> Riferimento normativo: **D.Lgs. 8 giugno 2001, n. 231** e **D.Lgs. 10 marzo 2023, n. 24** nel testo VIGENTE al
> 10/11/2026 (Normattiva), riportati in coda a ogni `_fonte/mNN.txt` con gli articoli del modulo, e per la
> sicurezza gli **artt. 16 e 30 del D.Lgs. 81/2008**. Le regole, gli esempi e il caso Metalfer Sud S.r.l. del
> committente sono la fonte di verità; per articoli, quote, termini e sentenze vale il testo di legge vigente.
> Mai inventare articoli, sentenze, importi o termini: il controllo dei riferimenti dei copioni contro il testo
> di legge è un passo obbligatorio prima del LOCK. Le note di produzione di ogni modulo sono in
> `_fonte-note.json` (nota comune, aggiornamenti del catalogo, articoli di legge per modulo).
> Nota: il materiale scrive «soglia 75%» ma i suoi test calcolano 8/10 e 12/15 (80%). Sulla piattaforma:
> checkpoint 80% (standard), esame 75% su 15 domande = 12 risposte giuste, identico al committente.
> Budget: 480 minuti legali · target contenuti 488 min (margine +1,7%).
> Slide ≈ 4,5 min di narrazione ciascuna (2,35 parole/s, marcello-v2). ID slide: `fad23102_mNN_sNNN`.
> Palette slide: **navy (blu petrolio)** — alternanza con l'ambra di fad23101.
> Destinatari: operai, addetti di produzione e cantiere, impiegati, magazzinieri, autisti, preposti e collaboratori; linguaggio semplice, nessun prerequisito · Livello: base.
> Prezzo: 100 € (barrato e prezzo aziende da confermare). Attestato: da confermare (proposta: solo EVALIS).

## Moduli (un modulo del committente = un modulo = una lezione della piattaforma)

| Mod | Titolo | Copre (fonte HTML) | Durata | Slide |
|---|---|---|---|---|
| M1 | La 231 spiegata semplice: perché riguarda anche me | Presentazione del corso (introduzione del committente); Una legge che punisce le aziende; Quali reati? Alcuni esempi concreti; Il Modello organizzativo: lo "scudo" dell’azienda; Il Codice Etico: le regole del gioco; A chi si applicano le regole; Il sistema disciplinare: cosa succede se non rispetto le regole; L’Organismo di Vigilanza (OdV); Sintesi del Modulo 1 | 122 min | 27 |
| M2 | Comportamenti corretti nelle situazioni a rischio: enti pubblici, regali, fornitori, documenti, dati | Rapporti con enti pubblici e funzionari; Regali, ospitalità e favori; Fornitori, subappaltatori e materiali; Documenti, registrazioni e firme; Computer, password e dati; Rispetto delle persone: colleghi e lavoratori esterni; Esercitazione: cosa faresti?; Sintesi del Modulo 2 | 122 min | 27 |
| M3 | Sicurezza e ambiente sul campo: le regole che evitano i reati più frequenti | Perché la sicurezza è il primo rischio 231; Chi fa cosa: i ruoli della sicurezza; Regole operative in officina e cantiere; Pressioni e scorciatoie: come rispondere; Ambiente: rifiuti, sostanze, scarichi, emissioni; Visite ispettive e controlli delle autorità; Esercitazione: situazioni di reparto e cantiere; Sintesi del Modulo 3 | 122 min | 27 |
| M4 | Segnalare e agire: whistleblowing, tutele, cosa succede dopo e riepilogo finale | Segnalare: perché e che cosa; A chi e come segnalare; Cosa succede dopo la segnalazione; Le tutele: niente ritorsioni, riservatezza garantita; Il tuo contributo al Modello, ogni giorno; Esercitazione finale: dieci situazioni; Riepilogo del corso e preparazione all’esame | 122 min | 27 |

**Totale: 488 min (8h 8m) · 108 slide.**

## Verifiche

- **Checkpoint**: uno per modulo (bloccante, banca ≥10, estrazione 5, soglia 80%). Banca = domande
  dell'orchestratore + step di controllo e test di fine modulo del committente SOSTENUTI dal parlato
  (`_banche-committente.py`, campo `checkpoint` di `_fonte/quiz.json`).
- **Esame finale**: banca dalle 15 domande d'esame del committente più 15 domande nuove, **estrazione 15, soglia 75%** (12 su 15: il committente scrive 75% ma calcola 12/15, che coincide).
- **Esercitazioni del committente** (tabelle situazione → comportamento corretto): diventano slide di
  **esercizio guidato** narrato; nessun widget interattivo.

## Note di produzione

- **Glossario TTS** (`glossario-tts.json`): D.Lgs. 231/2001, 24/2023, 81/2008, 152/2006, 74/2000 e le altre
  leggi citate; articoli con suffisso latino (bis, ter, quater … septies, octies, undecies, duodecies,
  quinquiesdecies, sexiesdecies, septiesdecies, duodevicies, undevicies, vicies) e con punto (25-octies.1);
  c.p., c.c., c.p.p., OdV, CdA, PA, RSPP, DVR, ANAC, ASL, TUA, EER, FIR, AUA, SSL, i termini inglesi
  (whistleblowing, risk assessment, gap analysis, tone at the top, red flag, self-cleaning, compliance).
  Regola invariata: leggi, anni e articoli in CIFRE; mai trattini, parentesi, barre o simboli nel parlato.
  Batteria di pronuncia PRIMA del batch audio.
- **Fonte**: `produzione/fad23102/_fonte/mNN.txt`. I copioni ESPANDONO fino al budget con spiegazioni,
  esempi d'azienda e buone pratiche dichiarate come tali, senza mai copiare la fonte né nominarla.

## Argomenti per modulo (slide per slide)

### M1 — La 231 spiegata semplice: perché riguarda anche me (27 slide)
- Benvenuto e apertura del corso. Presentazione del corso (introduzione del committente): D.Lgs. 231/2001 per il personale operativo: Codice Etico, Modello organizzativo e comportamenti corretti. — 3 slide
- Una legge che punisce le aziende: Che cosa dice, in due righe; Prima del 2001; Oggi; Che cosa rischia l’azienda. — 3 slide
- Quali reati? Alcuni esempi concreti: Non tutti i reati: solo quelli in una lista precisa. — 2 slide
- Il Modello organizzativo: lo "scudo" dell’azienda: Come l’azienda si difende; Perché funziona solo se lo rispettiamo tutti. — 4 slide
- Il Codice Etico: le regole del gioco: I principi che valgono per tutti; Regole operative che derivano dal Codice (esempi). — 3 slide
- A chi si applicano le regole: Destinatari del Modello e del Codice Etico; Che cosa chiede l’azienda a te, in concreto. — 3 slide
- Il sistema disciplinare: cosa succede se non rispetto le regole: Il punto chiave; Esempi di violazioni sanzionabili; Le sanzioni (dal contratto collettivo). — 3 slide
- L’Organismo di Vigilanza (OdV): Chi è e cosa fa; Che cosa fa in pratica; Come comportarsi con l’OdV. — 4 slide
- Sintesi del Modulo 1: Da ricordare; Le tre domande da farsi sempre. Verso il checkpoint. — 2 slide

### M2 — Comportamenti corretti nelle situazioni a rischio: enti pubblici, regali, fornitori, documenti, dati (27 slide)
- Bentornato e mappa dell'unità. Rapporti con enti pubblici e funzionari: Chi è un "pubblico ufficiale" nel nostro lavoro; Regole pratiche. — 4 slide
- Regali, ospitalità e favori: La regola generale; Perché è importante anche per chi lavora in produzione o magazzino; Come rifiutare senza imbarazzo; Se il regalo arriva senza che tu possa rifiutarlo (es. spedito in azienda). — 4 slide
- Fornitori, subappaltatori e materiali: Chi lavora con i fornitori ha un ruolo di controllo; Segnali di allarme da riferire al responsabile. — 3 slide
- Documenti, registrazioni e firme: Ogni firma è una dichiarazione; Regole; Perché conta per la 231. — 4 slide
- Computer, password e dati: Regole sull’uso dei sistemi informatici; Dati personali e informazioni riservate. — 4 slide
- Rispetto delle persone: colleghi e lavoratori esterni: Che cosa chiede il Codice Etico; Caporalato e sfruttamento: i segnali; Che cosa fare. — 4 slide
- Esercitazione: cosa faresti?: Sei situazioni, una decisione. — 2 slide
- Sintesi del Modulo 2: Da ricordare; Le parole chiave. Verso il checkpoint. — 2 slide

### M3 — Sicurezza e ambiente sul campo: le regole che evitano i reati più frequenti (27 slide)
- Bentornato e mappa dell'unità. Perché la sicurezza è il primo rischio 231: Il reato più frequente nei processi 231; Il "si è sempre fatto così" costa caro. — 3 slide
- Chi fa cosa: i ruoli della sicurezza. — 4 slide
- Regole operative in officina e cantiere: DPI e attrezzature; Procedure e lavori a rischio; Segnalare e fermarsi. — 4 slide
- Pressioni e scorciatoie: come rispondere: Le frasi che devono accendere l’allarme; Come rispondere, con rispetto ma con fermezza; Se la pressione continua. — 3 slide
- Ambiente: rifiuti, sostanze, scarichi, emissioni: Perché è un rischio 231; Rifiuti: le regole in reparto; Sostanze, scarichi, emissioni. — 4 slide
- Visite ispettive e controlli delle autorità: Chi può arrivare; Come comportarsi; Attenzione a due reati "collaterali". — 4 slide
- Esercitazione: situazioni di reparto e cantiere. — 3 slide
- Sintesi del Modulo 3: Da ricordare; Le parole chiave. Verso il checkpoint. — 2 slide

### M4 — Segnalare e agire: whistleblowing, tutele, cosa succede dopo e riepilogo finale (27 slide)
- Bentornato e mappa dell'unità. Segnalare: perché e che cosa: Perché segnalare conviene a tutti; Che cosa si può segnalare; Che cosa NON è una segnalazione whistleblowing. — 4 slide
- A chi e come segnalare: I canali disponibili; Come scrivere una buona segnalazione; Tempi. — 5 slide
- Cosa succede dopo la segnalazione: Il percorso della segnalazione; Che cosa ti verrà comunicato; Che cosa succede alla persona segnalata; Che cosa succede se la segnalazione era sbagliata. — 4 slide
- Le tutele: niente ritorsioni, riservatezza garantita: Divieto di ritorsione (D.Lgs. 24/2023, art. 17); Riservatezza; Sanzioni per chi fa ritorsioni o ostacola. — 4 slide
- Il tuo contributo al Modello, ogni giorno: Le cose che il Modello ti chiede regolarmente; Cosa puoi aspettarti dall’azienda. — 3 slide
- Esercitazione finale: dieci situazioni. — 4 slide
- Riepilogo del corso e preparazione all’esame: I quattro moduli in sintesi; L’esame finale. Chiusura del corso e preparazione all'esame finale. — 3 slide
