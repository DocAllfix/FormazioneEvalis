// Verifica END-TO-END del routing RLS: gira SOLO con RLS_FORCE_ROLE=app_rls (altrimenti
// skip). Il seeding usa il `db` grezzo (ruolo connessione = bypass); le funzioni instradate
// passano per withTenant che, col flag, assume `app_rls` (NOBYPASSRLS) → la RLS è ATTIVA.
// Prova: (a) la pipeline discente+staff funziona con il ctx corretto; (b) il cross-tenant è
// NEGATO davvero (un altro utente non vede/usa l'enrollment altrui).

import { describe, it, expect, afterAll, vi } from "vitest";

// le mail del certificato provvisorio non partono durante i test
vi.mock("@/lib/email/resend", async (orig) => ({
  ...(await orig<typeof import("@/lib/email/resend")>()),
  inviaEmailConAllegati: vi.fn(async () => ({ sent: true })),
}));
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
import { ensureCertificateRecord, getCertificatoPerChiave, certificatoPerDownload } from "@/features/certificates/lifecycle";
import { deleteCertificatePdf } from "@/lib/supabase/storage";
import { salvaAnagrafica, leggiAnagrafica } from "@/features/certificates/anagrafica";

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

  it("pipeline discente + certificato provvisorio + verifica pubblica sotto RLS", async () => {
    const { courseId } = await ingestCourse(sampleCourse());
    courseIds.push(courseId);
    const C = await mkLearner("C");
    const [eC] = await db.insert(enrollment).values({ organizationId: C.orgId, userId: C.uid, courseId, source: "manual", status: "active" }).returning({ id: enrollment.id });

    // prima del completamento: niente certificato (readiness sotto ctx proprio)
    expect(await ensureCertificateRecord(eC.id, { userId: C.uid })).toBeNull();

    await completeAs(eC.id, courseId, C.uid);

    const rec = await ensureCertificateRecord(eC.id, { userId: C.uid });
    expect(rec?.status).toBe("ready_for_review");

    expect(rec?.number).toMatch(/^EVALIS-/);

    // il provvisorio: lo scarica il proprietario (sotto RLS), non un altro utente
    const D = await mkLearner("D");

    // dati per il certificato sotto RLS: ognuno vede solo i propri, lo staff tutti
    await salvaAnagrafica(D.uid, { codiceFiscale: "RSSMRA80A01H501U", dataNascita: "1980-01-01", luogoNascita: "Roma" });
    expect((await leggiAnagrafica(D.uid))?.luogoNascita).toBe("Roma");
    expect(await leggiAnagrafica(D.uid, { userId: C.uid })).toBeNull();
    expect((await leggiAnagrafica(D.uid, { platformAdmin: true }))?.luogoNascita).toBe("Roma");
    expect((await certificatoPerDownload(rec!.id, { userId: C.uid, staff: false }))?.tipo).toBe("provvisorio");
    expect(await certificatoPerDownload(rec!.id, { userId: D.uid, staff: false })).toBeNull();

    // verifica pubblica (funzione SECURITY DEFINER), per QR e per numero
    const [cc] = await db.select({ verifyUuid: certificate.verifyUuid }).from(certificate).where(eq(certificate.id, rec!.id));
    for (const chiave of [cc.verifyUuid, rec!.number!]) {
      const v = await getCertificatoPerChiave(chiave);
      expect(v?.provvisorio).toBe(true);
      expect(v?.learnerName).toBe("C");
    }
  }, 90000);
});
