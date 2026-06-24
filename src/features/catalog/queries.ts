// Letture pubbliche del catalogo (corsi globali pubblicati). Sottili, senza gate:
// il catalogo è pubblico; l'acquisto/iscrizione richiede sessione (gate nelle azioni).

import { and, asc, count, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { course, enrollment, lesson, module as courseModule, slide } from "@/lib/db/schema";

export type CatalogCourse = {
  id: string;
  title: string;
  description: string | null;
  durationHours: number | null;
  requiredMinutes: number;
  purchasable: boolean;
};

/** Corsi globali pubblicati (catalogo pubblico B2C). */
export async function listPublishedCourses(): Promise<CatalogCourse[]> {
  const rows = await db
    .select({
      id: course.id,
      title: course.title,
      description: course.description,
      durationHours: course.durationHours,
      requiredMinutes: course.requiredMinutes,
      stripePriceId: course.stripePriceId,
    })
    .from(course)
    .where(and(eq(course.status, "published"), isNull(course.organizationId)))
    .orderBy(asc(course.title));

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    durationHours: r.durationHours,
    requiredMinutes: r.requiredMinutes,
    purchasable: !!r.stripePriceId,
  }));
}

export type PublicCourse = CatalogCourse & { modules: number; lessons: number; slides: number };

/** Dettaglio pubblico di un corso pubblicato + conteggi struttura. Null se inesistente. */
export async function getPublicCourse(courseId: string): Promise<PublicCourse | null> {
  const [c] = await db
    .select({
      id: course.id,
      title: course.title,
      description: course.description,
      durationHours: course.durationHours,
      requiredMinutes: course.requiredMinutes,
      stripePriceId: course.stripePriceId,
      status: course.status,
    })
    .from(course)
    .where(eq(course.id, courseId))
    .limit(1);
  if (!c || c.status !== "published") return null;

  const [mods] = await db.select({ n: count() }).from(courseModule).where(eq(courseModule.courseId, courseId));
  const [les] = await db
    .select({ n: count() })
    .from(lesson)
    .innerJoin(courseModule, eq(courseModule.id, lesson.moduleId))
    .where(eq(courseModule.courseId, courseId));
  const [sl] = await db
    .select({ n: count() })
    .from(slide)
    .innerJoin(lesson, eq(lesson.id, slide.lessonId))
    .innerJoin(courseModule, eq(courseModule.id, lesson.moduleId))
    .where(eq(courseModule.courseId, courseId));

  return {
    id: c.id,
    title: c.title,
    description: c.description,
    durationHours: c.durationHours,
    requiredMinutes: c.requiredMinutes,
    purchasable: !!c.stripePriceId,
    modules: Number(mods.n),
    lessons: Number(les.n),
    slides: Number(sl.n),
  };
}

/** L'iscrizione attiva dell'utente a un corso, se esiste (per lo stato CTA). */
export async function getMyEnrollmentForCourse(userId: string, courseId: string) {
  const [e] = await db
    .select({ id: enrollment.id })
    .from(enrollment)
    .where(
      and(
        eq(enrollment.userId, userId),
        eq(enrollment.courseId, courseId),
        eq(enrollment.status, "active"),
      ),
    )
    .limit(1);
  return e ?? null;
}
