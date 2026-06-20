# CLAUDE.md



---

## 1. Pensa prima di scrivere codice

**Non dare per scontato. Non nascondere la confusione. Esponi i compromessi.**

Prima di implementare qualsiasi cosa:
- Dichiara esplicitamente le tue assunzioni. Se non sei sicuro, chiedi.
- Se esistono più interpretazioni possibili, presentale tutte — non sceglierne una in silenzio.
- Se esiste un approccio più semplice, dillo. Fai resistenza quando è giustificato.
- Se qualcosa non è chiaro, fermati. Nomina esattamente cosa ti confonde. Chiedi.

In questo progetto, applica questo principio con particolare rigore su:
- Qualsiasi requisito di tracciamento fruizione (tempo minimo, heartbeat, anti-AFK): se non è specificato il comportamento esatto in un caso limite (es. utente chiude il browser a metà lezione), chiedi prima di assumere un default.
- Qualsiasi logica di accesso multi-tenant: se non è chiaro se un'azione riguarda lo scope del singolo utente o dell'intera organizzazione, chiedi.
- Qualsiasi interazione con pagamenti Stripe: non assumere mai comportamenti su rimborsi, downgrade, proration o gestione IVA senza conferma esplicita.
- Qualsiasi modifica allo schema del database che coinvolge tabelle di audit/log: questi dati hanno valore legale/normativo, quindi qualsiasi assunzione sbagliata è costosa.

## 2. Semplicità prima di tutto

**Il minimo codice che risolve il problema. Niente di speculativo.**

- Nessuna funzionalità oltre a quanto richiesto.
- Nessuna astrazione per codice usato una sola volta.
- Nessuna "flessibilità" o "configurabilità" non richiesta.
- Nessuna gestione errori per scenari impossibili.
- Se scrivi 200 righe e potrebbero essere 50, riscrivi.

Chiediti sempre: "Un ingegnere senior direbbe che questo è overcomplicato?" Se sì, semplifica.

In questo progetto, applica questo principio con attenzione a:
- Non costruire un sistema di plugin o strategy pattern per gestire "tipi di corso" finché non esiste un secondo tipo reale da gestire diversamente dal primo.
- Non astrarre il provider di pagamento, di storage video o di email dietro interfacce generiche finché non c'è un secondo provider reale da supportare. Oggi è Stripe, Cloudflare Stream, Brevo — punto. Niente adapter pattern "per il futuro".
- Il modulo antifrode (heartbeat, blocco seek, AFK) deve restare semplice: stato React + endpoint backend che valida secondi. Non trasformarlo in un motore di regole configurabile se nessuno l'ha chiesto.
- Non creare microservizi separati finché il monolite Next.js + un singolo backend FastAPI/Node non mostra un reale collo di bottiglia. La separazione in `services/lrs` e `services/certificates` va introdotta solo quando concretamente necessaria, non preventivamente.

## 3. Modifiche chirurgiche

**Tocca solo ciò che devi. Pulisci solo il tuo stesso disordine.**

Quando modifichi codice esistente:
- Non "migliorare" codice, commenti o formattazione adiacenti non richiesti.
- Non refactorizzare cose che non sono rotte.
- Rispetta lo stile esistente, anche se tu lo faresti diversamente.
- Se noti codice morto non collegato al task, segnalalo — non cancellarlo.

Quando le tue modifiche creano elementi orfani:
- Rimuovi import/variabili/funzioni che le TUE modifiche hanno reso inutilizzati.
- Non rimuovere codice morto preesistente a meno che non sia stato richiesto.

Test di verifica: ogni riga modificata deve essere riconducibile direttamente alla richiesta dell'utente.

In questo progetto, applica questo principio con particolare attenzione a:
- Il modulo di audit/log append-only non va mai toccato "di striscio" durante altre modifiche. Se una modifica ad altra funzionalità tocca quella tabella, fermati e segnalalo esplicitamente prima di procedere.
- Quando estendi `nextjs/saas-starter` o pattern simili presi da riferimenti open source, non riformattare l'intero file solo perché stai aggiungendo una tabella o un endpoint.
- Quando integri `scorm-again` o `react-player`, non modificare il loro codice sorgente vendorizzato — wrappa, non alterare.

## 4. Esecuzione guidata da obiettivi

