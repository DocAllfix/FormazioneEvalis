// Contratto di lettura per il player: la UI consuma QUESTO. Ritorna il corso
// strutturato (slide ordinate + URL clip + progress per-slide), i quiz e lo stato timer
// (tempo effettivo + monte ore). Nessuna logica di compliance nella UI.

import { and, asc, eq } from "drizzle-orm";
import { course, enrollment, module as courseModule, lesson, slide, slideProgress, quiz } from "@/lib/db/schema";
import { courseEffectiveSeconds } from "@/features/tracking/progress";
import { isQuizPassed } from "@/features/quiz/engine";
import { withTenant, type TenantCtx } from "@/lib/db/tenant";

export async function getCourseForPlayer(enrollmentId: string, ctx: TenantCtx) {
  return withTenant(ctx, async (tx) => {
  const [enr] = await tx
    .select({ courseId: enrollment.courseId })
    .from(enrollment)
    .where(eq(enrollment.id, enrollmentId))
    .limit(1);
  if (!enr) throw new Error("Enrollment inesistente.");
  const courseId = enr.courseId;

  const [crs] = await tx
    .select({ id: course.id, title: course.title, requiredMinutes: course.requiredMinutes })
    .from(course)
    .where(eq(course.id, courseId))
    .limit(1);
  if (!crs) throw new Error("Corso inesistente.");

  const rows = await tx
    .select({
      slideId: slide.id,
      lessonId: slide.lessonId,
      moduleId: lesson.moduleId,
      title: slide.title,
      blocks: slide.blocks,
      clipUid: slide.avatarClipUid,
      audioSeconds: slide.audioSeconds,
      effectiveSeconds: slideProgress.effectiveSeconds,
      completedAt: slideProgress.completedAt,
    })
    .from(slide)
    .innerJoin(lesson, eq(lesson.id, slide.lessonId))
    .innerJoin(courseModule, eq(courseModule.id, lesson.moduleId))
    .leftJoin(
      slideProgress,
      and(eq(slideProgress.slideId, slide.id), eq(slideProgress.enrollmentId, enrollmentId)),
    )
    .where(eq(courseModule.courseId, courseId))
    .orderBy(asc(courseModule.position), asc(lesson.position), asc(slide.position));

  // L'URL firmato della clip NON va qui (token a vita breve): il player lo chiede
  // per-slide via getMyClipUrl quando raggiunge la slide. Qui solo i metadati.
  const slides = rows.map((r) => ({
    id: r.slideId,
    lessonId: r.lessonId,
    moduleId: r.moduleId,
    title: r.title,
    blocks: r.blocks,
    audioSeconds: r.audioSeconds,
    hasClip: !!r.clipUid,
    effectiveSeconds: r.effectiveSeconds ?? 0,
    completed: !!r.completedAt,
  }));

  const quizRows = await tx
    .select({ id: quiz.id, type: quiz.type, title: quiz.title, position: quiz.position })
    .from(quiz)
    .where(eq(quiz.courseId, courseId))
    .orderBy(asc(quiz.position));
  // `passed` per quiz: serve alla UI per resume + gating dei checkpoint.
  // Sequenziale (NON Promise.all): le query condividono l'unica connessione della tx.
  const quizzes: ((typeof quizRows)[number] & { passed: boolean })[] = [];
  for (const q of quizRows) {
    quizzes.push({ ...q, passed: await isQuizPassed(enrollmentId, q.id, tx) });
  }

  const effectiveSeconds = await courseEffectiveSeconds(enrollmentId, courseId, tx);

  return {
    course: { id: crs.id, title: crs.title, requiredMinutes: crs.requiredMinutes },
    timer: { effectiveSeconds, requiredSeconds: crs.requiredMinutes * 60 },
    slides,
    quizzes,
  };
  });
}
