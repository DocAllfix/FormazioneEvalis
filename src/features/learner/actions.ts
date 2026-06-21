// Entry-point discente: le superfici che Base44 chiama per il flusso di fruizione.
// Ogni azione applica la PRIMA BARRIERA: sessione → ownership → logica esistente.
// Le funzioni-contratto grezze (getCourseForPlayer, startQuiz, …) non si espongono mai
// direttamente al client: passano sempre da qui.

import { requireSession } from "@/features/auth/guards";
import { assertEnrollmentOwnedBy, assertAttemptOwnedBy } from "@/features/access/ownership";
import { getCourseForPlayer } from "@/features/courses/get-course-for-player";
import { startQuiz, submitQuiz } from "@/features/quiz/engine";
import { ensureCertificateRecord } from "@/features/certificates/lifecycle";

export async function getMyCourse(enrollmentId: string) {
  const { user } = await requireSession();
  await assertEnrollmentOwnedBy(enrollmentId, user.id);
  return getCourseForPlayer(enrollmentId);
}

export async function startMyQuiz(enrollmentId: string, quizId: string) {
  const { user } = await requireSession();
  await assertEnrollmentOwnedBy(enrollmentId, user.id);
  return startQuiz(enrollmentId, quizId);
}

export async function submitMyQuiz(
  attemptId: string,
  answers: { questionId: string; optionId: string }[],
) {
  const { user } = await requireSession();
  await assertAttemptOwnedBy(attemptId, user.id);
  return submitQuiz(attemptId, answers);
}

export async function requestMyCertificate(enrollmentId: string) {
  const { user } = await requireSession();
  await assertEnrollmentOwnedBy(enrollmentId, user.id);
  return ensureCertificateRecord(enrollmentId);
}
