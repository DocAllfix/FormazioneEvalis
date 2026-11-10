# D.Lgs. 231/2001 per le figure apicali — FAD-231-03 (8h)

> Skeleton di produzione. Fonte: contenuto didattico ORIGINALE del committente in
> `_html/FAD-231-03_Formazione_231_Figure_Apicali.html` (un file: 4 moduli da 2 ore, 28 schermate, 20 step di controllo con spiegazione, 4 test di fine modulo da 10 domande, esame di 15 domande). Estratto con `scripts/produzione/_estrai-fonte-231.mjs` in
> `_fonte/mNN.txt` (circa 6.350 parole, step di controllo con la spiegazione compresi) e
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
> Slide ≈ 4,5 min di narrazione ciascuna (2,35 parole/s, marcello-v2). ID slide: `fad23103_mNN_sNNN`.
> Palette slide: **ambra** — alternanza con il navy di fad23102.
> Destinatari: amministratori, direttori generali, dirigenti, responsabili di funzione e di unità operative, procuratori e soggetti con deleghe · Livello: avanzato.
> Prezzo: 200 € (barrato e prezzo aziende da confermare). Attestato: da confermare (proposta: solo EVALIS).

## Moduli (un modulo del committente = un modulo = una lezione della piattaforma)

| Mod | Titolo | Copre (fonte HTML) | Durata | Slide |
|---|---|---|---|---|
| M1 | Responsabilità dell’ente e responsabilità personale di chi decide | Presentazione del corso (introduzione del committente); Perché il vertice è il primo destinatario della 231; Le conseguenze per l’ente e per chi dirige; Dove nascono i reati di vertice; Thyssenkrupp e Impregilo: due lezioni per il vertice; Il perimetro soggettivo: gruppi, procuratori, amministratori di fatto; Esimente e condotte riparatorie: le leve nelle mani del vertice; Sintesi del Modulo 1 | 122 min | 27 |
| M2 | Assetti, deleghe e procure: organizzare il potere perché sia difendibile | Organigramma, funzionigramma e poteri; La delega di funzioni in materia di sicurezza; I controlli che vincolano il vertice; Governare i terzi: fornitori, subappaltatori, partner; Decisioni finanziarie e fiscali: la provvista e il riciclaggio; Esercitazione: decisioni del CdA; Sintesi del Modulo 2 | 122 min | 27 |
| M3 | Il vertice nel sistema 231: OdV, flussi, whistleblowing, disciplina, formazione e cultura | Organo amministrativo e OdV: chi fa cosa; Scegliere l’OdV: criteri per il vertice; Flussi informativi e aggiornamento: la responsabilità del vertice; Whistleblowing: il vertice come garante, non come gestore; Sistema disciplinare: applicarlo anche verso l’alto; Tone at the top: formazione, comunicazione, esempio; Sintesi del Modulo 3 | 122 min | 27 |
| M4 | Decidere sotto pressione: ispezioni, infortuni, procedimenti, crisi e difesa dell’ente | Ispezioni e accessi: la condotta del vertice; Le prime 72 ore: infortunio grave, incidente ambientale, notizia di reato; La strategia difensiva dell’ente; Comunicazione e stakeholder in crisi; Errori ricorrenti del vertice; Esercitazione finale: il CdA in sei situazioni; Riepilogo del corso e preparazione all’esame | 122 min | 27 |

**Totale: 488 min (8h 8m) · 108 slide.**

## Verifiche

- **Checkpoint**: uno per modulo (bloccante, banca ≥10, estrazione 5, soglia 80%). Banca = domande
  dell'orchestratore + step di controllo e test di fine modulo del committente SOSTENUTI dal parlato
  (`_banche-committente.py`, campo `checkpoint` di `_fonte/quiz.json`).
- **Esame finale**: banca dalle 15 domande d'esame del committente più 15 domande nuove, **estrazione 15, soglia 75%** (12 su 15, come il committente).
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
- **Fonte**: `produzione/fad23103/_fonte/mNN.txt`. I copioni ESPANDONO fino al budget con spiegazioni,
  esempi d'azienda e buone pratiche dichiarate come tali, senza mai copiare la fonte né nominarla.

## Argomenti per modulo (slide per slide)

