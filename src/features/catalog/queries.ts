// Letture pubbliche del catalogo (corsi globali pubblicati). Sottili, senza gate:
// il catalogo è pubblico; l'acquisto/iscrizione richiede sessione (gate nelle azioni).

import { and, asc, count, eq, isNull } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { bundle, bundleCourse, course, enrollment, lesson, module as courseModule, quiz, slide } from "@/lib/db/schema";
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
  // Prezzo di LISTINO (barrato): mostrato solo se maggiore di priceCents (doppio listino).
  listPriceCents: number | null;
  currency: string | null;
  imageUrl: string | null;
  purchasable: boolean;
};

/** Corsi globali pubblicati (catalogo pubblico B2C). */
async function _listPublishedCourses(): Promise<CatalogCourse[]> {
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
      listPriceCents: course.listPriceCents,
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
    listPriceCents: r.listPriceCents,
    currency: r.currency,
    imageUrl: r.imageUrl,
    purchasable: !!r.stripePriceId,
  }));
}

/** Catalogo pubblico cachato (dati GLOBALI, nessun dato per-utente). Revalida ogni 60s. */
export const listPublishedCourses = unstable_cache(_listPublishedCourses, ["catalog:published"], {
  revalidate: 60,
  tags: ["catalog"],
});

export type CourseProgramModule = { title: string; summary?: string; lessons: string[] };
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
  // Prerequisito INFORMATIVO (ISO 19011): valorizzato solo sui corsi ISO marcati.
  prerequisiteCourseId: string | null;
  prerequisiteTitle: string | null;
};

/** Dettaglio pubblico di un corso pubblicato + conteggi struttura. Null se inesistente. */
async function _getPublicCourse(courseId: string): Promise<PublicCourse | null> {
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
      listPriceCents: course.listPriceCents,
      currency: course.currency,
      imageUrl: course.imageUrl,
      details: course.details,
      stripePriceId: course.stripePriceId,
      status: course.status,
      prerequisiteCourseId: course.prerequisiteCourseId,
    })
    .from(course)
    .where(eq(course.id, courseId))
    .limit(1);
  if (!c || c.status !== "published") return null;

  // Titolo del corso prerequisito (per il badge informativo), se marcato.
  let prerequisiteTitle: string | null = null;
  if (c.prerequisiteCourseId) {
    const [p] = await db.select({ title: course.title }).from(course).where(eq(course.id, c.prerequisiteCourseId)).limit(1);
    prerequisiteTitle = p?.title ?? null;
  }

  // Struttura (moduli/lezioni), conteggio slide e quiz finale: query indipendenti → in PARALLELO.
  const [mods, less, slRows, finalQuizRows] = await Promise.all([
    db
      .select({ id: courseModule.id, title: courseModule.title })
      .from(courseModule)
      .where(eq(courseModule.courseId, courseId))
      .orderBy(asc(courseModule.position)),
    db
      .select({ moduleId: lesson.moduleId, title: lesson.title })
      .from(lesson)
      .innerJoin(courseModule, eq(courseModule.id, lesson.moduleId))
      .where(eq(courseModule.courseId, courseId))
      .orderBy(asc(lesson.position)),
    db
      .select({ n: count() })
      .from(slide)
      .innerJoin(lesson, eq(lesson.id, slide.lessonId))
      .innerJoin(courseModule, eq(courseModule.id, lesson.moduleId))
      .where(eq(courseModule.courseId, courseId)),
    db
      .select({
        passThreshold: quiz.passThreshold,
        questionsToDraw: quiz.questionsToDraw,
        maxAttempts: quiz.maxAttempts,
        timeLimitSeconds: quiz.timeLimitSeconds,
      })
      .from(quiz)
      .where(and(eq(quiz.courseId, courseId), eq(quiz.type, "final")))
      .limit(1),
  ]);
  const sl = slRows[0];
  const finalQuiz = finalQuizRows[0];

  // Programma: se il corso ha un programma autorato in details, usalo (titolo + sintesi);
  // altrimenti quello generico derivato dai moduli DB (titolo + elenco lezioni).
  const authored = c.details?.program;
  const program: CourseProgramModule[] =
    authored && authored.length > 0
      ? authored.map((p) => ({ title: p.title, summary: p.summary, lessons: [] }))
      : mods.map((m) => ({
          title: m.title,
          lessons: less.filter((l) => l.moduleId === m.id).map((l) => l.title),
        }));

  return {
    id: c.id,
    slug: c.slug,
    title: c.title,
    description: c.description,
    durationHours: c.durationHours,
    requiredMinutes: c.requiredMinutes,
    category: c.category,
    priceCents: c.priceCents,
    listPriceCents: c.listPriceCents,
    currency: c.currency,
    imageUrl: c.imageUrl,
    details: c.details ?? null,
    purchasable: !!c.stripePriceId,
    modules: mods.length,
    lessons: less.length,
    slides: Number(sl.n),
    program,
    exam: finalQuiz ?? null,
    prerequisiteCourseId: c.prerequisiteCourseId ?? null,
    prerequisiteTitle,
  };
}

