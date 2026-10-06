// Quiz engine a norma — correzione SERVER-AUTHORITATIVE. Estrae domande casuali
// dalla banca, applica il limite di tempo sull'intero quiz, la soglia, il cooldown.
// Le risposte corrette non lasciano mai il server.

import { and, eq, gt, inArray, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { quiz, quizQuestion, quizAttempt } from "@/lib/db/schema";
import { appendActivity, auditContextFromEnrollment } from "@/features/audit/log";
import { withTenant, type TenantCtx } from "@/lib/db/tenant";
import { oraRoma } from "@/lib/formato";
import { ErroreUtente } from "@/lib/esito";

/**
 * Blocco PREVISTO dalle regole del quiz (attesa dopo un tentativo non superato, tentativi
 * esauriti). Il messaggio è per lo studente: la server action lo restituisce come valore,
 * perché in produzione Next sostituisce il messaggio delle eccezioni con uno generico.
 */
export class QuizNonDisponibile extends Error {}

// Executor: db globale OPPURE una transazione (per ereditare le GUC di tenant da withTenant).
type DbOrTx = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

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

/** Un solo passaggio alla volta per (iscrizione, quiz): avvio e consegna si mettono in fila,
 *  così il controllo dell'attesa non può essere scavalcato da due richieste simultanee. */
function lucchettoQuiz(enrollmentId: string, quizId: string) {
  return sql`SELECT pg_advisory_xact_lock(hashtext(${`quiz:${enrollmentId}:${quizId}`}))`;
}

export async function startQuiz(enrollmentId: string, quizId: string, ctx: TenantCtx = {}) {
  return withTenant(ctx, async (tx) => {
    await tx.execute(lucchettoQuiz(enrollmentId, quizId));
    const [qz] = await tx.select().from(quiz).where(eq(quiz.id, quizId)).limit(1);
    if (!qz) throw new Error("Quiz inesistente.");

    const attempts = await tx
      .select({ lockedUntil: quizAttempt.lockedUntil })
      .from(quizAttempt)
      .where(and(eq(quizAttempt.enrollmentId, enrollmentId), eq(quizAttempt.quizId, quizId)));
    const now = new Date();
    if (qz.maxAttempts != null && attempts.length >= qz.maxAttempts) {
      throw new QuizNonDisponibile("Hai esaurito i tentativi disponibili per questo quiz.");
    }
    const attesa = attempts
      .map((a) => a.lockedUntil)
      .filter((d): d is Date => !!d && d > now)
      .sort((a, b) => b.getTime() - a.getTime())[0];
    if (attesa) {
      throw new QuizNonDisponibile(
        `Il tentativo precedente non è stato superato: potrai riprovare dalle ${oraRoma(attesa)}.`,
      );
    }

    const bank = await tx
      .select({ id: quizQuestion.id, text: quizQuestion.text, options: quizQuestion.options })
      .from(quizQuestion)
      .where(eq(quizQuestion.quizId, quizId));
    if (bank.length < qz.questionsToDraw) throw new Error("Banca domande insufficiente.");

    const drawn = shuffleTake(bank, qz.questionsToDraw);
    const drawnIds = drawn.map((q) => q.id);

    // insert tentativo + audit (già nell'unica tx → atomici)
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

    // SENZA risposte corrette
    return {
      attemptId: attempt.id,
      timeLimitSeconds: qz.timeLimitSeconds,
      questions: drawn.map((q) => ({ id: q.id, text: q.text, options: q.options })),
    };
  });
}

export async function submitQuiz(
  attemptId: string,
  answers: { questionId: string; optionId: string }[],
  ctx: TenantCtx = {},
) {
  return withTenant(ctx, async (tx) => {
    // FOR UPDATE: una seconda consegna simultanea dello stesso tentativo aspetta questa e poi
    // trova submittedAt già pieno, invece di essere valutata anche lei
    const [att] = await tx.select().from(quizAttempt).where(eq(quizAttempt.id, attemptId)).limit(1).for("update");
    if (!att) throw new Error("Tentativo inesistente.");
    if (att.submittedAt) throw new ErroreUtente("Tentativo già inviato.");
    if (!att.quizId || !att.startedAt) throw new Error("Tentativo non valido.");

    const [qz] = await tx.select().from(quiz).where(eq(quiz.id, att.quizId)).limit(1);
    if (!qz) throw new Error("Quiz inesistente.");

    // L'attesa dopo una bocciatura vale anche per i tentativi aperti PRIMA della bocciatura
    // (due schede): finché un altro tentativo dello stesso quiz è in attesa, questo non si
    // consegna. Resta aperto: si consegna ad attesa finita, o se ne avvia uno nuovo.
    // Aprire un tentativo non viene mai bloccato da qui: chi ricarica la pagina non resta fermo.
    await tx.execute(lucchettoQuiz(att.enrollmentId, att.quizId));
    const now = new Date();
    const [inAttesa] = await tx
      .select({ fino: quizAttempt.lockedUntil })
      .from(quizAttempt)
      .where(
        and(
          eq(quizAttempt.enrollmentId, att.enrollmentId),
          eq(quizAttempt.quizId, att.quizId),
          ne(quizAttempt.id, attemptId),
          gt(quizAttempt.lockedUntil, now),
        ),
      )
      .orderBy(sql`${quizAttempt.lockedUntil} desc`)
      .limit(1);
    if (inAttesa?.fino) {
      throw new ErroreUtente(`Il tentativo precedente non è stato superato: potrai riprovare dalle ${oraRoma(inAttesa.fino)}.`);
    }

    const over = isOverTimeLimit(att.startedAt.getTime(), now.getTime(), qz.timeLimitSeconds);

    const drawnIds = (att.detail as { drawnIds?: string[] } | null)?.drawnIds ?? [];
    const drawn = drawnIds.length
      ? await tx
          .select({ id: quizQuestion.id, correctOptionId: quizQuestion.correctOptionId })
          .from(quizQuestion)
          .where(inArray(quizQuestion.id, drawnIds))
      : [];

    const graded = over ? { score: 0, correctCount: 0, total: drawn.length } : gradeAnswers(drawn, answers);
    const passed = !over && graded.score >= qz.passThreshold;
    const lockedUntil = passed ? null : new Date(now.getTime() + qz.cooldownSeconds * 1000);

    // update tentativo + audit (già nell'unica tx → atomici)
    const aggiornati = await tx
      .update(quizAttempt)
      .set({ score: graded.score, passed, submittedAt: now, lockedUntil, detail: { drawnIds, answers, over } })
      .where(and(eq(quizAttempt.id, attemptId), isNull(quizAttempt.submittedAt)))
      .returning({ id: quizAttempt.id });
    if (aggiornati.length !== 1) throw new ErroreUtente("Tentativo già inviato.");
    const { organizationId, userId } = await auditContextFromEnrollment(tx, att.enrollmentId);
    await appendActivity(tx, {
      organizationId,
      userId,
      verb: passed ? "passed" : "failed",
      object: `quiz:${att.quizId}`,
      payload: { score: graded.score, over },
    });

    return { score: graded.score, passed, over, lockedUntil };
  });
}

/** Un quiz risulta superato se esiste almeno un tentativo passato (checkpoint/esame).
 * `exec` opzionale: l'entry-point che apre withTenant passa il proprio tx (lettura
 * sotto le GUC di tenant, una sola transazione). */
export async function isQuizPassed(
  enrollmentId: string,
  quizId: string,
  exec: DbOrTx = db,
): Promise<boolean> {
  const [a] = await exec
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
