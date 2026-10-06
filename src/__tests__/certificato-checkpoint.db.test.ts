// Quiz intermedi obbligatori per il certificato (audit B6). Prima il certificato guardava solo
// slide, tempo ed esame finale: saltando il player si arrivava al provvisorio senza aver fatto
// nessun quiz intermedio. Ora servono tutti, tranne quelli esonerati dalla regola non
// retroattiva del 06/10 — la stessa del player.
// E soprattutto: un certificato che ESISTE GIÀ non viene mai ricontrollato né negato (in
// produzione ce n'è uno, nato con 5 quiz intermedi esonerati).

import { describe, it, expect, afterAll, beforeAll, vi } from "vitest";
import { asc, eq, inArray, sql } from "drizzle-orm";

vi.mock("@/lib/email/resend", async (orig) => ({
  ...(await orig<typeof import("@/lib/email/resend")>()),
  inviaEmailConAllegati: vi.fn(async () => ({ sent: false })), // nessuna mail vera
}));

import { db } from "@/lib/db";
import {
  user, organization, member, course, enrollment, slide, lesson, module, quiz, quizAttempt,
  slideProgress, certificate, activityLog,
} from "@/lib/db/schema";
import { serializeOrgMetadata } from "@/features/auth/org-metadata";
import { ingestCourse } from "@/features/courses/ingest";
import { sampleCourse } from "@/features/courses/seed";
import { isReadyForCertificate } from "@/features/certificates/readiness";
import { ensureCertificateRecord } from "@/features/certificates/lifecycle";
import { iso19011Advisory } from "@/features/prerequisites/advisory";
import { CORREZIONE_CHECKPOINT } from "@/features/courses/checkpoint-esonero";

const RUN = Date.now();
const ORG = `certcp-org-${RUN}`;
const utenti: string[] = [];
const corsi: string[] = [];
let courseId = "", cp = "", fin = "";
let slideIds: string[] = [];
const PRIMA = new Date(CORREZIONE_CHECKPOINT.getTime() - 3600_000);

async function discente(tag: string, corso = courseId) {
  const id = `certcp-${tag}-${RUN}`;
  utenti.push(id);
  const ora = new Date();
  await db.insert(user).values({ id, name: `Nome ${tag}`, email: `${id}@example.test`, emailVerified: true, createdAt: ora, updatedAt: ora });
  await db.insert(member).values({ id: `m-${id}`, organizationId: ORG, userId: id, role: "member", createdAt: ora });
  const [e] = await db.insert(enrollment).values({ organizationId: ORG, userId: id, courseId: corso, source: "manual", status: "active" }).returning({ id: enrollment.id });
  return { id, enr: e.id };
}
const slideFatte = (enr: string, quando: Date) =>
  db.insert(slideProgress).values(slideIds.map((slideId) => ({ enrollmentId: enr, slideId, effectiveSeconds: 40, audioCompleted: true, completedAt: quando, updatedAt: quando })));
const superato = (enr: string, quizId: string, quando: Date) =>
  db.insert(quizAttempt).values({ enrollmentId: enr, quizId, startedAt: quando, submittedAt: quando, passed: true, score: 100 });

beforeAll(async () => {
  await db.insert(organization).values({ id: ORG, name: ORG, slug: ORG, createdAt: new Date(), metadata: serializeOrgMetadata({ type: "company", seatLimit: 50 }) });
  ({ courseId } = await ingestCourse({ ...sampleCourse(), title: `Corso certcp ${RUN}` }));
  corsi.push(courseId);
  const qs = await db.select({ id: quiz.id, type: quiz.type }).from(quiz).where(eq(quiz.courseId, courseId));
  cp = qs.find((q) => q.type === "checkpoint")!.id;
  fin = qs.find((q) => q.type === "final")!.id;
  slideIds = (
    await db.select({ id: slide.id }).from(slide).innerJoin(lesson, eq(lesson.id, slide.lessonId)).innerJoin(module, eq(module.id, lesson.moduleId))
      .where(eq(module.courseId, courseId)).orderBy(asc(slide.position))
  ).map((s) => s.id);
});

