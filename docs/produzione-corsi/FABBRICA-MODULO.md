# FABBRICA-MODULO — regole vincolanti per la scrittura di un modulo

> Questo documento è parte di ogni pacchetto modulo. Chi scrive (agente o umano) deve
> rispettare OGNI regola: i gate automatici (lint E1-E8 + quiz-lint) bloccano le
> violazioni misurabili, la revisione umana boccia il resto. Una bozza respinta due
> volte si riscrive da capo.

## 1. Contenuto

1. **Originale, mai verbatim**: la sezione norma nel pacchetto è la tua unica fonte
   tecnica, ma NESSUNA sequenza di 8+ parole può coincidere col suo testo (gate E5).
   Spiega con parole tue, riformula le definizioni introducendole ("la norma descrive…",
   "in sostanza…"), non citare mai interi periodi.
2. **Fondato SOLO sulla sezione ricevuta**: non inventare requisiti, numeri di clausola,
   obblighi o dettagli che non trovi nel testo consegnato. Se un blocco skeleton chiede
   qualcosa che nella sezione non c'è, sviluppalo come contenuto metodologico/di buona
   pratica dichiarandolo tale ("nella pratica professionale…"), mai come "la norma dice".
3. **Ogni blocco skeleton va sviluppato**, nell'ordine dato, col numero di slide indicato
   (±1 slide di flessibilità tra blocchi adiacenti; il totale del modulo è FISSO).
4. **I concetti della lista E7 devono comparire letteralmente** (stesse parole) almeno
   una volta nel testo del modulo.
5. **Esempi concreti**: inventati ma realistici e tecnicamente sensati; almeno un esempio
   sviluppato ogni 2-3 slide. Mai nomi di aziende reali.
6. **Seconda persona**, tono docente caldo e professionale (vedi le due slide di
   riferimento nel pacchetto): mai "noi accademico", mai burocratese.
7. **Transizioni**: ogni slide chiude preparando la successiva ("Nella prossima slide…"
   o equivalente variato). L'ultima slide del modulo: riepilogo + preparazione al
   checkpoint + aggancio al modulo successivo (il titolo lo trovi nello skeleton).
8. La prima slide del modulo dà il bentornato e la mappa del modulo; mai ripartire da zero
   come se il corso iniziasse lì.

## 2. Forma (ottimizzazione TTS — la voce sintetica legge ESATTAMENTE ciò che scrivi)

1. Frasi tra 8 e 25 parole, punteggiatura ricca (virgole, due punti); una frase oltre
   35 parole è un errore di stile.
2. **"audit" e "auditor" MAI nelle prime 10 parole** di una slide (gate E2). Apri la
   slide con altre parole, poi usali liberamente.
3. **Numeri e sigle**: usa SOLO le chiavi del glossario consegnato (es. "ISO 19011" sì,
   perché il glossario la converte). Ogni ALTRO numero va scritto in lettere ("tre
   requisiti", "cinque giorni"). Niente date in cifre, niente percentuali in cifre
   ("l'ottanta per cento"). Gate E3 blocca ogni cifra fuori glossario.
4. **È UN COPIONE, non un testo da leggere**: PARLATO CONTINUO e discorsivo. Vietati in
   assoluto: parentesi di OGNI tipo (tonde, quadre, graffe), virgolette di ogni tipo,
   elenchi puntati o numerati, markdown, trattini lunghi, simboli (percento, e commerciale,
   barra, gradi), emoji, abbreviazioni da testo scritto ("es.", "ecc.", "n."): si scrive
   "per esempio", "eccetera", "numero". Ammessi SOLO: punto, virgola, due punti, punto e
   virgola, punto interrogativo, punto esclamativo, apostrofo, trattino corto nelle parole
   composte. Ogni inciso si rende con le virgole, ogni elenco si scioglie nel discorso
   ("tre cose: la prima… la seconda… e infine…"). Gate E4 blocca tutto il resto.
5. Niente riferimenti a numeri di pagina o figure della norma. I numeri di clausola
   (es. "il punto sei uno") con parsimonia e solo se nel glossario o in lettere.
6. Parole straniere: ammesse quelle correnti del settore (management, leadership…);
   la pronuncia inglese imperfetta è accettata (decisione cliente). Le parole ITALIANE
   devono essere ortograficamente perfette: la voce legge gli errori.
7. **ACCENTI OBBLIGATORI** (gate E9): ogni parola che in italiano è sempre accentata va
   scritta con l'accento — perché, poiché, benché, affinché, così, più, già, può, sarà,
   verrà, potrà, dovrà, cioè, perciò, finché, e TUTTI i nomi in -tà (città, qualità,
   attività, possibilità, realtà, società, verità, libertà, responsabilità, autorità,
   priorità, maturità, complessità, conformità, proprietà, università, identità, entità,
   novità). Scrivere "perche" o "attivita" senza accento è un ERRORE bloccante: la voce
   sintetica leggerebbe la parola sbagliata.

## 3. Lunghezza

1. Ogni slide: **600-640 parole** (budgetParole nel pacchetto). Mai sotto 560, mai
   sopra 660.
2. Totale modulo dentro i limiti del pacchetto: **da -5% a +2%** del budget. Se devi
   scegliere, stai CORTO: allungare dopo costa poco, tagliare audio prodotto costa tutto.

## 4. Checkpoint (SOLO la banca del tuo modulo)

Segui QUIZ-STANDARD.md (incluso nel pacchetto): ≥10 domande, mix 4 riconoscimento +
4 comprensione + 2 applicazione, 4 opzioni, risposta corretta in posizioni variate,
campo "slide" con la slide che giustifica la domanda, rispondibile dal solo ascolto.
NON scrivere domande d'esame finale: non è compito tuo.

## 5. Output

UN solo file: `produzione/<corso>/_bozze/<mNN>.json` nel formato indicato nel pacchetto.
Non toccare copioni.json, non toccare altri file, non creare file extra. Se qualcosa
nel pacchetto è contraddittorio o impossibile, scrivi il problema in un campo "note"
nel JSON invece di improvvisare.