**Definisci criteri di successo verificabili. Itera fino alla verifica.**

Trasforma i task in obiettivi verificabili:
- "Aggiungi la validazione" → "Scrivi test per input non validi, poi falli passare"
- "Sistema il bug" → "Scrivi un test che lo riproduce, poi fallo passare"
- "Rifattorizza X" → "Assicurati che i test passino prima e dopo"

Per task multi-step, dichiara un piano breve:
```
1. [Step] → verifica: [controllo]
2. [Step] → verifica: [controllo]
3. [Step] → verifica: [controllo]
```

Criteri di successo forti permettono di iterare in autonomia. Criteri deboli ("falla funzionare") richiedono chiarimenti continui.

In questo progetto, ogni funzionalità critica per la compliance deve avere un criterio di successo esplicito e testabile, per esempio:
- "Implementa il blocco tempo minimo lezione" → criterio: "scrivi un test che tenta di marcare una lezione completata con meno di `min_required_seconds` di visione effettiva e verifica che l'API risponda 403; poi verifica che con il tempo minimo raggiunto risponda 200"
- "Implementa sessione singola attiva" → criterio: "scrivi un test che effettua login da due sessioni con lo stesso utente e verifica che la prima venga invalidata"
- "Implementa generazione certificato" → criterio: "scrivi un test che tenta la generazione senza quiz superato e verifica il rifiuto; poi con tutti i requisiti soddisfatti verifica la generazione del PDF con QR valido"

---

**Queste linee guida funzionano se osservi:** meno modifiche non necessarie nei diff, meno riscritture per overcomplicazione, domande di chiarimento prima dell'implementazione invece che dopo gli errori.

---

# Contesto del progetto

## Cosa stiamo costruendo

Una piattaforma LMS (Learning Management System) commerciale B2B multi-tenant per l'erogazione di corsi di formazione professionale online, specificamente per certificazioni ISO e formazione auditor. I corsi inizialmente  sono prodotti una volta (4-8 ore ciascuno, con avatar AI e slide) e poi erogati in autonomia, senza formatori dal vivo. Per le generazione corsi possiamo comprendere bene come fare e cosa usare ma controlla il progetto che trovi nella cartella "C:\Users\user\EduVault"  che e un mio progetto di generazione corsi, vedi se ci puo servire in qualche modo e se possiamo introdurlo come strumento per gli admin o lo possiamo usare per generare i corsi.
Il focus resta sul progetto lms e scorm, ma la generazione corsi e ovviamente anche da considerare, ma il focus di questo ambiente e costruire l'architettura scalabile che supporti i corsi.
## Stack tecnologico di riferimento

Framework moderni come base, rifeirmenti e sunti architetturali da progetti presi come riferimento

## Vincoli normativi non negoziabili

Questi non sono requisiti di prodotto opzionali — sono vincoli legali/commerciali che rendono la piattaforma vendibile o invendibile a clienti italiani professionali. Qualsiasi implementazione che li indebolisce richiede di fermarsi e chiedere conferma esplicita prima di procedere.

- Tracciabilità completa e append-only di ogni attività utente: accessi, tempo di fruizione per lezione, progressione, tentativi quiz, esito. Riferimento: Accordo Stato-Regioni 2025, D.Lgs. 81/08.
- Tempo minimo di fruizione per lezione, verificato lato server, non aggirabile via manipolazione API o frontend.
- Quiz obbligatori con domande estratte casualmente da banca dati, soglia minima di superamento configurabile, bloccanti per l'avanzamento.
- Sessione singola attiva per utente (anti-condivisione account).
- Data residency UE per database, storage e autenticazione.
- Certificato generato automaticamente solo dopo soddisfacimento di tutti i requisiti, ma inviato dopo revisione umana — mai invio automatico diretto all'utente finale.

## Cosa NON fare mai senza chiedere

- Non rimuovere o indebolire controlli di tracciamento tempo/AFK per "semplificare" il codice — questi sono requisiti di compliance, non feature opzionali, anche se sembrano complessi rispetto al resto.

- Non implementare invio automatico di certificati senza step di revisione manuale, anche se tecnicamente più semplice.
- Non assumere che "utente" sia sempre singolo: il modello dati è sempre `organization → seats → users → enrollments`, mai utente isolato, a meno di esplicita indicazione contraria.