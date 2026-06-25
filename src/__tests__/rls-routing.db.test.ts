// Verifica END-TO-END del routing RLS: gira SOLO con RLS_FORCE_ROLE=app_rls (altrimenti
// skip). Il seeding usa il `db` grezzo (ruolo connessione = bypass); le funzioni instradate
// passano per withTenant che, col flag, assume `app_rls` (NOBYPASSRLS) → la RLS è ATTIVA.
// Prova: (a) la pipeline discente+staff funziona con il ctx corretto; (b) il cross-tenant è
// NEGATO davvero (un altro utente non vede/usa l'enrollment altrui).

import { describe, it, expect, afterAll } from "vitest";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  activityLog, user, organization, enrollment, course, module as courseModule, lesson, slide, quiz, quizQuestion, certificate,
} from "@/lib/db/schema";
import { firstMembershipOrgId } from "@/features/auth/guards";
import { ingestCourse } from "@/features/courses/ingest";
import { sampleCourse } from "@/features/courses/seed";
import { recordHeartbeat } from "@/features/tracking/progress";
import { startQuiz, submitQuiz } from "@/features/quiz/engine";
import { getCourseForPlayer } from "@/features/courses/get-course-for-player";
import { ensureCertificateRecord, approveCertificateById, getCertificateByVerifyUuid } from "@/features/certificates/lifecycle";
import { isStorageConfigured, deleteCertificatePdf } from "@/lib/supabase/storage";

const FORCED = process.env.RLS_FORCE_ROLE === "app_rls";
const RUN = Date.now();
const PW = "Password123!";
const userIds: string[] = [];
const courseIds: string[] = [];
const orgIds: string[] = [];
const uploadedPaths: string[] = [];

afterAll(async () => {
  for (const p of uploadedPaths) {
    try { await deleteCertificatePdf(p); } catch { /* ignore */ }
  }
  if (orgIds.length) {
    await db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL app.audit_maintenance = 'on'`);
      await tx.delete(activityLog).where(inArray(activityLog.organizationId, orgIds));
    });
  }
  if (userIds.length) await db.delete(enrollment).where(inArray(enrollment.userId, userIds));
  if (courseIds.length) await db.delete(course).where(inArray(course.id, courseIds));
  if (userIds.length) {
    await db.delete(organization).where(inArray(organization.slug, userIds.map((id) => `u-${id}`)));
    await db.delete(user).where(inArray(user.id, userIds));
  }
});

async function mkLearner(tag: string) {
  const res = await auth.api.signUpEmail({ body: { name: tag, email: `rlsr-${tag}+${RUN}@example.test`, password: PW } });
  const uid = res.user.id;
  userIds.push(uid);
  const orgId = (await firstMembershipOrgId(uid))!;
  orgIds.push(orgId);
  return { uid, orgId };
}

// Pipeline discente con ctx (sotto RLS): porta a termine slide + esame finale.
async function completeAs(enrollmentId: string, courseId: string, userId: string) {
  const ctx = { userId };
  const slides = await db
    .select({ id: slide.id, audioSeconds: slide.audioSeconds })
    .from(slide)
    .innerJoin(lesson, eq(lesson.id, slide.lessonId))
    .innerJoin(courseModule, eq(courseModule.id, lesson.moduleId))
    .where(eq(courseModule.courseId, courseId))
    .orderBy(asc(slide.position));
  for (const s of slides) {
    let t = Date.now();
    let pos = 0;
    await recordHeartbeat({ enrollmentId, slideId: s.id, position: 0, focus: true, playing: true, nowMs: t, ctx });
    while (pos < s.audioSeconds) {
      const step = Math.min(12, s.audioSeconds - pos);
      pos += step; t += step * 1000;
      await recordHeartbeat({ enrollmentId, slideId: s.id, position: pos, focus: true, playing: true, audioCompleted: pos >= s.audioSeconds, nowMs: t, ctx });
    }
  }
  const [fin] = await db.select({ id: quiz.id }).from(quiz).where(and(eq(quiz.courseId, courseId), eq(quiz.type, "final"))).limit(1);
  const started = await startQuiz(enrollmentId, fin.id, ctx);
  const qs = await db.select({ id: quizQuestion.id, correct: quizQuestion.correctOptionId }).from(quizQuestion).where(eq(quizQuestion.quizId, fin.id));
  const map = new Map(qs.map((q) => [q.id, q.correct]));
  await submitQuiz(started.attemptId, started.questions.map((q) => ({ questionId: q.id, optionId: map.get(q.id) as string })), ctx);
}

describe.skipIf(!FORCED)("RLS routing end-to-end (ruolo app_rls forzato)", () => {
  it("player: ctx proprio vede il corso, ctx altrui NEGATO", async () => {
    const { courseId } = await ingestCourse(sampleCourse());
    courseIds.push(courseId);
    const A = await mkLearner("A");
    const B = await mkLearner("B");
    const [eA] = await db.insert(enrollment).values({ organizationId: A.orgId, userId: A.uid, courseId, source: "manual", status: "active" }).returning({ id: enrollment.id });

    const own = await getCourseForPlayer(eA.id, { userId: A.uid });
    expect(own.slides.length).toBeGreaterThan(0); // il proprietario vede le slide

    // cross-tenant: B non vede l'enrollment di A → la funzione lancia (enrollment inesistente)
    await expect(getCourseForPlayer(eA.id, { userId: B.uid })).rejects.toThrow();
  }, 60000);

  it("pipeline discente + emissione staff + verifica pubblica sotto RLS", async () => {
    const { courseId } = await ingestCourse(sampleCourse());
    courseIds.push(courseId);
    const C = await mkLearner("C");
    const [eC] = await db.insert(enrollment).values({ organizationId: C.orgId, userId: C.uid, courseId, source: "manual", status: "active" }).returning({ id: enrollment.id });

    // prima del completamento: niente certificato (readiness sotto ctx proprio)
    expect(await ensureCertificateRecord(eC.id, { userId: C.uid })).toBeNull();

    await completeAs(eC.id, courseId, C.uid);

    const rec = await ensureCertificateRecord(eC.id, { userId: C.uid });
    expect(rec?.status).toBe("ready_for_review");

    if (!isStorageConfigured()) return;

    // emissione staff (valvola platformAdmin)
    const approved = await approveCertificateById(rec!.id, C.uid, { platformAdmin: true });
    expect(approved.status).toBe("issued");
    const [cc] = await db.select({ verifyUuid: certificate.verifyUuid, pdfPath: certificate.pdfPath }).from(certificate).where(eq(certificate.id, rec!.id));
    if (cc.pdfPath) uploadedPaths.push(cc.pdfPath);

    // verifica pubblica (funzione SECURITY DEFINER) → valida
    const v = await getCertificateByVerifyUuid(cc.verifyUuid);
    expect(v?.valid).toBe(true);
    expect(v?.learnerName).toBe("C");
  }, 90000);
});
