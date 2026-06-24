// Integrazione DB (Supabase) Step 3: ingestione + validazione monte-ore, tracciamento
// server (completamento slide), quiz (random/correzione/passaggio), readiness certificato.
// Scrive su DB reale con suffisso univoco e ripulisce in afterAll.

import { describe, it, expect, afterAll } from "vitest";
import { and, eq, inArray, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  user, organization, enrollment, course, module, lesson, slide, quiz, quizQuestion,
} from "@/lib/db/schema";
import { firstMembershipOrgId } from "@/features/auth/guards";
import { ingestCourse } from "@/features/courses/ingest";
import { sampleCourse } from "@/features/courses/seed";
import { recordHeartbeat, isSlideCompleted } from "@/features/tracking/progress";
import { startQuiz, submitQuiz, isQuizPassed } from "@/features/quiz/engine";
import { isReadyForCertificate } from "@/features/certificates/readiness";

const RUN = Date.now();
const PW = "Password123!";
const createdUserIds: string[] = [];
const createdCourseIds: string[] = [];

afterAll(async () => {
  if (createdUserIds.length) {
    await db.delete(enrollment).where(inArray(enrollment.userId, createdUserIds)); // cascade attempts/progress/heartbeat
  }
  if (createdCourseIds.length) {
    await db.delete(course).where(inArray(course.id, createdCourseIds)); // cascade module/lesson/slide/quiz/question
  }
  if (createdUserIds.length) {
    await db.delete(organization).where(inArray(organization.slug, createdUserIds.map((id) => `u-${id}`)));
    await db.delete(user).where(inArray(user.id, createdUserIds));
  }
});

async function driveSlide(enrollmentId: string, slideId: string, audioSeconds: number) {
  let t = Date.now();
  let pos = 0;
  await recordHeartbeat({ enrollmentId, slideId, position: 0, focus: true, playing: true, nowMs: t });
  while (pos < audioSeconds) {
    const step = Math.min(12, audioSeconds - pos);
    pos += step;
    t += step * 1000;
    await recordHeartbeat({ enrollmentId, slideId, position: pos, focus: true, playing: true, audioCompleted: pos >= audioSeconds, nowMs: t });
  }
}

async function answerCorrectly(quizId: string, attemptId: string, questions: { id: string }[]) {
  const qs = await db.select({ id: quizQuestion.id, correct: quizQuestion.correctOptionId }).from(quizQuestion).where(eq(quizQuestion.quizId, quizId));
  const map = new Map(qs.map((q) => [q.id, q.correct]));
  const answers = questions.map((q) => ({ questionId: q.id, optionId: map.get(q.id) as string }));
  return submitQuiz(attemptId, answers);
}

