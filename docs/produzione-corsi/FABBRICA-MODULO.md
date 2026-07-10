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
3. **Numeri e sigle** (STANDARD AZURE 2026-07-09): in CIFRE sono ammessi SOLO i numeri
   di norma ("ISO 45001"), gli anni ("nel 2023") e i numeri di clausola col punto
   ("il punto 6.1.2"). Ogni ALTRO numero va scritto in lettere ("tre requisiti",
   "quarantasette siti", "l'ottanta per cento" — mai "80%"). VIETATO il formato
   norma:anno ("ISO 45001:2023"): scrivi "ISO 45001 del 2023". **TRATTINI: mai un
   numero col trattino** ("17021-1", "2018-2023"): la voce legge il trattino. Le sigle
   con trattino passano dal glossario ("ISO/IEC 17021-1" → "ISO IEC diciassettemila
   ventuno parte uno"); gli intervalli si sciolgono ("dal 2018 al 2023"). Il trattino
   corto resta ammesso solo nelle parole composte ("follow-up"). Gate E3 blocca il resto.
   **REGOLA ASSOLUTA (2026-07-10, richiesta utente): la voce non vede MAI un trattino,
   una parentesi o un simbolo.** Il motore TTS (azure_tts.con_glossario) scioglie in
   spazio qualunque trattino residuo tra due lettere e RIFIUTA la sintesi se nel testo
   parlato resta un carattere fuori dalla lista bianca (alfabeto, cifre ammesse,
   punteggiatura di pausa, apostrofo). Preferire comunque, in scrittura, la forma
   senza trattino quando è naturale ("quasi incidente").
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
7. **Verbi-trappola per la prosodia**: mai usare "disciplina" come verbo (es. "il punto
   9.2 disciplina l'audit"): il motore TTS lo interpreta come sostantivo e mette una
   pausa nel punto sbagliato (difetto verificato all'ascolto, 2026-07-09). Con i numeri
   di clausola preferisci sempre verbi inequivocabili: stabilisce, definisce, richiede,
   descrive, prevede. In generale diffida dei verbi che sono anche sostantivi quando
   precedono un anglicismo.
8. **ACCENTI OBBLIGATORI** (gate E9): ogni parola che in italiano è sempre accentata va
   scritta con l'accento — perché, poiché, benché, affinché, così, più, già, può, sarà,
   verrà, potrà, dovrà, cioè, perciò, finché, e TUTTI i nomi in -tà (città, qualità,
   attività, possibilità, realtà, società, verità, libertà, responsabilità, autorità,
   priorità, maturità, complessità, conformità, proprietà, università, identità, entità,
   novità). Scrivere "perche" o "attivita" senza accento è un ERRORE bloccante: la voce
   sintetica leggerebbe la parola sbagliata.
9. **MAI nominare il materiale di lavoro che ricevi** (avviso W6, revisione 27001,
   2026-07-11). Tu ricevi una sezione della norma nel pacchetto, ma lo STUDENTE non
   riceve niente: sta guardando un video. Vietate quindi formule come "la sezione che
   hai ricevuto", "la sezione che stai studiando/usando", "la sezione normativa",
   "il materiale che ti è stato fornito", "il testo assegnato". Per lo studente
   esistono solo "la norma" (eventualmente "in questo punto" o il numero di clausola)
   e "il corso/il modulo". Evita in generale la parola "sezione": per la struttura
   della norma di' "punto" o "parte" (gate E11 blocca le forme inequivocabili,
   W6 segnala le altre). Ogni riferimento al pacchetto, al prompt o allo skeleton
   è un difetto di produzione che verrà corretto in revisione.

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

**ANTI-MEZZO-LAVORO (obbligatorio):** componi PRIMA tutto il contenuto del modulo, poi
scrivilo in UN UNICO Write finale con tutto dentro (tutte le slide + la banca). Non
salvare versioni parziali intermedie: se la sessione si interrompe, è meglio nessun file
che un file a metà. Il file finale deve essere JSON valido e COMPLETO — un file troncato
viene comunque rifiutato dal merge, quindi è lavoro perso. Verifica con python (json.load)
prima di considerare finito.