/** Dettaglio pubblico cachato per ID (dati GLOBALI). Revalida ogni 60s. */
export const getPublicCourse = unstable_cache(_getPublicCourse, ["catalog:course"], {
  revalidate: 60,
  tags: ["catalog"],
});

/** Dettaglio pubblico per SLUG (pagina teaser SEO). Solo corsi pubblicati. */
export async function getPublicCourseBySlug(slug: string): Promise<PublicCourse | null> {
  const [c] = await db
    .select({ id: course.id })
    .from(course)
    .where(and(eq(course.slug, slug), eq(course.status, "published"), isNull(course.organizationId)))
    .limit(1);
  return c ? getPublicCourse(c.id) : null;
}

// --- Bundle (pacchetti in vetrina) ---

export type CatalogBundleCourse = {
  id: string;
  title: string;
  priceCents: number | null;
  role: "included" | "eligible";
};
export type CatalogBundle = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  kind: "fixed" | "pick_one";
  priceCents: number | null;
  currency: string | null;
  courses: CatalogBundleCourse[];
};

/** Pacchetti attivi con i corsi (e i loro prezzi CORRENTI: il "barrato" del bundle è la
 * somma dei prezzi correnti dei singoli — resta vero in ogni periodo, lancio o listino). */
async function _listActiveBundles(): Promise<CatalogBundle[]> {
  const rows = await db
    .select({
      id: bundle.id,
      slug: bundle.slug,
      title: bundle.title,
      description: bundle.description,
      kind: bundle.kind,
      priceCents: bundle.priceCents,
      currency: bundle.currency,
      position: bundle.position,
    })
    .from(bundle)
    .where(eq(bundle.active, true))
    .orderBy(asc(bundle.position));
  if (rows.length === 0) return [];

  const links = await db
    .select({
      bundleId: bundleCourse.bundleId,
      role: bundleCourse.role,
      courseId: course.id,
      title: course.title,
      priceCents: course.priceCents,
    })
    .from(bundleCourse)
    .innerJoin(course, eq(course.id, bundleCourse.courseId))
    .where(eq(course.status, "published"));

  return rows.map((b) => ({
    id: b.id,
    slug: b.slug,
    title: b.title,
    description: b.description,
    kind: b.kind,
    priceCents: b.priceCents,
    currency: b.currency,
    courses: links
      .filter((l) => l.bundleId === b.id)
      .map((l) => ({ id: l.courseId, title: l.title, priceCents: l.priceCents, role: l.role })),
  }));
}

/** Pacchetti attivi cachati (dati GLOBALI). Revalida ogni 60s. */
export const listActiveBundles = unstable_cache(_listActiveBundles, ["catalog:bundles"], {
  revalidate: 60,
  tags: ["catalog"],
});

/** Id dei corsi a cui l'utente è già iscritto (attivi). Per-utente: MAI dentro le cache globali. */
export async function getMyEnrolledCourseIds(userId: string): Promise<string[]> {
  const rows = await withTenant({ userId }, async (tx) =>
    tx
      .select({ courseId: enrollment.courseId })
      .from(enrollment)
      .where(and(eq(enrollment.userId, userId), eq(enrollment.status, "active"))),
  );
  return rows.map((r) => r.courseId);
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
