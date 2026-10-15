"use server";

// Server Actions staff certificati. Wrapper sottili sul lifecycle (che applica già
// requirePlatformAdmin). La UI legge stato e chiama queste azioni; nessuna logica qui.

import { preparaCaricamento, confermaCaricamento, revokeCertificate, emettiAttestatoEvalis } from "@/features/certificates/lifecycle";
import { conEsito } from "@/lib/esito";

/** Link firmato per caricare il PDF del certificato accreditato. Solo staff piattaforma. */
export async function preparaCaricamentoAction(certificateId: string) {
  return preparaCaricamento(certificateId);
}

/** Controlla il file caricato ed emette il certificato accreditato (mail all'utente). Solo staff. */
export async function confermaCaricamentoAction(certificateId: string, path: string, sostituisci: boolean, numeroAccreditato?: string) {
  // conEsito: un numero non valido o già usato deve arrivare allo staff come messaggio leggibile
  return conEsito(() => confermaCaricamento(certificateId, path, sostituisci, numeroAccreditato));
}

/** Corsi solo EVALIS: genera ed emette l'attestato definitivo dopo la verifica. Solo staff. */
export async function emettiAttestatoEvalisAction(certificateId: string) {
  // conEsito: «già emesso» e simili devono arrivare allo staff come messaggio leggibile
  return conEsito(() => emettiAttestatoEvalis(certificateId));
}

/** Revoca il certificato con motivazione. Solo staff piattaforma. */
export async function revokeCertificateAction(certificateId: string, reason: string) {
  return revokeCertificate(certificateId, reason);
}
