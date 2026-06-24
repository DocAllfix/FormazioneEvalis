"use server";

// Server Actions staff certificati. Wrapper sottili sul lifecycle (che applica già
// requirePlatformStaff). La UI legge stato e chiama queste azioni; nessuna logica qui.

import { approveCertificate, revokeCertificate } from "@/features/certificates/lifecycle";

/** Approva ed emette il certificato (PDF+QR+email). Solo staff piattaforma. */
export async function approveCertificateAction(certificateId: string) {
  return approveCertificate(certificateId);
}

/** Revoca il certificato con motivazione. Solo staff piattaforma. */
export async function revokeCertificateAction(certificateId: string, reason: string) {
  return revokeCertificate(certificateId, reason);
}
