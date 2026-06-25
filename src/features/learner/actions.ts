// Entry-point discente: le superfici che il frontend chiama per il flusso di fruizione.
// Ogni azione applica la PRIMA BARRIERA: sessione → ownership → logica esistente.
// Le funzioni-contratto grezze (getCourseForPlayer, startQuiz, …) non si espongono mai
// direttamente al client: passano sempre da qui.

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { slide, lesson, module as courseModule } from "@/lib/db/schema";
import { requireSession } from "@/features/auth/guards";
import {
  assertEnrollmentOwnedBy,
  assertAttemptOwnedBy,
  loadOwnedEnrollment,
  AccessDeniedError,
} from "@/features/access/ownership";
import { getCourseForPlayer } from "@/features/courses/get-course-for-player";
import { getSignedClipUrl } from "@/lib/cloudflare/stream";
import { startQuiz, submitQuiz } from "@/features/quiz/engine";
import { ensureCertificateRecord } from "@/features/certificates/lifecycle";

export async function getMyCourse(enrollmentId: string) {
  const { user } = await requireSession();
  await assertEnrollmentOwnedBy(enrollmentId, user.id);
  return getCourseForPlayer(enrollmentId, { userId: user.id });
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

/** URL firmato (a vita breve) della clip avatar di una slide del MIO corso. */
export async function getMyClipUrl(enrollmentId: string, slideId: string): Promise<string> {
  const { user } = await requireSession();
  const enr = await loadOwnedEnrollment(enrollmentId, user.id);
  const [row] = await db
    .select({ clipUid: slide.avatarClipUid, courseId: courseModule.courseId })
    .from(slide)
    .innerJoin(lesson, eq(lesson.id, slide.lessonId))
    .innerJoin(courseModule, eq(courseModule.id, lesson.moduleId))
    .where(eq(slide.id, slideId))
    .limit(1);
  if (!row || row.courseId !== enr.courseId) {
    throw new AccessDeniedError("Slide non appartenente al corso dell'iscrizione.");
  }
  return getSignedClipUrl(row.clipUid);
}
