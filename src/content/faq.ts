// FAQ statiche della piattaforma — sorgente del knowledge base del chatbot (globale).
// Aggiornarle qui e rilanciare il reindex (console staff) per rifletterle nel bot.

export type Faq = { title: string; body: string };

export const FAQ: Faq[] = [
  {
    title: "Come accedo ai miei corsi",
    body: "Dopo il login trovi i tuoi percorsi in 'I miei percorsi' nella dashboard. Clicca un corso per aprire il player e iniziare la fruizione. I corsi acquistati o assegnati dalla tua azienda compaiono automaticamente.",
  },
  {
    title: "Tempo minimo di fruizione e tracciamento",
    body: "La piattaforma traccia il tempo effettivo di visione di ogni lezione lato server. Per completare una lezione devi guardarla fino in fondo: saltare avanti, mettere in pausa a lungo o cambiare scheda non fa accumulare tempo. È un requisito di conformità (Accordo Stato-Regioni): il tempo non è falsificabile.",
  },
  {
    title: "Come funziona l'esame finale (quiz)",
    body: "L'esame estrae domande casuali dalla banca dati. C'è una soglia minima di superamento e, in caso di errore, un periodo di attesa (cooldown) prima di riprovare. L'esame è bloccante: va superato per ottenere il certificato.",
  },
  {
    title: "Come ottengo il certificato",
    body: "Il certificato viene predisposto automaticamente solo dopo aver completato tutte le lezioni (tempo minimo) e superato l'esame finale. Poi passa in revisione dello staff: l'emissione non è mai automatica. Una volta emesso lo scarichi dalla sezione 'Certificati'.",
  },
  {
    title: "Come verifico l'autenticità di un certificato (QR)",
    body: "Ogni certificato emesso ha un codice QR e un link di verifica pubblico. Inquadrando il QR o aprendo il link si apre una pagina che conferma numero, intestatario, corso e validità del certificato. Serve a dimostrare l'autenticità a terzi.",
  },
  {
    title: "Sessione singola attiva",
    body: "Per sicurezza è consentita una sola sessione attiva per utente: se accedi da un nuovo dispositivo, la sessione precedente viene chiusa. Questo previene la condivisione dell'account.",
  },
  {
    title: "Ho dimenticato la password",
    body: "Dalla pagina di login usa 'Password dimenticata' per ricevere via email un link di reimpostazione. Apri il link e imposta una nuova password.",
  },
  {
    title: "Assistenza e ticket",
    body: "Se hai un problema non risolto, apri un ticket dalla sezione 'Assistenza': lo staff ti risponde direttamente nella conversazione del ticket. Il chatbot può aprirne uno per te se la risposta non è nelle FAQ.",
  },
];
