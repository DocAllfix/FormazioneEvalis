# Organismo di Vigilanza ex D.Lgs. 231/2001 — FAD-231-04 (8h)

> Skeleton di produzione. Fonte: contenuto didattico ORIGINALE del committente in
> `_html/FAD-231-04_Formazione_231_Organismo_di_Vigilanza.html` (un file: 4 moduli da 2 ore, 26 schermate, 20 step di controllo con spiegazione, 4 test di fine modulo da 10 domande, esame di 15 domande). Estratto con `scripts/produzione/_estrai-fonte-231.mjs` in
> `_fonte/mNN.txt` (circa 6.100 parole, step di controllo con la spiegazione compresi) e
> `_fonte/quiz.json`. Mai copia verbatim: distillato in copioni parlati (stile marcello-v2, lista bianca dura).
> Riferimento normativo: **D.Lgs. 8 giugno 2001, n. 231** e **D.Lgs. 10 marzo 2023, n. 24** nel testo VIGENTE al
> 10/11/2026 (Normattiva), riportati in coda a ogni `_fonte/mNN.txt` con gli articoli del modulo, e per la
> sicurezza gli **artt. 16 e 30 del D.Lgs. 81/2008**. Le regole, gli esempi e il caso Metalfer Sud S.r.l. del
> committente sono la fonte di verità; per articoli, quote, termini e sentenze vale il testo di legge vigente.
> Mai inventare articoli, sentenze, importi o termini: il controllo dei riferimenti dei copioni contro il testo
> di legge è un passo obbligatorio prima del LOCK. Le note di produzione di ogni modulo sono in
> `_fonte-note.json` (nota comune, aggiornamenti del catalogo, articoli di legge per modulo).
> ⚠️ AGGIORNAMENTO NORMATIVO: il materiale (m04) indica la verifica del catalogo «artt. 24-25-duodevicies»;
> nel testo vigente il catalogo arriva all'art. 25-vicies (nota in m04). Il materiale scrive «soglia 75%» ma
> calcola 8/10 e 12/15: checkpoint 80% (standard), esame 75% su 15 domande = 12 giuste, come il committente.
> Budget: 480 minuti legali · target contenuti 488 min (margine +1,7%).
> Slide ≈ 4,5 min di narrazione ciascuna (2,35 parole/s, marcello-v2). ID slide: `fad23104_mNN_sNNN`.
> Palette slide: **navy (blu petrolio)** — alternanza con l'ambra di fad23103.
> Destinatari: componenti e Presidenti di Organismi di Vigilanza, sindaci con funzioni di OdV, professionisti candidati all'incarico, internal auditor e compliance officer di supporto all'OdV · Livello: avanzato.
> Prezzo: 200 € (barrato e prezzo aziende da confermare). Attestato: da confermare (proposta: solo EVALIS).

## Moduli (un modulo del committente = un modulo = una lezione della piattaforma)

| Mod | Titolo | Copre (fonte HTML) | Durata | Slide |
|---|---|---|---|---|
| M1 | Mandato, requisiti e posizione dell’OdV nel sistema di governo | Presentazione del corso (introduzione del committente); Il mandato legale: che cosa l’OdV deve fare e che cosa non può fare; Requisiti: come verificarli in concreto; Configurazioni e incompatibilità; La posizione dell’OdV nel sistema dei controlli; Nomina, insediamento e primo trimestre; Sintesi del Modulo 1 | 122 min | 27 |
| M2 | Regolamento, piano di vigilanza, flussi informativi e verifiche | Il regolamento interno dell’OdV; Il piano di vigilanza risk-based; Flussi informativi: progettare, raccogliere, analizzare; Le verifiche: metodo e tecniche; Verifiche speciali: formazione, disciplina, whistleblowing, terzi; Esercitazione: pianificare e condurre; Sintesi del Modulo 2 | 122 min | 27 |
| M3 | Segnalazioni, violazioni, rapporti con il vertice e reporting | Segnalazioni all’OdV e whistleblowing: due regimi, un sistema; L’istruttoria interna: metodo; Violazioni degli apicali e pressioni del vertice; Responsabilità del componente OdV; La relazione periodica al vertice; Esercitazione: tre casi di istruttoria; Sintesi del Modulo 3 | 122 min | 27 |
| M4 | Aggiornamento del Modello, OdV nella crisi e nel procedimento, casi e riepilogo | Curare l’aggiornamento: il processo; L’OdV di fronte a ispezioni e infortuni; L’OdV nel procedimento 231; Casi giurisprudenziali sull’OdV: lezioni operative; Esercitazione finale: l’anno dell’OdV; Riepilogo del corso e preparazione all’esame | 122 min | 27 |

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
- **Fonte**: `produzione/fad23104/_fonte/mNN.txt`. I copioni ESPANDONO fino al budget con spiegazioni,
  esempi d'azienda e buone pratiche dichiarate come tali, senza mai copiare la fonte né nominarla.