afterAll(async () => {
  if (utenti.length) await db.delete(enrollment).where(inArray(enrollment.userId, utenti));
  if (corsi.length) {
    await db.update(course).set({ prerequisiteCourseId: null }).where(inArray(course.id, corsi));
    await db.delete(course).where(inArray(course.id, corsi));
  }
  await db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL app.audit_maintenance = 'on'`);
    await tx.delete(activityLog).where(eq(activityLog.organizationId, ORG));
  });
  await db.delete(organization).where(eq(organization.id, ORG));
  if (utenti.length) await db.delete(user).where(inArray(user.id, utenti));
});

describe("certificato — quiz intermedi", () => {
  it("quiz intermedio saltato (percorso fatto dopo la correzione): certificato negato, con il motivo", async () => {
    const d = await discente("saltato");
    const ora = new Date();
    await slideFatte(d.enr, ora);
    await superato(d.enr, fin, ora);
    const r = await isReadyForCertificate(d.enr, { userId: d.id });
    expect(r.ready).toBe(false);
    expect(r.reasons.join(" ")).toMatch(/quiz intermedi/i);
    expect(await ensureCertificateRecord(d.enr, { userId: d.id })).toBeNull();
  });

  it("tutti i quiz superati: certificato concesso", async () => {
    const d = await discente("completo");
    const ora = new Date();
    await slideFatte(d.enr, ora);
    await superato(d.enr, cp, ora);
    await superato(d.enr, fin, ora);
    expect((await isReadyForCertificate(d.enr, { userId: d.id })).ready).toBe(true);
    expect((await ensureCertificateRecord(d.enr, { userId: d.id }))?.status).toBe("ready_for_review");
  });

  it("quiz intermedio esonerato (esame iniziato prima della correzione del 06/10): certificato concesso", async () => {
    const d = await discente("esonerato");
    await slideFatte(d.enr, PRIMA);
    await superato(d.enr, fin, PRIMA);
    expect((await isReadyForCertificate(d.enr, { userId: d.id })).ready).toBe(true);
    expect((await ensureCertificateRecord(d.enr, { userId: d.id }))?.status).toBe("ready_for_review");
  });

  it("un certificato che esiste già viene restituito invariato, anche se oggi i requisiti non risulterebbero", async () => {
    const d = await discente("esistente");
    // certificato già emesso; nel frattempo NESSUN requisito risulta (né slide né esame né quiz)
    const [c] = await db.insert(certificate).values({ enrollmentId: d.enr, status: "ready_for_review", number: `EVALIS-TEST-${RUN}` }).returning();
    expect((await isReadyForCertificate(d.enr, { userId: d.id })).ready).toBe(false);
    const r = await ensureCertificateRecord(d.enr, { userId: d.id });
    expect(r).toEqual({ id: c.id, status: "ready_for_review", number: `EVALIS-TEST-${RUN}` });
    const [dopo] = await db.select().from(certificate).where(eq(certificate.id, c.id));
    expect(dopo).toEqual(c);
  });
});

describe("avviso ISO 19011 — chi ha già il certificato della 19011", () => {
  it("il certificato della 19011 vale da solo: l'avviso non viene mostrato", async () => {
    const { courseId: cIso } = await ingestCourse({ ...sampleCourse(), title: `Corso ISO certcp ${RUN}` });
    corsi.push(cIso);
    await db.update(course).set({ prerequisiteCourseId: courseId }).where(eq(course.id, cIso));

    const con = await discente("con19011");
    await db.insert(certificate).values({ enrollmentId: con.enr, status: "issued", number: `EVALIS-19011-${RUN}` });
    expect(await iso19011Advisory(con.id, cIso)).toMatchObject({ isIsoCourse: true, has19011: true, shouldAdvise: false });

    const senza = await discente("senza19011");
    expect(await iso19011Advisory(senza.id, cIso)).toMatchObject({ isIsoCourse: true, has19011: false, shouldAdvise: true });

    // un certificato REVOCATO non vale
    const revocato = await discente("revocato19011");
    await db.insert(certificate).values({ enrollmentId: revocato.enr, status: "revoked", number: `EVALIS-REV-${RUN}` });
    expect((await iso19011Advisory(revocato.id, cIso)).has19011).toBe(false);
  });
});
