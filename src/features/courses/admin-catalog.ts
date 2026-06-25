// Catalogo lato ADMIN piattaforma: tutti i corsi globali (published + draft) con conteggi
// e ore. Gated requirePlatformAdmin. Conteggio slide aggregato (no N+1).

import { asc, count, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { course, module as courseModule, lesson, slide } from "@/lib/db/schema";
import { requirePlatformAdmin } from "@/features/auth/guards";

import type { CourseDetails } from "@/features/courses/course-details";

export type AdminCourse = {
  id: string;
  title: string;
  status: string;
  requiredMinutes: number;
  durationHours: number | null;
  category: string | null;
  priceCents: number | null;
  currency: string | null;
  imageUrl: string | null;
  details: CourseDetails | null;
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
      category: course.category,
      priceCents: course.priceCents,
      currency: course.currency,
      imageUrl: course.imageUrl,
      details: course.details,
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
    category: c.category,
    priceCents: c.priceCents,
    currency: c.currency,
    imageUrl: c.imageUrl,
    details: c.details ?? null,
    purchasable: !!c.stripePriceId,
    slides: slidesByCourse.get(c.id) ?? 0,
  }));
}
