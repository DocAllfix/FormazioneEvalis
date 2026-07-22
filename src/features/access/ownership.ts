// Autorizzazione multi-tenant (prima barriera anti-IDOR): verifica che l'utente sia
// proprietario della risorsa riferita per ID. Logica DB testabile (userId esplicito):
// gli entry-point guardati passano qui lo userId della sessione.
// La proprietà è sempre ancorata all'enrollment (enrollment.userId).

import { eq } from "drizzle-orm";
import { enrollment, quizAttempt, quiz } from "@/lib/db/schema";
import { withTenant } from "@/lib/db/tenant";

export class AccessDeniedError extends Error {
  constructor(message = "Accesso negato: risorsa non di proprietà dell'utente.") {
    super(message);
    this.name = "AccessDeniedError";
  }
}

/** Carica l'enrollment SOLO se appartiene a `userId`, altrimenti lancia. */
export async function loadOwnedEnrollment(enrollmentId: string, userId: string) {
  const [enr] = await withTenant({ userId }, async (tx) =>
    tx
      .select({
        id: enrollment.id,
        userId: enrollment.userId,
        organizationId: enrollment.organizationId,
        courseId: enrollment.courseId,
      })
      .from(enrollment)
      .where(eq(enrollment.id, enrollmentId))
      .limit(1),
  );
  if (!enr) throw new AccessDeniedError("Enrollment inesistente.");
  if (enr.userId !== userId) throw new AccessDeniedError();
  return enr;
}

export async function assertEnrollmentOwnedBy(enrollmentId: string, userId: string): Promise<void> {
  await loadOwnedEnrollment(enrollmentId, userId);
}

/** M-9 (audit go-live): il quiz DEVE appartenere al corso dell'iscrizione (oltre che
 * l'iscrizione all'utente). Senza, un discente potrebbe far estrarre le domande della banca
 * di un ALTRO corso passando un quizId arbitrario (info disclosure cross-corso). */
export async function assertQuizInCourseOf(
  quizId: string,
  enrollmentId: string,
  userId: string,
): Promise<void> {
  const enr = await loadOwnedEnrollment(enrollmentId, userId);
  const [qz] = await withTenant({ userId }, async (tx) =>
    tx.select({ courseId: quiz.courseId }).from(quiz).where(eq(quiz.id, quizId)).limit(1),
  );
  if (!qz) throw new AccessDeniedError("Quiz inesistente.");
  if (qz.courseId !== enr.courseId) {
    throw new AccessDeniedError("Quiz non appartenente al corso dell'iscrizione.");
  }
}

/** Verifica che il tentativo quiz appartenga a un enrollment di `userId`. */
export async function assertAttemptOwnedBy(attemptId: string, userId: string): Promise<void> {
  const [row] = await withTenant({ userId }, async (tx) =>
    tx
      .select({ ownerId: enrollment.userId })
      .from(quizAttempt)
      .innerJoin(enrollment, eq(enrollment.id, quizAttempt.enrollmentId))
      .where(eq(quizAttempt.id, attemptId))
      .limit(1),
  );
  if (!row) throw new AccessDeniedError("Tentativo inesistente.");
  if (row.ownerId !== userId) throw new AccessDeniedError();
}
