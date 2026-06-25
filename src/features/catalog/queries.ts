// Letture pubbliche del catalogo (corsi globali pubblicati). Sottili, senza gate:
// il catalogo è pubblico; l'acquisto/iscrizione richiede sessione (gate nelle azioni).

import { and, asc, count, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { course, enrollment, lesson, module as courseModule, quiz, slide } from "@/lib/db/schema";
import type { CourseDetails } from "@/features/courses/course-details";
import { withTenant } from "@/lib/db/tenant";

export type CatalogCourse = {
  id: string;
  slug: string | null;
  title: string;
  description: string | null;
  durationHours: number | null;
  requiredMinutes: number;
  category: string | null;
  priceCents: number | null;
  currency: string | null;
  imageUrl: string | null;
  purchasable: boolean;
};

/** Corsi globali pubblicati (catalogo pubblico B2C). */
export async function listPublishedCourses(): Promise<CatalogCourse[]> {
  const rows = await db
    .select({
      id: course.id,
      slug: course.slug,
      title: course.title,
      description: course.description,
      durationHours: course.durationHours,
      requiredMinutes: course.requiredMinutes,
      category: course.category,
      priceCents: course.priceCents,
      currency: course.currency,
      imageUrl: course.imageUrl,
      stripePriceId: course.stripePriceId,
    })
    .from(course)
    .where(and(eq(course.status, "published"), isNull(course.organizationId)))
    .orderBy(asc(course.title));

  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    description: r.description,
    durationHours: r.durationHours,
    requiredMinutes: r.requiredMinutes,
    category: r.category,
    priceCents: r.priceCents,
    currency: r.currency,
    imageUrl: r.imageUrl,
    purchasable: !!r.stripePriceId,
  }));
}

export type CourseProgramModule = { title: string; lessons: string[] };
export type CourseExam = {
  passThreshold: number;
  questionsToDraw: number;
  maxAttempts: number | null;
  timeLimitSeconds: number;
} | null;

export type PublicCourse = CatalogCourse & {
  details: CourseDetails | null;
  modules: number;
  lessons: number;
  slides: number;
  program: CourseProgramModule[];
  exam: CourseExam;
};

/** Dettaglio pubblico di un corso pubblicato + conteggi struttura. Null se inesistente. */
export async function getPublicCourse(courseId: string): Promise<PublicCourse | null> {
  const [c] = await db
    .select({
      id: course.id,
      slug: course.slug,
      title: course.title,
      description: course.description,
      durationHours: course.durationHours,
      requiredMinutes: course.requiredMinutes,
      category: course.category,
      priceCents: course.priceCents,
      currency: course.currency,
      imageUrl: course.imageUrl,
      details: course.details,
      stripePriceId: course.stripePriceId,
      status: course.status,
    })
    .from(course)
    .where(eq(course.id, courseId))
    .limit(1);
  if (!c || c.status !== "published") return null;

  // Struttura per i conteggi + il PROGRAMMA (moduli → lezioni).
  const mods = await db
    .select({ id: courseModule.id, title: courseModule.title })
    .from(courseModule)
    .where(eq(courseModule.courseId, courseId))
    .orderBy(asc(courseModule.position));
  const less = await db
    .select({ moduleId: lesson.moduleId, title: lesson.title })
    .from(lesson)
    .innerJoin(courseModule, eq(courseModule.id, lesson.moduleId))
    .where(eq(courseModule.courseId, courseId))
    .orderBy(asc(lesson.position));
  const [sl] = await db
    .select({ n: count() })
    .from(slide)
    .innerJoin(lesson, eq(lesson.id, slide.lessonId))
    .innerJoin(courseModule, eq(courseModule.id, lesson.moduleId))
    .where(eq(courseModule.courseId, courseId));

  const program: CourseProgramModule[] = mods.map((m) => ({
    title: m.title,
    lessons: less.filter((l) => l.moduleId === m.id).map((l) => l.title),
  }));

  const [finalQuiz] = await db
    .select({
      passThreshold: quiz.passThreshold,
      questionsToDraw: quiz.questionsToDraw,
      maxAttempts: quiz.maxAttempts,
      timeLimitSeconds: quiz.timeLimitSeconds,
    })
    .from(quiz)
    .where(and(eq(quiz.courseId, courseId), eq(quiz.type, "final")))
    .limit(1);

  return {
    id: c.id,
    slug: c.slug,
    title: c.title,
    description: c.description,
    durationHours: c.durationHours,
    requiredMinutes: c.requiredMinutes,
    category: c.category,
    priceCents: c.priceCents,
    currency: c.currency,
    imageUrl: c.imageUrl,
    details: c.details ?? null,
    purchasable: !!c.stripePriceId,
    modules: mods.length,
    lessons: less.length,
    slides: Number(sl.n),
    program,
    exam: finalQuiz ?? null,
  };
}

/** Dettaglio pubblico per SLUG (pagina teaser SEO). Solo corsi pubblicati. */
export async function getPublicCourseBySlug(slug: string): Promise<PublicCourse | null> {
  const [c] = await db
    .select({ id: course.id })
    .from(course)
    .where(and(eq(course.slug, slug), eq(course.status, "published"), isNull(course.organizationId)))
    .limit(1);
  return c ? getPublicCourse(c.id) : null;
}

/** L'iscrizione attiva dell'utente a un corso, se esiste (per lo stato CTA). */
export async function getMyEnrollmentForCourse(userId: string, courseId: string) {
  const [e] = await withTenant({ userId }, async (tx) =>
    tx
      .select({ id: enrollment.id })
      .from(enrollment)
      .where(
        and(
          eq(enrollment.userId, userId),
          eq(enrollment.courseId, courseId),
          eq(enrollment.status, "active"),
        ),
      )
      .limit(1),
  );
  return e ?? null;
}
