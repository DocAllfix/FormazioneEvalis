// Catalogo lato ADMIN piattaforma: tutti i corsi globali (published + draft) con conteggi
// e ore. Gated requirePlatformAdmin. Conteggio slide aggregato (no N+1).

import { asc, count, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { course, module as courseModule, lesson, slide } from "@/lib/db/schema";
import { requirePlatformAdmin } from "@/features/auth/guards";

export type AdminCourse = {
  id: string;
  title: string;
  status: string;
  requiredMinutes: number;
  durationHours: number | null;
  purchasable: boolean;
  slides: number;
};

export async function listGlobalCoursesForAdmin(): Promise<AdminCourse[]> {
  await requirePlatformAdmin();

  const courses = await db
    .select({
      id: course.id,
      title: course.title,
      status: course.status,
      requiredMinutes: course.requiredMinutes,
      durationHours: course.durationHours,
      stripePriceId: course.stripePriceId,
    })
    .from(course)
    .where(isNull(course.organizationId))
    .orderBy(asc(course.title));

  const slideRows = await db
    .select({ courseId: courseModule.courseId, n: count() })
    .from(slide)
    .innerJoin(lesson, eq(lesson.id, slide.lessonId))
    .innerJoin(courseModule, eq(courseModule.id, lesson.moduleId))
    .groupBy(courseModule.courseId);
  const slidesByCourse = new Map(slideRows.map((r) => [r.courseId, Number(r.n)]));

  return courses.map((c) => ({
    id: c.id,
    title: c.title,
    status: c.status,
    requiredMinutes: c.requiredMinutes,
    durationHours: c.durationHours,
    purchasable: !!c.stripePriceId,
    slides: slidesByCourse.get(c.id) ?? 0,
  }));
}
