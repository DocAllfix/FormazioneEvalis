// Readiness del certificato: predisposizione per il Modulo 10 (generazione PDF +
// revisione umana, slice successivo). Qui solo il GATE delle condizioni a norma.

import { and, count, eq, isNotNull } from "drizzle-orm";
import { course, enrollment, slide, lesson, module as courseModule, slideProgress, quiz } from "@/lib/db/schema";
import { courseEffectiveSeconds } from "@/features/tracking/progress";
import { isQuizPassed } from "@/features/quiz/engine";
import { withTenant, type TenantCtx } from "@/lib/db/tenant";

export const COMPLETION_TIME_RATIO = 0.9; // tempo effettivo ≥ 90% del monte ore

export async function isReadyForCertificate(
  enrollmentId: string,
  ctx: TenantCtx = {},
): Promise<{ ready: boolean; reasons: string[] }> {
  return withTenant(ctx, async (tx) => {
    const reasons: string[] = [];

    const [enr] = await tx
      .select({ courseId: enrollment.courseId })
      .from(enrollment)
      .where(eq(enrollment.id, enrollmentId))
      .limit(1);
    if (!enr) throw new Error("Enrollment inesistente.");
    const courseId = enr.courseId;

    const [crs] = await tx
      .select({ requiredMinutes: course.requiredMinutes })
      .from(course)
      .where(eq(course.id, courseId))
      .limit(1);
    if (!crs) throw new Error("Corso inesistente.");

    // tutte le unità (slide) completate?
    const [{ total }] = await tx
      .select({ total: count() })
      .from(slide)
      .innerJoin(lesson, eq(lesson.id, slide.lessonId))
      .innerJoin(courseModule, eq(courseModule.id, lesson.moduleId))
      .where(eq(courseModule.courseId, courseId));
    const [{ done }] = await tx
      .select({ done: count() })
      .from(slideProgress)
      .innerJoin(slide, eq(slide.id, slideProgress.slideId))
      .innerJoin(lesson, eq(lesson.id, slide.lessonId))
      .innerJoin(courseModule, eq(courseModule.id, lesson.moduleId))
      .where(
        and(
          eq(slideProgress.enrollmentId, enrollmentId),
          eq(courseModule.courseId, courseId),
          isNotNull(slideProgress.completedAt),
        ),
      );
    if (total === 0 || done < total) reasons.push("Non tutte le unità sono completate.");

    // tempo effettivo ≥ soglia del monte ore (helper sotto la stessa tx)
    const effective = await courseEffectiveSeconds(enrollmentId, courseId, tx);
    const requiredSeconds = crs.requiredMinutes * 60;
    if (effective < Math.floor(requiredSeconds * COMPLETION_TIME_RATIO)) {
      reasons.push("Tempo di fruizione insufficiente.");
    }

    // esame finale superato
    const [finalQuiz] = await tx
      .select({ id: quiz.id })
      .from(quiz)
      .where(and(eq(quiz.courseId, courseId), eq(quiz.type, "final")))
      .limit(1);
    if (!finalQuiz) {
      reasons.push("Esame finale assente.");
    } else if (!(await isQuizPassed(enrollmentId, finalQuiz.id, tx))) {
      reasons.push("Esame finale non superato.");
    }

    return { ready: reasons.length === 0, reasons };
  });
}
