// Due consegne simultanee dello stesso tentativo: ne vale una sola. Prima entrambe leggevano il
// tentativo "non ancora inviato", venivano valutate tutte e due e il registro riceveva due esiti
// (e la seconda poteva sovrascrivere la prima, per esempio una bocciatura dopo una promozione).

import { describe, it, expect, afterAll } from "vitest";
import { and, eq, inArray, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user, organization, enrollment, course, quiz, quizQuestion, quizAttempt, activityLog } from "@/lib/db/schema";
import { firstMembershipOrgId } from "@/features/auth/guards";
import { ingestCourse } from "@/features/courses/ingest";
import { sampleCourse } from "@/features/courses/seed";
import { startQuiz, submitQuiz } from "@/features/quiz/engine";

const RUN = Date.now();
const userIds: string[] = [];
const orgIds: string[] = [];
const courseIds: string[] = [];

afterAll(async () => {
  if (userIds.length) await db.delete(enrollment).where(inArray(enrollment.userId, userIds));
  if (courseIds.length) await db.delete(course).where(inArray(course.id, courseIds));
  if (orgIds.length) {
    await db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL app.audit_maintenance = 'on'`);
      await tx.delete(activityLog).where(inArray(activityLog.organizationId, orgIds));
    });
  }
  if (userIds.length) {
    await db.delete(organization).where(inArray(organization.slug, userIds.map((id) => `u-${id}`)));
    await db.delete(user).where(inArray(user.id, userIds));
  }
});

describe("quiz — doppio invio dello stesso tentativo", () => {
  it("ne vale uno solo, un solo esito nel registro, lo stato è quello del vincitore", async () => {
    const { courseId } = await ingestCourse(sampleCourse());
    courseIds.push(courseId);
    const r = await auth.api.signUpEmail({ body: { name: "Doppio", email: `quiz-doppio+${RUN}@example.test`, password: "Password-123!" } });
    userIds.push(r.user.id);
    const orgId = (await firstMembershipOrgId(r.user.id))!;
    orgIds.push(orgId);
    const [enr] = await db
      .insert(enrollment)
      .values({ organizationId: orgId, userId: r.user.id, courseId, source: "manual", status: "active" })
      .returning({ id: enrollment.id });
    const ctx = { userId: r.user.id }; // come il discente vero: vale anche con RLS_FORCE_ROLE=app_rls

    // checkpoint: 1 domanda, soglia 100, nessuna attesa → si può ripetere subito
    const [cp] = await db.select({ id: quiz.id }).from(quiz).where(and(eq(quiz.courseId, courseId), eq(quiz.type, "checkpoint")));
    const banca = await db.select({ id: quizQuestion.id, ok: quizQuestion.correctOptionId }).from(quizQuestion).where(eq(quizQuestion.quizId, cp.id));
    const giusta = new Map(banca.map((q) => [q.id, q.ok as string]));

    const RIPETIZIONI = 10;
    for (let i = 0; i < RIPETIZIONI; i++) {
      const s = await startQuiz(enr.id, cp.id, ctx);
      const q = s.questions[0];
      const sbagliata = (q.options as { id: string }[]).map((o) => o.id).find((id) => id !== giusta.get(q.id))!;
      // una consegna giusta e una sbagliata in parallelo
      const esiti = await Promise.allSettled([
        submitQuiz(s.attemptId, [{ questionId: q.id, optionId: giusta.get(q.id)! }], ctx),
        submitQuiz(s.attemptId, [{ questionId: q.id, optionId: sbagliata }], ctx),
      ]);
      const riuscite = esiti.filter((e) => e.status === "fulfilled");
      const rifiutate = esiti.filter((e) => e.status === "rejected") as PromiseRejectedResult[];
      expect(riuscite).toHaveLength(1);
      expect(rifiutate).toHaveLength(1);
      expect(String(rifiutate[0].reason?.message)).toContain("già inviato");

      const vincitore = (riuscite[0] as PromiseFulfilledResult<{ passed: boolean }>).value;
      const [riga] = await db.select({ passed: quizAttempt.passed }).from(quizAttempt).where(eq(quizAttempt.id, s.attemptId));
      expect(riga.passed).toBe(vincitore.passed);
    }

    const esitiNelRegistro = await db
      .select({ id: activityLog.id })
      .from(activityLog)
      .where(and(eq(activityLog.organizationId, orgId), eq(activityLog.object, `quiz:${cp.id}`), inArray(activityLog.verb, ["passed", "failed"])));
    expect(esitiNelRegistro).toHaveLength(RIPETIZIONI);
  }, 120_000);
});
