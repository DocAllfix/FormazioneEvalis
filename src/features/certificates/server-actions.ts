"use server";

// Server Actions staff certificati. Wrapper sottili sul lifecycle (che applica già
// requirePlatformAdmin). La UI legge stato e chiama queste azioni; nessuna logica qui.

import { preparaCaricamento, confermaCaricamento, revokeCertificate } from "@/features/certificates/lifecycle";

/** Link firmato per caricare il PDF del certificato accreditato. Solo staff piattaforma. */
export async function preparaCaricamentoAction(certificateId: string) {
  return preparaCaricamento(certificateId);
}

/** Controlla il file caricato ed emette il certificato accreditato (mail all'utente). Solo staff. */
export async function confermaCaricamentoAction(certificateId: string, path: string, sostituisci: boolean) {
  return confermaCaricamento(certificateId, path, sostituisci);
}

/** Revoca il certificato con motivazione. Solo staff piattaforma. */
export async function revokeCertificateAction(certificateId: string, reason: string) {
  return revokeCertificate(certificateId, reason);
}
