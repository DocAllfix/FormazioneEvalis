// Chiave di idempotenza per le chiamate a Stripe. Modulo isolato e SENZA dipendenze (niente DB,
// niente client Stripe, niente guard): così è verificabile con un test puro.

/**
 * Compone la chiave passata a `checkout.sessions.create`.
 *
 * A cosa serve: se la rete cade dopo che Stripe ha creato la sessione ma prima che la risposta
 * ci arrivi, un secondo tentativo con la stessa chiave restituisce LA STESSA sessione invece di
 * crearne una gemella. Non protegge dal doppio addebito — quello lo fa la guardia in
 * `checkout.ts`, che rifiuta l'acquisto di un corso già posseduto.
 *
 * ⚠️ Regola da non violare: `parti` deve contenere TUTTO ciò che determina prezzo e contenuto
 * della sessione. Stripe ricorda la chiave per 24 ore e riconsegna la sessione originale: se lo
 * sconto non fosse nella chiave, un'azienda passata da −20% a −30% riceverebbe la vecchia
 * sessione al PREZZO VECCHIO. Cambiando un fattore, cambia la chiave e Stripe ne crea una nuova.
 *
 * La finestra oraria evita che una sessione abbandonata resti "incollata" per sempre.
 */
export function chiaveIdempotenza(parti: (string | number)[], adesso = Date.now()): string {
  const ora = Math.floor(adesso / 3_600_000);
  return ["evalis", ...parti, ora].join(":");
}
