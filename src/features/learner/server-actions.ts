"use server";

// Server Actions invocabili dai Client Components della piattaforma discente.
// Sono wrapper sottili sulle funzioni gate-ate già esistenti (sessione + ownership
// applicate dentro). Le mutation del player/quiz si aggiungono qui nelle fasi 2-3.

import { getCertificateDownloadUrl } from "@/features/certificates/lifecycle";

/** URL firmato (TTL breve) del PDF certificato: solo proprietario o staff. */
export async function downloadMyCertificate(certificateId: string): Promise<string> {
  return getCertificateDownloadUrl(certificateId);
}
