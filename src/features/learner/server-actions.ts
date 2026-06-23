"use server";

// Server Actions invocabili dai Client Components della piattaforma discente.
// Wrapper sottili su funzioni gate-ate (sessione + ownership applicate dentro).

import { getCertificateDownloadUrl } from "@/features/certificates/lifecycle";
import { getMyClipUrl } from "@/features/learner/actions";

/** URL firmato (TTL breve) del PDF certificato: solo proprietario o staff. */
export async function downloadMyCertificate(certificateId: string): Promise<string> {
  return getCertificateDownloadUrl(certificateId);
}

/** URL HLS firmato (TTL breve) della clip avatar di una slide del MIO corso. */
export async function getMyClipUrlAction(
  enrollmentId: string,
  slideId: string,
): Promise<string> {
  return getMyClipUrl(enrollmentId, slideId);
}
