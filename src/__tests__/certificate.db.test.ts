// Integrazione DB (Supabase) Modulo 10: predisposizione gated, emissione (PDF+storage+
// audit), verifica pubblica, revoca. Storage reale guardato da SUPABASE_SERVICE_ROLE_KEY.
// Pulizia: oggetti storage + activity_log (GUC) + enrollment/cert/user/org.

import { describe, it, expect, afterAll } from "vitest";
import { sql, and, asc, eq, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  activityLog, user, organization, enrollment, course, module, lesson, slide, quiz, quizQuestion, certificate,
} from "@/lib/db/schema";
import { firstMembershipOrgId } from "@/features/auth/guards";
import { ingestCourse } from "@/features/courses/ingest";
import { sampleCourse } from "@/features/courses/seed";
import { recordHeartbeat } from "@/features/tracking/progress";
import { startQuiz, submitQuiz } from "@/features/quiz/engine";
import {
  ensureCertificateRecord, approveCertificateById, revokeCertificateById, getCertificateByVerifyUuid,
} from "@/features/certificates/lifecycle";
import { isStorageConfigured, deleteCertificatePdf } from "@/lib/supabase/storage";
import { verifyChain } from "@/features/audit/log";

const RUN = Date.now();
const PW = "Password123!";
const createdUserIds: string[] = [];
const createdCourseIds: string[] = [];
const createdOrgIds: string[] = [];
const uploadedPaths: string[] = [];

afterAll(async () => {
  for (const p of uploadedPaths) {
    try {
      await deleteCertificatePdf(p);
    } catch {
      /* ignore */
    }
  }
  if (createdOrgIds.length) {
    await db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL app.audit_maintenance = 'on'`);
      await tx.delete(activityLog).where(inArray(activityLog.organizationId, createdOrgIds));
    });
  }
  if (createdUserIds.length) {
    await db.delete(enrollment).where(inArray(enrollment.userId, createdUserIds)); // cascade certificate/attempts/progress/heartbeat
  }
  if (createdCourseIds.length) {
    await db.delete(course).where(inArray(course.id, createdCourseIds));
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

async function completeEnrollment(enrollmentId: string, courseId: string) {
  const slides = await db
    .select({ id: slide.id, audioSeconds: slide.audioSeconds })
    .from(slide)
    .innerJoin(lesson, eq(lesson.id, slide.lessonId))
    .innerJoin(module, eq(module.id, lesson.moduleId))
    .where(eq(module.courseId, courseId))
    .orderBy(asc(slide.position));
  for (const s of slides) await driveSlide(enrollmentId, s.id, s.audioSeconds);

  const [fin] = await db.select({ id: quiz.id }).from(quiz).where(and(eq(quiz.courseId, courseId), eq(quiz.type, "final"))).limit(1);
  const started = await startQuiz(enrollmentId, fin.id);
  const qs = await db.select({ id: quizQuestion.id, correct: quizQuestion.correctOptionId }).from(quizQuestion).where(eq(quizQuestion.quizId, fin.id));
  const map = new Map(qs.map((q) => [q.id, q.correct]));
  await submitQuiz(started.attemptId, started.questions.map((q) => ({ questionId: q.id, optionId: map.get(q.id) as string })));
}

describe("Modulo 10 — certificati", () => {
  it("predisposizione gated → emissione → verifica → revoca", async () => {
    const { courseId } = await ingestCourse(sampleCourse());
    createdCourseIds.push(courseId);

    const email = `evalis-cert+${RUN}@example.test`;
    const res = await auth.api.signUpEmail({ body: { name: "Mario Rossi", email, password: PW } });
    const uid = res.user.id;
    createdUserIds.push(uid);
    const orgId = (await firstMembershipOrgId(uid))!;
    createdOrgIds.push(orgId);
    const [enr] = await db
      .insert(enrollment)
      .values({ organizationId: orgId, userId: uid, courseId, source: "manual", status: "active" })
      .returning({ id: enrollment.id });

    // requisiti non soddisfatti → nessun record
    expect(await ensureCertificateRecord(enr.id)).toBeNull();

    await completeEnrollment(enr.id, courseId);

    // ora ready → ready_for_review, idempotente
    const rec1 = await ensureCertificateRecord(enr.id);
    const rec2 = await ensureCertificateRecord(enr.id);
    expect(rec1?.status).toBe("ready_for_review");
    expect(rec2?.id).toBe(rec1?.id);
    const certId = rec1!.id;

    const requested = await db
      .select({ id: activityLog.id })
      .from(activityLog)
      .where(and(eq(activityLog.organizationId, orgId), eq(activityLog.verb, "certificate-requested")));
    expect(requested.length).toBe(1);

    if (!isStorageConfigured()) return; // storage non configurato: ci fermiamo alla predisposizione

    // approvazione staff → emissione
    const approved = await approveCertificateById(certId, uid);
    expect(approved.status).toBe("issued");

    const [c] = await db
      .select({ verifyUuid: certificate.verifyUuid, pdfPath: certificate.pdfPath, status: certificate.status, number: certificate.number })
      .from(certificate)
      .where(eq(certificate.id, certId));
    expect(c.status).toBe("issued");
    expect(c.number).toBeTruthy();
    expect(c.pdfPath).toBeTruthy();
    if (c.pdfPath) uploadedPaths.push(c.pdfPath);

    // verifica pubblica → valida
    const v = await getCertificateByVerifyUuid(c.verifyUuid);
    expect(v?.valid).toBe(true);
    expect(v?.learnerName).toBe("Mario Rossi");

    // catena audit valida (include certificate-issued)
    expect((await verifyChain(orgId)).valid).toBe(true);

    // revoca → verifica non valida
    await revokeCertificateById(certId, uid, "test");
    const v2 = await getCertificateByVerifyUuid(c.verifyUuid);
    expect(v2?.valid).toBe(false);
    expect(v2?.status).toBe("revoked");
  }, 60000);
});