### M1 — Responsabilità dell’ente e responsabilità personale di chi decide (27 slide)
- Benvenuto e apertura del corso. Presentazione del corso (introduzione del committente): D.Lgs. 231/2001 per le figure apicali: responsabilità, decisioni e governo del Modello organizzativo. — 3 slide
- Perché il vertice è il primo destinatario della 231: La logica del decreto; Che cosa cambia rispetto a un sottoposto. — 4 slide
- Le conseguenze per l’ente e per chi dirige: Per l’ente; Per l’amministratore e il dirigente. — 4 slide
- Dove nascono i reati di vertice: Decisioni tipiche del vertice e reati collegati. — 2 slide
- Thyssenkrupp e Impregilo: due lezioni per il vertice: Thyssenkrupp (Cass. SU 38343/2014); Impregilo (Cass. 23401/2022). — 4 slide
- Il perimetro soggettivo: gruppi, procuratori, amministratori di fatto: Chi è "apicale" anche senza saperlo; Interesse esclusivo e interesse misto; Rappresentanza nel procedimento. — 4 slide
- Esimente e condotte riparatorie: le leve nelle mani del vertice: Prima del fatto: costruire l’esimente; Dopo il fatto: ridurre il danno. — 4 slide
- Sintesi del Modulo 1: Da ricordare; Riferimenti. Verso il checkpoint. — 2 slide

### M2 — Assetti, deleghe e procure: organizzare il potere perché sia difendibile (27 slide)
- Bentornato e mappa dell'unità. Organigramma, funzionigramma e poteri: Tre documenti che devono coincidere; Principi 231 per i poteri. — 4 slide
- La delega di funzioni in materia di sicurezza: Art. 16 D.Lgs. 81/2008 – requisiti di validità; Errori frequenti del vertice; Che cosa fa un vertice responsabile. — 5 slide
- I controlli che vincolano il vertice: Perché accettarli; Controlli tipici sulle decisioni apicali; Esempio: protocollo consulenti e intermediari. — 5 slide
- Governare i terzi: fornitori, subappaltatori, partner: Il principio; Strumenti; Partnership, consorzi, operazioni all’estero. — 4 slide
- Decisioni finanziarie e fiscali: la provvista e il riciclaggio: Perché il vertice è esposto; Regole di tesoreria che il CdA deve deliberare; Fisco e autoriciclaggio; Presidi di vertice. — 4 slide
- Esercitazione: decisioni del CdA. — 3 slide
- Sintesi del Modulo 2: Da ricordare; Riferimenti. Verso il checkpoint. — 2 slide

### M3 — Il vertice nel sistema 231: OdV, flussi, whistleblowing, disciplina, formazione e cultura (27 slide)
- Bentornato e mappa dell'unità. Organo amministrativo e OdV: chi fa cosa: Compiti dell’organo amministrativo; Compiti dell’OdV. — 4 slide
- Scegliere l’OdV: criteri per il vertice: Requisiti da verificare; Composizione proporzionata; Incompatibilità da evitare; Atti della nomina. — 5 slide
- Flussi informativi e aggiornamento: la responsabilità del vertice: Il vertice garantisce i flussi; Flussi che riguardano direttamente il vertice; Aggiornamento del Modello; Indicatori che il vertice dovrebbe chiedere. — 3 slide
- Whistleblowing: il vertice come garante, non come gestore: Obblighi del D.Lgs. 24/2023 che ricadono sul vertice; Che cosa NON deve fare il vertice; Che cosa deve fare. — 5 slide
- Sistema disciplinare: applicarlo anche verso l’alto: Perché il vertice deve volerlo; Misure per livello; Regole di buon governo. — 4 slide
- Tone at the top: formazione, comunicazione, esempio: Che cosa osservano i dipendenti; Azioni concrete. — 4 slide
- Sintesi del Modulo 3: Da ricordare; Riferimenti. Verso il checkpoint. — 2 slide

### M4 — Decidere sotto pressione: ispezioni, infortuni, procedimenti, crisi e difesa dell’ente (27 slide)
- Bentornato e mappa dell'unità. Ispezioni e accessi: la condotta del vertice: Prima; Durante; Dopo. — 5 slide
- Le prime 72 ore: infortunio grave, incidente ambientale, notizia di reato: Protocollo di crisi (da inserire nel Modello); Decisioni del vertice nelle prime ore; Errori che aggravano. — 4 slide
- La strategia difensiva dell’ente: Elementi; Che cosa il giudice cercherà. — 5 slide
- Comunicazione e stakeholder in crisi: Obblighi e opportunità; Self-cleaning negli appalti. — 4 slide
- Errori ricorrenti del vertice: Nella progettazione; Nell’attuazione; Nella vigilanza; Nella crisi. — 2 slide
- Esercitazione finale: il CdA in sei situazioni. — 4 slide
- Riepilogo del corso e preparazione all’esame: I quattro moduli; L’esame finale; Riferimenti essenziali. Chiusura del corso e preparazione all'esame finale. — 3 slide
