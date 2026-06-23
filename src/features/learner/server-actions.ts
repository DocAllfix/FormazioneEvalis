"use server";

// Server Actions invocabili dai Client Components della piattaforma discente.
// Wrapper sottili su funzioni gate-ate (sessione + ownership applicate dentro).

import { getCertificateDownloadUrl } from "@/features/certificates/lifecycle";
import {
  getMyClipUrl,
  startMyQuiz,
  submitMyQuiz,
  requestMyCertificate,
} from "@/features/learner/actions";

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

/** Avvia un quiz: estrae le domande (senza risposte) + limite di tempo. */
export async function startMyQuizAction(enrollmentId: string, quizId: string) {
  return startMyQuiz(enrollmentId, quizId);
}

/** Invia le risposte: correzione/soglia/tempo lato server. */
export async function submitMyQuizAction(
  attemptId: string,
  answers: { questionId: string; optionId: string }[],
) {
  return submitMyQuiz(attemptId, answers);
}

/** A esame finale superato: predispone il certificato (ready_for_review) se a norma. */
export async function requestMyCertificateAction(enrollmentId: string) {
  return requestMyCertificate(enrollmentId);
}
