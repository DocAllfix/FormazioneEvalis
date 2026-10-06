// Legge dal DB la struttura di un corso nella forma che serve a problemiSequenzaPlayer
// (src/features/courses/integrita.ts). Solo SELECT. Usato da verifica-corso e _integrita-catalogo.
import { asc, count, eq } from "drizzle-orm";
import type { db as Db } from "@/lib/db";
import { lesson, module as moduleT, quiz, quizQuestion, slide } from "@/lib/db/schema";
import type { CorsoStruttura } from "@/features/courses/integrita";

export async function caricaStrutturaCorso(db: typeof Db, courseId: string): Promise<CorsoStruttura> {
  // stesso ordine del player (get-course-for-player): modulo, lezione, slide
  const righe = await db
    .select({ id: slide.id, lessonId: slide.lessonId })
    .from(slide)
    .innerJoin(lesson, eq(lesson.id, slide.lessonId))
    .innerJoin(moduleT, eq(moduleT.id, lesson.moduleId))
    .where(eq(moduleT.courseId, courseId))
    .orderBy(asc(moduleT.position), asc(lesson.position), asc(slide.position));
  const quizRighe = await db.select().from(quiz).where(eq(quiz.courseId, courseId));
  const banche = await db
    .select({ quizId: quizQuestion.quizId, n: count() })
    .from(quizQuestion)
    .where(eq(quizQuestion.courseId, courseId))
    .groupBy(quizQuestion.quizId);
  return {
    slide: righe,
    quiz: quizRighe.map((q) => ({
      id: q.id,
      type: q.type,
      title: q.title,
      position: q.position,
      questionsToDraw: q.questionsToDraw,
      passThreshold: q.passThreshold,
      timeLimitSeconds: q.timeLimitSeconds,
      cooldownSeconds: q.cooldownSeconds,
      maxAttempts: q.maxAttempts,
      bancaDomande: Number(banche.find((b) => b.quizId === q.id)?.n ?? 0),
    })),
  };
}
