// Confronto di segreti a tempo costante.
//
// PERCHE' NON BASTA `===`. Il confronto fra stringhe di JavaScript si ferma al primo carattere
// diverso: un token che ne indovina i primi tre impiega, misurabilmente, piu' tempo di uno che
// sbaglia il primo. Su una rete rumorosa la differenza e' minuscola, ma con abbastanza
// tentativi si media il rumore e si ricostruisce il segreto un carattere alla volta.
//
// Non e' un attacco pratico contro un token da 64 caratteri esadecimali. E' pero' la prima
// cosa che un revisore cerca, ed e' gratis farla bene.
//
// `timingSafeEqual` pretende buffer della stessa lunghezza, altrimenti lancia: si passa dagli
// hash SHA-256, che hanno sempre 32 byte. Cosi' nemmeno la LUNGHEZZA del segreto trapela.

import { createHash, timingSafeEqual } from "node:crypto";

function impronta(s: string): Buffer {
  return createHash("sha256").update(s, "utf8").digest();
}

/**
 * `atteso` combacia con `ricevuto`? Falso se l'atteso non e' configurato: un segreto mancante
 * non deve mai risultare valido — fallire chiuso e' l'unico modo sicuro di fallire.
 */
export function segretoValido(atteso: string | undefined | null, ricevuto: string | null | undefined): boolean {
  if (!atteso || !ricevuto) return false;
  return timingSafeEqual(impronta(atteso), impronta(ricevuto));
}

/** Come sopra, ma per l'intestazione `Authorization: Bearer <token>` dei cron di Vercel. */
export function bearerValido(atteso: string | undefined | null, intestazione: string | null | undefined): boolean {
  if (!intestazione?.startsWith("Bearer ")) return false;
  return segretoValido(atteso, intestazione.slice(7));
}