describe("Step 3 — integrazione DB", () => {
  it("ingestione: rifiuta sotto monte-ore, accetta corso conforme", async () => {
    await expect(ingestCourse({ ...sampleCourse(), requiredMinutes: 999 })).rejects.toThrow();

    const { courseId } = await ingestCourse(sampleCourse());
    createdCourseIds.push(courseId);

    const slides = await db
      .select({ id: slide.id })
      .from(slide)
      .innerJoin(lesson, eq(lesson.id, slide.lessonId))
      .innerJoin(module, eq(module.id, lesson.moduleId))
      .where(eq(module.courseId, courseId));
    expect(slides.length).toBe(2);

    const quizzes = await db.select({ type: quiz.type }).from(quiz).where(eq(quiz.courseId, courseId));
    expect(quizzes.length).toBe(2); // checkpoint + final
  });

  it("flusso completo: slide → checkpoint → esame → readiness", async () => {
    // corso
    const { courseId } = await ingestCourse(sampleCourse());
    createdCourseIds.push(courseId);

    // utente + enrollment
    const res = await auth.api.signUpEmail({ body: { name: "Learner", email: `evalis-s3+${RUN}@example.test`, password: PW } });
    const uid = res.user.id;
    createdUserIds.push(uid);
    const orgId = (await firstMembershipOrgId(uid))!;
    const [enr] = await db.insert(enrollment).values({ organizationId: orgId, userId: uid, courseId, source: "manual", status: "active" }).returning({ id: enrollment.id });
    const enrollmentId = enr.id;

    // completa tutte le slide
    const slides = await db
      .select({ id: slide.id, audioSeconds: slide.audioSeconds })
      .from(slide)
      .innerJoin(lesson, eq(lesson.id, slide.lessonId))
      .innerJoin(module, eq(module.id, lesson.moduleId))
      .where(eq(module.courseId, courseId))
      .orderBy(asc(slide.position));
    for (const s of slides) {
      await driveSlide(enrollmentId, s.id, s.audioSeconds);
      expect(await isSlideCompleted(enrollmentId, s.id)).toBe(true);
    }

    // checkpoint quiz superato
    const [cp] = await db.select({ id: quiz.id }).from(quiz).where(and(eq(quiz.courseId, courseId), eq(quiz.type, "checkpoint"))).limit(1);
    const startedCp = await startQuiz(enrollmentId, cp.id);
    expect(startedCp.questions.length).toBe(1); // questionsToDraw=1
    expect((startedCp.questions[0] as { correctOptionId?: string }).correctOptionId).toBeUndefined(); // niente risposte
    const cpRes = await answerCorrectly(cp.id, startedCp.attemptId, startedCp.questions);
    expect(cpRes.passed).toBe(true);

    // esame finale superato
    const [fin] = await db.select({ id: quiz.id }).from(quiz).where(and(eq(quiz.courseId, courseId), eq(quiz.type, "final"))).limit(1);
    const startedFin = await startQuiz(enrollmentId, fin.id);
    expect(startedFin.questions.length).toBe(2); // draw 2 di 3
    const finRes = await answerCorrectly(fin.id, startedFin.attemptId, startedFin.questions);
    expect(finRes.passed).toBe(true);
    expect(await isQuizPassed(enrollmentId, fin.id)).toBe(true);

    // readiness certificato
    const readiness = await isReadyForCertificate(enrollmentId);
    expect(readiness.ready).toBe(true);
  });

  it("antifrode: un solo heartbeat 'clip finita' NON completa (zero tempo effettivo)", async () => {
    const { courseId } = await ingestCourse(sampleCourse());
    createdCourseIds.push(courseId);
    const res = await auth.api.signUpEmail({ body: { name: "Fraud", email: `evalis-fraud+${RUN}@example.test`, password: PW } });
    const uid = res.user.id;
    createdUserIds.push(uid);
    const orgId = (await firstMembershipOrgId(uid))!;
    const [enr] = await db
      .insert(enrollment)
      .values({ organizationId: orgId, userId: uid, courseId, source: "manual", status: "active" })
      .returning({ id: enrollment.id });

    const [s] = await db
      .select({ id: slide.id, audioSeconds: slide.audioSeconds })
      .from(slide)
      .innerJoin(lesson, eq(lesson.id, slide.lessonId))
      .innerJoin(module, eq(module.id, lesson.moduleId))
      .where(eq(module.courseId, courseId))
      .orderBy(asc(slide.position))
      .limit(1);

    // Tentativo di completamento istantaneo: dichiaro la clip finita alla durata piena,
    // senza alcun tempo reale accreditato. Il server (wall-time) non accredita nulla.
    const t = Date.now();
    const r1 = await recordHeartbeat({ enrollmentId: enr.id, slideId: s.id, position: s.audioSeconds, focus: true, playing: true, audioCompleted: true, nowMs: t });
    expect(r1.effectiveSeconds).toBe(0);
    expect(r1.completed).toBe(false);

    // Secondo ping che prova a "incollare" la posizione alla fine in mezzo secondo → niente credito utile.
    const r2 = await recordHeartbeat({ enrollmentId: enr.id, slideId: s.id, position: s.audioSeconds, focus: true, playing: true, audioCompleted: true, nowMs: t + 500 });
    expect(r2.completed).toBe(false);
    expect(await isSlideCompleted(enr.id, s.id)).toBe(false);
  });
});