## Argomenti per modulo (slide per slide)

### M1 — Mandato, requisiti e posizione dell’OdV nel sistema di governo (27 slide)
- Benvenuto e apertura del corso. Presentazione del corso (introduzione del committente): Organismo di Vigilanza ex D.Lgs. 231/2001: ruolo, metodo e responsabilità del componente e del Presidente. — 3 slide
- Il mandato legale: che cosa l’OdV deve fare e che cosa non può fare: Art. 6 c. 1 lett. b); Le quattro aree di attività; Confini. — 5 slide
- Requisiti: come verificarli in concreto. — 4 slide
- Configurazioni e incompatibilità: Opzioni e quando preferirle; Incompatibilità e cause di decadenza (statuto OdV). — 4 slide
- La posizione dell’OdV nel sistema dei controlli: Mappa delle relazioni. — 4 slide
- Nomina, insediamento e primo trimestre: Check-list di accettazione dell’incarico; Insediamento: i primi 90 giorni. — 5 slide
- Sintesi del Modulo 1: Da ricordare; Riferimenti. Verso il checkpoint. — 2 slide

### M2 — Regolamento, piano di vigilanza, flussi informativi e verifiche (27 slide)
- Bentornato e mappa dell'unità. Il regolamento interno dell’OdV: Contenuti minimi; Il verbale: il documento che vi difende. — 5 slide
- Il piano di vigilanza risk-based: Costruzione; Piano OdV Metalfer Sud – anno 1. — 4 slide
- Flussi informativi: progettare, raccogliere, analizzare: Progettazione (scheda flusso per area); Flussi dal vertice; Analisi: dal dato al segnale. — 4 slide
- Le verifiche: metodo e tecniche: Preparazione; Esecuzione; Test di efficacia; A sorpresa; Rilievi e rapporto. — 4 slide
- Verifiche speciali: formazione, disciplina, whistleblowing, terzi: Formazione e diffusione; Sistema disciplinare; Whistleblowing; Terzi e clausole; Procure, deleghe, organigramma; Catalogo reati e aggiornamento. — 4 slide
- Esercitazione: pianificare e condurre: Scenario; Decisioni attese; Cosa verbalizzare. — 4 slide
- Sintesi del Modulo 2: Da ricordare; Riferimenti. Verso il checkpoint. — 2 slide

### M3 — Segnalazioni, violazioni, rapporti con il vertice e reporting (27 slide)
- Bentornato e mappa dell'unità. Segnalazioni all’OdV e whistleblowing: due regimi, un sistema: Che cosa arriva all’OdV; Il raccordo gestore-OdV (ANAC 311/2023); Regole di riservatezza per l’OdV. — 4 slide
- L’istruttoria interna: metodo: Fasi; Limiti da rispettare. — 5 slide
- Violazioni degli apicali e pressioni del vertice: Escalation; Quando il vertice fa pressione. — 4 slide
- Responsabilità del componente OdV: Verso l’ente (contrattuale); Penale; Che cosa rende l’OdV vulnerabile; Assicurazione. — 5 slide
- La relazione periodica al vertice: Struttura (semestrale sintetica / annuale completa); Presentarla in CdA. — 4 slide
- Esercitazione: tre casi di istruttoria. — 3 slide
- Sintesi del Modulo 3: Da ricordare; Riferimenti. Verso il checkpoint. — 2 slide

### M4 — Aggiornamento del Modello, OdV nella crisi e nel procedimento, casi e riepilogo (27 slide)
- Bentornato e mappa dell'unità. Curare l’aggiornamento: il processo: Monitoraggio normativo; Trigger organizzativi; Dalla proposta all’adozione. — 4 slide
- L’OdV di fronte a ispezioni e infortuni: Ispezioni e accessi; Infortunio grave / incidente ambientale; Che cosa non fare. — 6 slide
- L’OdV nel procedimento 231: Ruolo; Che cosa il giudice valuta dell’OdV; Il "fascicolo 231" (già pronto, non costruito dopo). — 4 slide
- Casi giurisprudenziali sull’OdV: lezioni operative. — 5 slide
- Esercitazione finale: l’anno dell’OdV. — 5 slide
- Riepilogo del corso e preparazione all’esame: I quattro moduli; L’esame finale; Riferimenti essenziali. Chiusura del corso e preparazione all'esame finale. — 3 slide
