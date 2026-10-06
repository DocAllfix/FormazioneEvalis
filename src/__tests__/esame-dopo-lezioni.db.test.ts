// Esame finale solo dopo le lezioni (audit B7). Prima il server avviava l'esame a chiunque
// avesse l'iscrizione: si poteva farlo il primo giorno e leggere le domande senza studiare.
// Ora serve aver completato tutte le slide e superato i quiz intermedi (o esserne esonerati dalla
// regola non retroattiva del 06/10), esattamente come nel player. Esenti: chi ha già iniziato
// l'esame una volta e gli account revisori.

import { describe, it, expect, afterAll, beforeAll, vi } from "vitest";
import { and, asc, eq, inArray, sql } from "drizzle-orm";

let sessione: { user: { id: string; email: string; name: string }; session: { activeOrganizationId: string | null } } | null = null;
vi.mock("@/lib/auth/server", () => ({ getCurrentSession: async () => sessione }));

import { db } from "@/lib/db";
import {
  user, organization, member, course, enrollment, slide, lesson, module, quiz, quizQuestion, quizAttempt,
  slideProgress, anagraficaCertificato, activityLog,
} from "@/lib/db/schema";
import { serializeOrgMetadata } from "@/features/auth/org-metadata";
import { ingestCourse } from "@/features/courses/ingest";
import { sampleCourse } from "@/features/courses/seed";
import { startMyQuiz, getMyCourse } from "@/features/learner/actions";
import { startMyQuizAction } from "@/features/learner/server-actions";
import { submitQuiz, QuizNonDisponibile } from "@/features/quiz/engine";
import { CORREZIONE_CHECKPOINT } from "@/features/courses/checkpoint-esonero";

const RUN = Date.now();
const ORG = `esame-org-${RUN}`;
const utenti: string[] = [];
let courseId = "";
let cp = "", fin = "";
let slideIds: string[] = [];

async function discente(tag: string) {
  const id = `esame-${tag}-${RUN}`;
  utenti.push(id);
  const ora = new Date();
  await db.insert(user).values({ id, name: tag, email: `${id}@example.test`, emailVerified: true, createdAt: ora, updatedAt: ora });
  await db.insert(member).values({ id: `m-${id}`, organizationId: ORG, userId: id, role: "member", createdAt: ora });
  await db.insert(anagraficaCertificato).values({ userId: id, codiceFiscale: "RSSMRA80A01H501U", dataNascita: "1980-01-01", luogoNascita: "Roma" });
  const [e] = await db.insert(enrollment).values({ organizationId: ORG, userId: id, courseId, source: "manual", status: "active" }).returning({ id: enrollment.id });
  return { id, enr: e.id };
}
const entra = (uid: string) => {
  sessione = { user: { id: uid, email: `${uid}@example.test`, name: uid }, session: { activeOrganizationId: ORG } };
};
async function completaSlide(enr: string, quando = new Date()) {
  await db.insert(slideProgress).values(slideIds.map((slideId) => ({ enrollmentId: enr, slideId, effectiveSeconds: 40, audioCompleted: true, completedAt: quando, updatedAt: quando })));
}
async function superaCheckpoint(enr: string, userId: string) {
  const { startQuiz } = await import("@/features/quiz/engine");
  const ctx = { userId }; // come il discente vero: vale anche con RLS_FORCE_ROLE=app_rls
  const s = await startQuiz(enr, cp, ctx);
  const banca = await db.select({ id: quizQuestion.id, ok: quizQuestion.correctOptionId }).from(quizQuestion).where(eq(quizQuestion.quizId, cp));
  const giusta = new Map(banca.map((q) => [q.id, q.ok as string]));
  const r = await submitQuiz(s.attemptId, s.questions.map((q) => ({ questionId: q.id, optionId: giusta.get(q.id)! })), ctx);
  expect(r.passed).toBe(true);
}

beforeAll(async () => {
  await db.insert(organization).values({ id: ORG, name: ORG, slug: ORG, createdAt: new Date(), metadata: serializeOrgMetadata({ type: "company", seatLimit: 50 }) });
  ({ courseId } = await ingestCourse({ ...sampleCourse(), title: `Corso esame ${RUN}` }));
  const qs = await db.select({ id: quiz.id, type: quiz.type }).from(quiz).where(eq(quiz.courseId, courseId));
  cp = qs.find((q) => q.type === "checkpoint")!.id;
  fin = qs.find((q) => q.type === "final")!.id;
  slideIds = (
    await db.select({ id: slide.id }).from(slide).innerJoin(lesson, eq(lesson.id, slide.lessonId)).innerJoin(module, eq(module.id, lesson.moduleId))
      .where(eq(module.courseId, courseId)).orderBy(asc(slide.position))
  ).map((s) => s.id);
});

