// Catalogo lato ADMIN piattaforma: tutti i corsi globali (published + draft) con conteggi
// e ore. Gated requirePlatformAdmin. Conteggio slide aggregato (no N+1).

import { asc, count, eq, isNull, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { course, module as courseModule, lesson, slide, quiz, quizQuestion } from "@/lib/db/schema";
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

export type AdminCourseEdit = {
  id: string;
  title: string;
  category: string | null;
  imageUrl: string | null;
  details: CourseDetails | null;
};

// --- Albero contenuti per l'editor in-place (/staff/corsi/[id]/contenuti) ---

export type QuestionOption = { id: string; text: string };
export type CourseTree = {
  id: string;
  title: string;
  status: string;
  modules: {
    id: string;
    title: string;
    lessons: {
      id: string;
      title: string;
      slides: { id: string; title: string; audioSeconds: number; hasAvatar: boolean }[];
    }[];
  }[];
  quizzes: {
    id: string;
    title: string;
    type: string;
    passThreshold: number;
    questionsToDraw: number;
    maxAttempts: number | null;
    timeLimitSeconds: number;
    cooldownSeconds: number;
    questions: { id: string; text: string; options: QuestionOption[]; correctOptionId: string }[];
  }[];
};

/** Albero completo (struttura + quiz + banca domande) per l'editor authoring. Gated admin. */
export async function getCourseTreeForEdit(courseId: string): Promise<CourseTree | null> {
  await requirePlatformAdmin();
  const [c] = await db
    .select({ id: course.id, title: course.title, status: course.status })
    .from(course)
    .where(eq(course.id, courseId))
    .limit(1);
  if (!c) return null;

  const mods = await db
    .select({ id: courseModule.id, title: courseModule.title })
    .from(courseModule)
    .where(eq(courseModule.courseId, courseId))
    .orderBy(asc(courseModule.position));
  const moduleIds = mods.map((m) => m.id);

  const lessons = moduleIds.length
    ? await db
        .select({ id: lesson.id, moduleId: lesson.moduleId, title: lesson.title })
        .from(lesson)
        .where(inArray(lesson.moduleId, moduleIds))
        .orderBy(asc(lesson.position))
    : [];
  const lessonIds = lessons.map((l) => l.id);

  const slides = lessonIds.length
    ? await db
        .select({ id: slide.id, lessonId: slide.lessonId, title: slide.title, audioSeconds: slide.audioSeconds, avatarClipUid: slide.avatarClipUid })
        .from(slide)
        .where(inArray(slide.lessonId, lessonIds))
        .orderBy(asc(slide.position))
    : [];

  const quizzes = await db
    .select({
      id: quiz.id, title: quiz.title, type: quiz.type, passThreshold: quiz.passThreshold,
      questionsToDraw: quiz.questionsToDraw, maxAttempts: quiz.maxAttempts,
      timeLimitSeconds: quiz.timeLimitSeconds, cooldownSeconds: quiz.cooldownSeconds,
    })
    .from(quiz)
    .where(eq(quiz.courseId, courseId))
    .orderBy(asc(quiz.position));

  const questions = await db
    .select({ id: quizQuestion.id, quizId: quizQuestion.quizId, text: quizQuestion.text, options: quizQuestion.options, correctOptionId: quizQuestion.correctOptionId })
    .from(quizQuestion)
    .where(eq(quizQuestion.courseId, courseId))
    .orderBy(asc(quizQuestion.createdAt));

  return {
    id: c.id,
    title: c.title,
    status: c.status,
    modules: mods.map((m) => ({
      id: m.id,
      title: m.title,
      lessons: lessons
        .filter((l) => l.moduleId === m.id)
        .map((l) => ({
          id: l.id,
          title: l.title,
          slides: slides
            .filter((s) => s.lessonId === l.id)
            .map((s) => ({ id: s.id, title: s.title, audioSeconds: s.audioSeconds, hasAvatar: !!s.avatarClipUid })),
        })),
    })),
    quizzes: quizzes.map((qz) => ({
      ...qz,
      questions: questions
        .filter((q) => q.quizId === qz.id)
        .map((q) => ({ id: q.id, text: q.text, options: (q.options as QuestionOption[]) ?? [], correctOptionId: q.correctOptionId })),
    })),
  };
}

/** Singolo corso per la pagina di modifica (immagine + scheda). Gated admin. */
export async function getAdminCourse(courseId: string): Promise<AdminCourseEdit | null> {
  await requirePlatformAdmin();
  const [c] = await db
    .select({
      id: course.id,
      title: course.title,
      category: course.category,
      imageUrl: course.imageUrl,
      details: course.details,
    })
    .from(course)
    .where(eq(course.id, courseId))
    .limit(1);
  return c ? { ...c, details: c.details ?? null } : null;
}
