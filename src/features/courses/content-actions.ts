"use server";

// Editor authoring IN-PLACE (admin di piattaforma): modifica i titoli della struttura, la config
// dei quiz e la BANCA DOMANDE di un corso già ingerito, senza re-import. Gated requirePlatformAdmin.
// Ogni modifica è tracciata nel registro append-only (stream "platform"). NON tocca i blocchi slide
// (HTML generato dalla pipeline avatar) né la logica di compliance (tracking/quiz-engine).

import { z } from "zod";
import { eq, and, count } from "drizzle-orm";
import { db } from "@/lib/db";
import { module as courseModule, lesson, slide, quiz, quizQuestion } from "@/lib/db/schema";
import { requirePlatformAdmin } from "@/features/auth/guards";
import { withTenant } from "@/lib/db/tenant";
import { appendActivity } from "@/features/audit/log";

// Stream del registro append-only per le azioni admin di piattaforma (corsi globali, org=null).
const PLATFORM_ORG = "platform";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function cleanTitle(raw: string): string {
  const t = raw.trim();
  if (!t || t.length > 300) throw new Error("Titolo non valido (1-300 caratteri).");
  return t;
}

function audit(tx: Tx, userId: string, verb: string, object: string, payload?: unknown) {
  return appendActivity(tx, { organizationId: PLATFORM_ORG, userId, verb, object, payload });
}

export async function updateModuleTitle(moduleId: string, title: string): Promise<void> {
  const ctx = await requirePlatformAdmin();
  const t = cleanTitle(title);
  await withTenant({ platformAdmin: true }, async (tx) => {
    const r = await tx.update(courseModule).set({ title: t }).where(eq(courseModule.id, moduleId)).returning({ id: courseModule.id });
    if (!r.length) throw new Error("Modulo inesistente.");
    await audit(tx, ctx.user.id, "module-updated", `module:${moduleId}`, { title: t });
  });
}

export async function updateLessonTitle(lessonId: string, title: string): Promise<void> {
  const ctx = await requirePlatformAdmin();
  const t = cleanTitle(title);
  await withTenant({ platformAdmin: true }, async (tx) => {
    const r = await tx.update(lesson).set({ title: t }).where(eq(lesson.id, lessonId)).returning({ id: lesson.id });
    if (!r.length) throw new Error("Lezione inesistente.");
    await audit(tx, ctx.user.id, "lesson-updated", `lesson:${lessonId}`, { title: t });
  });
}

export async function updateSlideTitle(slideId: string, title: string): Promise<void> {
  const ctx = await requirePlatformAdmin();
  const t = cleanTitle(title);
  await withTenant({ platformAdmin: true }, async (tx) => {
    const r = await tx.update(slide).set({ title: t }).where(eq(slide.id, slideId)).returning({ id: slide.id });
    if (!r.length) throw new Error("Slide inesistente.");
    await audit(tx, ctx.user.id, "slide-updated", `slide:${slideId}`, { title: t });
  });
}

const quizConfigSchema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  passThreshold: z.number().int().min(1).max(100).optional(),
  questionsToDraw: z.number().int().min(1).max(200).optional(),
  maxAttempts: z.number().int().min(1).max(100).nullable().optional(),
  timeLimitSeconds: z.number().int().min(0).max(36000).optional(),
  cooldownSeconds: z.number().int().min(0).max(604800).optional(),
});

export async function updateQuizConfig(quizId: string, patchRaw: unknown): Promise<void> {
  const ctx = await requirePlatformAdmin();
  const patch = quizConfigSchema.parse(patchRaw);
  if (Object.keys(patch).length === 0) return;
  await withTenant({ platformAdmin: true }, async (tx) => {
    // Il sorteggio non può superare la banca: vincolo di integrità del quiz.
    if (patch.questionsToDraw !== undefined) {
      const [{ n }] = await tx.select({ n: count() }).from(quizQuestion).where(eq(quizQuestion.quizId, quizId));
      if (patch.questionsToDraw > Number(n))
        throw new Error(`Sorteggio (${patch.questionsToDraw}) maggiore delle domande in banca (${n}).`);
    }
    const r = await tx.update(quiz).set(patch).where(eq(quiz.id, quizId)).returning({ id: quiz.id });
    if (!r.length) throw new Error("Quiz inesistente.");
    await appendActivity(tx, { organizationId: PLATFORM_ORG, userId: ctx.user.id, verb: "quiz-config-updated", object: `quiz:${quizId}`, payload: patch });
  });
}

const questionSchema = z.object({
  id: z.string().uuid().optional(),
  text: z.string().trim().min(1).max(2000),
  options: z.array(z.object({ id: z.string().min(1).max(40), text: z.string().trim().min(1).max(1000) })).min(2).max(10),
  correctOptionId: z.string().min(1),
});

export async function upsertQuizQuestion(courseId: string, quizId: string, dataRaw: unknown): Promise<{ id: string }> {
  const ctx = await requirePlatformAdmin();
  const q = questionSchema.parse(dataRaw);
  const ids = new Set(q.options.map((o) => o.id));
  if (ids.size !== q.options.length) throw new Error("Le opzioni devono avere id unici.");
  if (!ids.has(q.correctOptionId)) throw new Error("La risposta corretta deve essere tra le opzioni.");

  return withTenant({ platformAdmin: true }, async (tx) => {
    if (q.id) {
      const r = await tx
        .update(quizQuestion)
        .set({ text: q.text, options: q.options, correctOptionId: q.correctOptionId })
        .where(and(eq(quizQuestion.id, q.id), eq(quizQuestion.courseId, courseId)))
        .returning({ id: quizQuestion.id });
      if (!r.length) throw new Error("Domanda inesistente.");
      await appendActivity(tx, { organizationId: PLATFORM_ORG, userId: ctx.user.id, verb: "question-updated", object: `question:${q.id}`, payload: { quizId } });
      return { id: r[0].id };
    }
    const r = await tx
      .insert(quizQuestion)
      .values({ courseId, quizId, text: q.text, options: q.options, correctOptionId: q.correctOptionId })
      .returning({ id: quizQuestion.id });
    await appendActivity(tx, { organizationId: PLATFORM_ORG, userId: ctx.user.id, verb: "question-created", object: `question:${r[0].id}`, payload: { quizId } });
    return { id: r[0].id };
  });
}

export async function deleteQuizQuestion(questionId: string): Promise<void> {
  const ctx = await requirePlatformAdmin();
  await withTenant({ platformAdmin: true }, async (tx) => {
    const [row] = await tx.select({ quizId: quizQuestion.quizId }).from(quizQuestion).where(eq(quizQuestion.id, questionId)).limit(1);
    if (!row) throw new Error("Domanda inesistente.");
    // Guard: non scendere sotto il numero di domande sorteggiate dal quiz.
    if (row.quizId) {
      const [{ n }] = await tx.select({ n: count() }).from(quizQuestion).where(eq(quizQuestion.quizId, row.quizId));
      const [qz] = await tx.select({ draw: quiz.questionsToDraw }).from(quiz).where(eq(quiz.id, row.quizId)).limit(1);
      if (qz && Number(n) - 1 < qz.draw)
        throw new Error(`Non eliminabile: il quiz sorteggia ${qz.draw} domande, ne resterebbero ${Number(n) - 1}.`);
    }
    await tx.delete(quizQuestion).where(eq(quizQuestion.id, questionId));
    await appendActivity(tx, { organizationId: PLATFORM_ORG, userId: ctx.user.id, verb: "question-deleted", object: `question:${questionId}`, payload: { quizId: row.quizId } });
  });
}
