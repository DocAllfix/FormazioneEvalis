// Entry-point discente: le superfici che il frontend chiama per il flusso di fruizione.
// Ogni azione applica la PRIMA BARRIERA: sessione → ownership → logica esistente.
// Le funzioni-contratto grezze (getCourseForPlayer, startQuiz, …) non si espongono mai
// direttamente al client: passano sempre da qui.

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { slide, lesson, module as courseModule, quiz } from "@/lib/db/schema";
import { requireSession, isPlayerReviewerId } from "@/features/auth/guards";
import {
  assertEnrollmentOwnedBy,
  assertAttemptOwnedBy,
  assertQuizInCourseOf,
  loadOwnedEnrollment,
  AccessDeniedError,
} from "@/features/access/ownership";
import { getCourseForPlayer } from "@/features/courses/get-course-for-player";
import { getSignedClipUrl } from "@/lib/cloudflare/stream";
import { startQuiz, submitQuiz, QuizNonDisponibile } from "@/features/quiz/engine";
import { statoPercorso } from "@/features/courses/completamento";
import { withTenant } from "@/lib/db/tenant";
import { ensureCertificateRecord } from "@/features/certificates/lifecycle";
import { leggiAnagrafica } from "@/features/certificates/anagrafica";

/** Messaggio riconosciuto dal player: mostra il modulo dei dati per il certificato. */
export const SERVONO_DATI_CERTIFICATO = "Prima dell'esame finale inserisci i dati per il certificato.";

export async function getMyCourse(enrollmentId: string) {
  const { user } = await requireSession();
  await assertEnrollmentOwnedBy(enrollmentId, user.id);
  return getCourseForPlayer(enrollmentId, { userId: user.id });
}

export async function startMyQuiz(enrollmentId: string, quizId: string) {
  const { user } = await requireSession();
  // ownership dell'iscrizione + vincolo quiz∈corso (M-9): impedisce di estrarre la banca
  // domande di un altro corso passando un quizId arbitrario.
  await assertQuizInCourseOf(quizId, enrollmentId, user.id);
  // l'esame FINALE parte solo con i dati per il certificato accreditato (CF, data e luogo di
  // nascita): così a fine corso il committente li riceve già. Controllo lato server.
  const [q] = await db.select({ type: quiz.type, courseId: quiz.courseId }).from(quiz).where(eq(quiz.id, quizId)).limit(1);
  // L'esame FINALE si apre solo a percorso completato: tutte le slide e i quiz intermedi
  // (superati, o esonerati dalla regola non retroattiva), come nel player. Senza, chi chiama il
  // server a mano faceva l'esame il primo giorno e leggeva le domande senza studiare.
  // Esenti: chi l'esame l'ha già iniziato una volta (niente di retroattivo) e i revisori interni.
  if (q?.type === "final" && !isPlayerReviewerId(user.id)) {
    const stato = await withTenant({ userId: user.id }, (tx) => statoPercorso(tx, enrollmentId, q.courseId));
    if (!stato.esameGiaIniziato && (stato.slideMancanti > 0 || stato.checkpointMancanti.length > 0)) {
      const manca = [
        stato.slideMancanti > 0 ? `${stato.slideMancanti} unità da completare` : null,
        stato.checkpointMancanti.length > 0 ? `i quiz intermedi da superare (${stato.checkpointMancanti.join(", ")})` : null,
      ].filter(Boolean);
      throw new QuizNonDisponibile(`L'esame finale si apre a percorso completato. Ti mancano: ${manca.join(" e ")}.`);
    }
  }
  if (q?.type === "final" && !(await leggiAnagrafica(user.id))) throw new Error(SERVONO_DATI_CERTIFICATO);
  return startQuiz(enrollmentId, quizId, { userId: user.id });
}

export async function submitMyQuiz(
  attemptId: string,
  answers: { questionId: string; optionId: string }[],
) {
  const { user } = await requireSession();
  await assertAttemptOwnedBy(attemptId, user.id);
  return submitQuiz(attemptId, answers, { userId: user.id });
}

export async function requestMyCertificate(enrollmentId: string) {
  const { user } = await requireSession();
  await assertEnrollmentOwnedBy(enrollmentId, user.id);
  return ensureCertificateRecord(enrollmentId, { userId: user.id });
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
