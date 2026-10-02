// Testi del certificato PROVVISORIO, gli stessi ovunque compaia: PDF, fine corso, pagina
// Certificati, mail. Modulo senza dipendenze: lo importano anche i componenti client.

export const GIORNI_ACCREDITATO = 5;

export const RIGA_PROVVISORIO_1 = "Documento provvisorio: non sostituisce il certificato accreditato.";
export const RIGA_PROVVISORIO_2 = `Il certificato accreditato sarà rilasciato entro ${GIORNI_ACCREDITATO} giorni lavorativi, inviato via email e disponibile nella tua area privata.`;

/** Frase per le pagine e le mail rivolte a chi ha completato il corso. */
export const NOTA_PROVVISORIO =
  `Questo è il tuo certificato provvisorio. Entro ${GIORNI_ACCREDITATO} giorni lavorativi riceverai il ` +
  "certificato accreditato via email e lo troverai nella tua area privata, pronto da scaricare, al posto di questo.";
