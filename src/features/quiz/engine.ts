// Quiz engine a norma — correzione SERVER-AUTHORITATIVE. Estrae domande casuali
// dalla banca, applica il limite di tempo sull'intero quiz, la soglia, il cooldown.
// Le risposte corrette non lasciano mai il server.

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { quiz, quizQuestion, quizAttempt } from "@/lib/db/schema";
import { appendActivity, auditContextFromEnrollment } from "@/features/audit/log";

// --- Logica pura (testabile) ---

export function isOverTimeLimit(startedAtMs: number, nowMs: number, timeLimitSeconds: number): boolean {
  if (timeLimitSeconds <= 0) return false;
  return (nowMs - startedAtMs) / 1000 > timeLimitSeconds;
}

export function gradeAnswers(
  drawn: { id: string; correctOptionId: string }[],
  answers: { questionId: string; optionId: string }[],
): { score: number; correctCount: number; total: number } {
  const map = new Map(answers.map((a) => [a.questionId, a.optionId]));
  let correct = 0;
  for (const q of drawn) if (map.get(q.id) === q.correctOptionId) correct++;
  const total = drawn.length;
  const score = total === 0 ? 0 : Math.round((correct / total) * 100);
  return { score, correctCount: correct, total };
}

function shuffleTake<T>(arr: T[], n: number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

// --- Operazioni ---

export async function startQuiz(enrollmentId: string, quizId: string) {
  const [qz] = await db.select().from(quiz).where(eq(quiz.id, quizId)).limit(1);
  if (!qz) throw new Error("Quiz inesistente.");

  const attempts = await db
    .select({ lockedUntil: quizAttempt.lockedUntil })
    .from(quizAttempt)
    .where(and(eq(quizAttempt.enrollmentId, enrollmentId), eq(quizAttempt.quizId, quizId)));
  const now = new Date();
  if (qz.maxAttempts != null && attempts.length >= qz.maxAttempts) {
    throw new Error("Numero massimo di tentativi raggiunto.");
  }
  if (attempts.some((a) => a.lockedUntil && a.lockedUntil > now)) {
    throw new Error("Quiz in cooldown: riprova più tardi.");
  }

  const bank = await db
    .select({ id: quizQuestion.id, text: quizQuestion.text, options: quizQuestion.options })
    .from(quizQuestion)
    .where(eq(quizQuestion.quizId, quizId));
  if (bank.length < qz.questionsToDraw) throw new Error("Banca domande insufficiente.");

  const drawn = shuffleTake(bank, qz.questionsToDraw);
  const drawnIds = drawn.map((q) => q.id);

  const attemptId = await db.transaction(async (tx) => {
    const [attempt] = await tx
      .insert(quizAttempt)
      .values({ enrollmentId, quizId, startedAt: now, detail: { drawnIds } })
      .returning({ id: quizAttempt.id });
    const { organizationId, userId } = await auditContextFromEnrollment(tx, enrollmentId);
    await appendActivity(tx, {
      organizationId,
      userId,
      verb: "initialized",
      object: `quiz:${quizId}`,
      payload: { attemptId: attempt.id },
    });
    return attempt.id;
  });

  // SENZA risposte corrette
  return {
    attemptId,
    timeLimitSeconds: qz.timeLimitSeconds,
    questions: drawn.map((q) => ({ id: q.id, text: q.text, options: q.options })),
  };
}

export async function submitQuiz(
  attemptId: string,
  answers: { questionId: string; optionId: string }[],
) {
  const [att] = await db.select().from(quizAttempt).where(eq(quizAttempt.id, attemptId)).limit(1);
  if (!att) throw new Error("Tentativo inesistente.");
  if (att.submittedAt) throw new Error("Tentativo già inviato.");
  if (!att.quizId || !att.startedAt) throw new Error("Tentativo non valido.");

  const [qz] = await db.select().from(quiz).where(eq(quiz.id, att.quizId)).limit(1);
  if (!qz) throw new Error("Quiz inesistente.");

  const now = new Date();
  const over = isOverTimeLimit(att.startedAt.getTime(), now.getTime(), qz.timeLimitSeconds);

  const drawnIds = (att.detail as { drawnIds?: string[] } | null)?.drawnIds ?? [];
  const drawn = drawnIds.length
    ? await db
        .select({ id: quizQuestion.id, correctOptionId: quizQuestion.correctOptionId })
        .from(quizQuestion)
        .where(inArray(quizQuestion.id, drawnIds))
    : [];

  const graded = over ? { score: 0, correctCount: 0, total: drawn.length } : gradeAnswers(drawn, answers);
  const passed = !over && graded.score >= qz.passThreshold;
  const lockedUntil = passed ? null : new Date(now.getTime() + qz.cooldownSeconds * 1000);

  await db.transaction(async (tx) => {
    await tx
      .update(quizAttempt)
      .set({ score: graded.score, passed, submittedAt: now, lockedUntil, detail: { drawnIds, answers, over } })
      .where(eq(quizAttempt.id, attemptId));
    const { organizationId, userId } = await auditContextFromEnrollment(tx, att.enrollmentId);
    await appendActivity(tx, {
      organizationId,
      userId,
      verb: passed ? "passed" : "failed",
      object: `quiz:${att.quizId}`,
      payload: { score: graded.score, over },
    });
  });

  return { score: graded.score, passed, over };
}

/** Un quiz risulta superato se esiste almeno un tentativo passato (checkpoint/esame). */
export async function isQuizPassed(enrollmentId: string, quizId: string): Promise<boolean> {
  const [a] = await db
    .select({ id: quizAttempt.id })
    .from(quizAttempt)
    .where(
      and(
        eq(quizAttempt.enrollmentId, enrollmentId),
        eq(quizAttempt.quizId, quizId),
        eq(quizAttempt.passed, true),
      ),
    )
    .limit(1);
  return !!a;
}
