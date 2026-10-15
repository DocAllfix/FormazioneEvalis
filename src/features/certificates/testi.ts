// Testi del certificato PROVVISORIO, gli stessi ovunque compaia: PDF, fine corso, pagina
// Certificati, mail. Modulo senza dipendenze: lo importano anche i componenti client.

export const GIORNI_ACCREDITATO = 5;

export const RIGA_PROVVISORIO_1 = "Documento provvisorio: non sostituisce il certificato accreditato.";
export const RIGA_PROVVISORIO_2 = `Il certificato accreditato sarà rilasciato entro ${GIORNI_ACCREDITATO} giorni lavorativi, inviato via email e disponibile nella tua area privata.`;

/** Frase per le pagine e le mail rivolte a chi ha completato il corso. */
export const NOTA_PROVVISORIO =
  `Questo è il tuo certificato provvisorio. Entro ${GIORNI_ACCREDITATO} giorni lavorativi riceverai il ` +
  "certificato accreditato via email e lo troverai nella tua area privata, pronto da scaricare, al posto di questo.";

// Corsi con attestato SOLO EVALIS (course.attestatoSoloEvalis): nessun accreditamento esterno. Il
// definitivo è l'attestato di formazione EVALIS Academy, emesso dopo la verifica dello staff.
export const RIGA_PROVVISORIO_EVALIS_1 = "Documento provvisorio: non sostituisce l'attestato definitivo.";
export const RIGA_PROVVISORIO_EVALIS_2 = `L'attestato definitivo EVALIS Academy arriverà dopo la verifica dello staff, entro ${GIORNI_ACCREDITATO} giorni lavorativi, via email.`;
export const NOTA_PROVVISORIO_EVALIS =
  `Questo è il tuo attestato provvisorio. Dopo la verifica dello staff, entro ${GIORNI_ACCREDITATO} giorni lavorativi, ` +
  "riceverai via email l'attestato definitivo EVALIS Academy e lo troverai nella tua area privata, pronto da scaricare, al posto di questo.";

/** La nota del provvisorio giusta per il corso. */
export const notaProvvisorio = (soloEvalis: boolean) => (soloEvalis ? NOTA_PROVVISORIO_EVALIS : NOTA_PROVVISORIO);
