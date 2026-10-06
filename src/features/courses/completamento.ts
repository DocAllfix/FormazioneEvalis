// Stato del percorso di un discente: slide completate e quiz superati o esonerati.
// UN SOLO calcolo per il player e per i controlli lato server (apertura dell'esame finale):
// se li calcolassero in due modi diversi, un discente onesto potrebbe vedere l'esame nel player
// e sentirselo rifiutare dal server. L'esonero dei checkpoint è la regola non retroattiva del
// 06/10 (checkpoint-esonero.ts), riusata così com'è.

import { and, asc, eq, min } from "drizzle-orm";
import { db } from "@/lib/db";
import { module as courseModule, lesson, slide, slideProgress, quiz, quizAttempt } from "@/lib/db/schema";
import { isQuizPassed } from "@/features/quiz/engine";
import { checkpointNonRetroattivo } from "@/features/courses/checkpoint-esonero";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** I quiz del corso con `passed` ed `esonerato`. `slideOrdinate`: le slide nell'ordine del corso
 *  (modulo, lezione, slide), con la lezione e il completamento. */
export async function quizDelPercorso(
  tx: Tx,
  enrollmentId: string,
  courseId: string,
  slideOrdinate: { lessonId: string; completedAt: Date | null }[],
) {
  const quizRows = await tx
    .select({ id: quiz.id, type: quiz.type, title: quiz.title, position: quiz.position })
    .from(quiz)
    .where(eq(quiz.courseId, courseId))
    .orderBy(asc(quiz.position));
  // `passed` per quiz: serve alla UI per resume + gating dei checkpoint.
  // Sequenziale (NON Promise.all): le query condividono l'unica connessione della tx.
  const quizzes: ((typeof quizRows)[number] & { passed: boolean; esonerato: boolean })[] = [];
  // checkpoint non retroattivi (checkpoint-esonero.ts): indice lezione numerato come fa il player
  // (lezioni consecutive nell'ordine delle slide), più l'inizio dell'esame finale
  let indice = -1;
  let ultimaLezione: string | null = null;
  const slideCompletate = slideOrdinate.map((r) => {
    if (r.lessonId !== ultimaLezione) {
      indice++;
      ultimaLezione = r.lessonId;
    }
    return { indiceLezione: indice, completedAt: r.completedAt };
  });
  const finale = quizRows.find((q) => q.type === "final");
  const [inizioEsame] = finale
    ? await tx
        .select({ il: min(quizAttempt.startedAt) })
        .from(quizAttempt)
        .where(and(eq(quizAttempt.enrollmentId, enrollmentId), eq(quizAttempt.quizId, finale.id)))
    : [];
  const esameIniziatoIl = inizioEsame?.il ? new Date(inizioEsame.il) : null;
  for (const q of quizRows) {
    const passed = await isQuizPassed(enrollmentId, q.id, tx);
    const esonerato = q.type === "checkpoint" && !passed && checkpointNonRetroattivo(q.position, slideCompletate, esameIniziatoIl);
    quizzes.push({ ...q, passed, esonerato });
  }
  return { quizzes, esameIniziatoIl };
}

/** Cosa manca per aver completato il percorso prima dell'esame finale (stessa regola del player:
 *  tutte le slide completate e ogni checkpoint superato o esonerato). */
export async function statoPercorso(tx: Tx, enrollmentId: string, courseId: string) {
  const righe = await tx
    .select({ lessonId: slide.lessonId, completedAt: slideProgress.completedAt })
    .from(slide)
    .innerJoin(lesson, eq(lesson.id, slide.lessonId))
    .innerJoin(courseModule, eq(courseModule.id, lesson.moduleId))
    .leftJoin(slideProgress, and(eq(slideProgress.slideId, slide.id), eq(slideProgress.enrollmentId, enrollmentId)))
    .where(eq(courseModule.courseId, courseId))
    .orderBy(asc(courseModule.position), asc(lesson.position), asc(slide.position));
  const { quizzes, esameIniziatoIl } = await quizDelPercorso(tx, enrollmentId, courseId, righe);
  return {
    slideTotali: righe.length,
    slideMancanti: righe.filter((r) => !r.completedAt).length,
    checkpointMancanti: quizzes.filter((q) => q.type === "checkpoint" && !q.passed && !q.esonerato).map((q) => q.title),
    esameGiaIniziato: esameIniziatoIl !== null,
  };
}
