// Formattazioni di PRESENTAZIONE condivise. Funzioni pure, nessun import: utilizzabili sia dai
// componenti server sia da quelli client.
//
// Ognuna nasce da una duplicazione reale trovata nel codice: le copie erano identiche e sono
// state spostate qui INVARIATE, per non cambiare di una virgola ciò che l'utente vede.

/**
 * Data breve italiana, con trattino lungo quando manca. Era duplicata identica in
 * `(app)/certificati/page.tsx` (`formatDate`) e `verify/[uuid]/page.tsx` (`fmtDate`).
 *
 * NB: `staff/certificati/page.tsx` NON usa questa funzione: là il formato ha opzioni proprie
 * (giorno/mese/anno estesi) ed è volutamente diverso.
 */
export function dataBreve(d: Date | null): string {
  return d ? new Date(d).toLocaleDateString("it-IT") : "—";
}

/**
 * Secondi → "mm:ss" con zero iniziale. Era duplicata identica in `player/quiz-step.tsx` e
 * `player/slide-step.tsx` (entrambe chiamate `fmt`).
 *
 * È SOLO l'etichetta mostrata a schermo: il conteggio del tempo e i controlli antifrode
 * (tempo minimo, heartbeat) stanno altrove e non passano di qui.
 */
export function mmss(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