afterAll(async () => {
  delete process.env.PLAYER_REVIEWER_USER_IDS;
  if (utenti.length) await db.delete(enrollment).where(inArray(enrollment.userId, utenti));
  if (courseId) await db.delete(course).where(eq(course.id, courseId));
  await db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL app.audit_maintenance = 'on'`);
    await tx.delete(activityLog).where(eq(activityLog.organizationId, ORG));
  });
  await db.delete(organization).where(eq(organization.id, ORG));
  if (utenti.length) await db.delete(user).where(inArray(user.id, utenti));
});

const tentativiEsame = async (enr: string) =>
  (await db.select({ id: quizAttempt.id }).from(quizAttempt).where(and(eq(quizAttempt.enrollmentId, enr), eq(quizAttempt.quizId, fin)))).length;

describe("esame finale — si apre solo a percorso completato", () => {
  it("nessuna slide vista: esame rifiutato, con un messaggio che dice cosa manca; nessun tentativo creato", async () => {
    const d = await discente("zero");
    entra(d.id);
    await expect(startMyQuiz(d.enr, fin)).rejects.toBeInstanceOf(QuizNonDisponibile);
    const r = await startMyQuizAction(d.enr, fin);
    expect(r.ok).toBe(false);
    expect(r.ok ? "" : r.errore).toMatch(/2 unità/);
    expect(await tentativiEsame(d.enr)).toBe(0);
  });

  it("slide completate ma quiz intermedio non superato: rifiutato, e il messaggio nomina il quiz", async () => {
    const d = await discente("senzacp");
    await completaSlide(d.enr);
    entra(d.id);
    const r = await startMyQuizAction(d.enr, fin);
    expect(r.ok ? "" : r.errore).toMatch(/Checkpoint 1/);
    expect(await tentativiEsame(d.enr)).toBe(0);
  });

  it("slide completate e quiz intermedio superato: l'esame si apre", async () => {
    const d = await discente("completo");
    await completaSlide(d.enr);
    await superaCheckpoint(d.enr, d.id);
    entra(d.id);
    const r = await startMyQuizAction(d.enr, fin);
    expect(r.ok).toBe(true);
    expect(await tentativiEsame(d.enr)).toBe(1);
  });

  it("quiz intermedio ESONERATO (esame iniziato prima della correzione del 06/10): l'esame si apre, e il player lo mostra esonerato", async () => {
    const d = await discente("esonerato");
    await completaSlide(d.enr, new Date(CORREZIONE_CHECKPOINT.getTime() - 3600_000));
    await db.insert(quizAttempt).values({ enrollmentId: d.enr, quizId: fin, startedAt: new Date(CORREZIONE_CHECKPOINT.getTime() - 60_000), submittedAt: new Date(CORREZIONE_CHECKPOINT.getTime() - 30_000), passed: false, score: 0 });
    entra(d.id);
    const player = await getMyCourse(d.enr);
    expect(player.quizzes.find((q) => q.id === cp)).toMatchObject({ passed: false, esonerato: true });
    expect((await startMyQuizAction(d.enr, fin)).ok).toBe(true);
  });

  it("chi ha già iniziato l'esame una volta resta libero di rifarlo (non retroattivo)", async () => {
    const d = await discente("giainiziato");
    await db.insert(quizAttempt).values({ enrollmentId: d.enr, quizId: fin, startedAt: new Date(Date.now() - 7200_000), submittedAt: new Date(Date.now() - 7100_000), passed: false, score: 0 });
    entra(d.id);
    expect((await startMyQuizAction(d.enr, fin)).ok).toBe(true);
  });

  it("account revisore: esente", async () => {
    const d = await discente("revisore");
    process.env.PLAYER_REVIEWER_USER_IDS = d.id;
    entra(d.id);
    expect((await startMyQuizAction(d.enr, fin)).ok).toBe(true);
    delete process.env.PLAYER_REVIEWER_USER_IDS;
  });

  it("il player vede gli stessi dati di prima: slide, quiz, superati ed esonerati", async () => {
    const d = await discente("player");
    await completaSlide(d.enr);
    entra(d.id);
    const p = await getMyCourse(d.enr);
    expect(p.slides.map((s) => [s.id, s.completed])).toEqual(slideIds.map((id) => [id, true]));
    expect(p.quizzes.map((q) => ({ id: q.id, type: q.type, passed: q.passed, esonerato: q.esonerato }))).toEqual([
      { id: cp, type: "checkpoint", passed: false, esonerato: false },
      { id: fin, type: "final", passed: false, esonerato: false },
    ]);
    expect(p.timer).toEqual({ effectiveSeconds: 80, requiredSeconds: 60 });
  });
});
