// Integrazione DB: ripristino di uno svolgimento perso (ripristinaCompletamento). Controlla che
// completi solo le slide mancanti senza toccare quelle tracciate, che NON inventi tempi, heartbeat
// o tentativi d'esame, che il provvisorio nasca una volta sola (mail comprese) restando in attesa
// di revisione umana, che il registro dica chi, quando e perché, e che la catena resti integra.
// Le mail NON partono: l'invio è sostituito da un contatore.

import { describe, it, expect, afterAll, vi } from "vitest";
import { sql, and, asc, eq, inArray, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  activityLog, user, organization, enrollment, course, module, lesson, slide, certificate, slideProgress, heartbeat, quizAttempt,
} from "@/lib/db/schema";
import { firstMembershipOrgId } from "@/features/auth/guards";
import { ingestCourse } from "@/features/courses/ingest";
import { sampleCourse } from "@/features/courses/seed";
import { recordHeartbeat } from "@/features/tracking/progress";
import { ripristinaCompletamento } from "@/features/certificates/lifecycle";
import { isReadyForCertificate } from "@/features/certificates/readiness";
import { statoPercorso } from "@/features/courses/completamento";
import { verifyChain } from "@/features/audit/log";

type Inviata = { to: string; subject: string };
const inviate = vi.hoisted(() => [] as Inviata[]);
vi.mock("@/lib/email/resend", async (orig) => ({
  ...(await orig<typeof import("@/lib/email/resend")>()),
  inviaEmailConAllegati: vi.fn(async (m: Inviata) => {
    inviate.push(m);
    return { sent: true };
  }),
}));

const RUN = Date.now();
const PW = "Password123!";
const createdUserIds: string[] = [];
const createdCourseIds: string[] = [];
const createdOrgIds: string[] = [];
const OPZ = { operatore: "staff@example.test", motivo: "svolgimento perso, ripristino richiesto dallo staff" };

afterAll(async () => {
  if (createdOrgIds.length) {
    await db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL app.audit_maintenance = 'on'`);
      await tx.delete(activityLog).where(inArray(activityLog.organizationId, createdOrgIds));
    });
  }
  if (createdUserIds.length) await db.delete(enrollment).where(inArray(enrollment.userId, createdUserIds));
  if (createdCourseIds.length) await db.delete(course).where(inArray(course.id, createdCourseIds));
  if (createdUserIds.length) {
    await db.delete(organization).where(inArray(organization.slug, createdUserIds.map((id) => `u-${id}`)));
    await db.delete(user).where(inArray(user.id, createdUserIds));
  }
});

async function slideDi(courseId: string) {
  return db
    .select({ id: slide.id, audioSeconds: slide.audioSeconds })
    .from(slide)
    .innerJoin(lesson, eq(lesson.id, slide.lessonId))
    .innerJoin(module, eq(module.id, lesson.moduleId))
    .where(eq(module.courseId, courseId))
    .orderBy(asc(module.position), asc(lesson.position), asc(slide.position));
}

/** Segue una slide come il player: heartbeat veri fino alla fine dell'audio. */
async function seguiSlide(enrollmentId: string, slideId: string, audioSeconds: number) {
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

async function nuovoDiscente(nome: string) {
  const email = `evalis-ripr-${nome}+${RUN}@example.test`;
  const res = await auth.api.signUpEmail({ body: { name: `Discente ${nome}`, email, password: PW } });
  createdUserIds.push(res.user.id);
  const orgId = (await firstMembershipOrgId(res.user.id))!;
  createdOrgIds.push(orgId);
  return { uid: res.user.id, orgId, email };
}

async function iscrivi(orgId: string, uid: string, courseId: string) {
  const [e] = await db.insert(enrollment).values({ organizationId: orgId, userId: uid, courseId, source: "manual", status: "active" }).returning({ id: enrollment.id });
  return e.id;
}

const eventi = (orgId: string, verb: string) =>
  db.select().from(activityLog).where(and(eq(activityLog.organizationId, orgId), eq(activityLog.verb, verb)));

describe("Ripristino di uno svolgimento perso", () => {
  it("completa solo il mancante, non inventa tracciamento, provvisorio una volta sola, registro e catena integri", async () => {
    const { courseId } = await ingestCourse(sampleCourse());
    createdCourseIds.push(courseId);
    const { courseId: altroCorso } = await ingestCourse(sampleCourse());
    createdCourseIds.push(altroCorso);
    const { uid, orgId, email } = await nuovoDiscente("a");
    const enr = await iscrivi(orgId, uid, courseId);
    const enrAltro = await iscrivi(orgId, uid, altroCorso);

    // la prima slide è stata seguita davvero (rimasta dallo svolgimento)
    const slides = await slideDi(courseId);
    expect(slides.length).toBeGreaterThan(1);
    await seguiSlide(enr, slides[0].id, slides[0].audioSeconds);
    const [tracciata] = await db.select().from(slideProgress).where(and(eq(slideProgress.enrollmentId, enr), eq(slideProgress.slideId, slides[0].id)));
    expect(tracciata.completedAt).not.toBeNull();
    const heartbeatPrima = (await db.select({ id: heartbeat.id }).from(heartbeat).where(eq(heartbeat.enrollmentId, enr))).length;
    const mailPrima = inviate.length;

    const r = await ripristinaCompletamento(enr, OPZ);
    expect(r.nuovo).toBe(true);
    expect(r.slideRipristinate).toBe(slides.length - 1);
    expect(r.number).toMatch(/^EVALIS-\d{4}-[0-9A-F]{8}$/);

    // tutte le slide completate: il corso appare completato
    const stato = await db.transaction((tx) => statoPercorso(tx, enr, courseId));
    expect(stato.slideMancanti).toBe(0);
    // la slide tracciata è rimasta identica (data e secondi veri)
    const [dopo] = await db.select().from(slideProgress).where(eq(slideProgress.id, tracciata.id));
    expect(dopo.completedAt?.toISOString()).toBe(tracciata.completedAt?.toISOString());
    expect(dopo.effectiveSeconds).toBe(tracciata.effectiveSeconds);
    // le slide ripristinate non hanno secondi inventati
    const ripristinate = await db.select().from(slideProgress).where(and(eq(slideProgress.enrollmentId, enr), inArray(slideProgress.slideId, slides.slice(1).map((s) => s.id))));
    expect(ripristinate).toHaveLength(slides.length - 1);
    expect(ripristinate.every((p) => p.effectiveSeconds === 0 && !p.audioCompleted && p.completedAt)).toBe(true);
    // nessun heartbeat né tentativo d'esame inventato; i requisiti tracciati restano non soddisfatti
    expect((await db.select({ id: heartbeat.id }).from(heartbeat).where(eq(heartbeat.enrollmentId, enr))).length).toBe(heartbeatPrima);
    expect(await db.select({ id: quizAttempt.id }).from(quizAttempt).where(eq(quizAttempt.enrollmentId, enr))).toHaveLength(0);
    expect((await isReadyForCertificate(enr)).ready).toBe(false);

    // provvisorio in attesa di revisione umana, mai approvato da solo
    const [cert] = await db.select().from(certificate).where(eq(certificate.enrollmentId, enr));
    expect(cert.id).toBe(r.id);
    expect(cert.status).toBe("ready_for_review");
    expect(cert.approvedBy).toBeNull();
    expect(cert.learnerName).toBe("Discente a");
    // mail di fine corso all'utente col provvisorio (il committente solo in produzione)
    const nuove = inviate.slice(mailPrima);
    expect(nuove.filter((m) => m.to === email)).toHaveLength(1);

    // registro: chi, perché, quante slide; poi la nascita del certificato
    const ripr = await eventi(orgId, "completion-restored");
    expect(ripr).toHaveLength(1);
    expect(ripr[0].userId).toBe(uid);
    expect(ripr[0].object).toBe(`enrollment:${enr}`);
    expect(ripr[0].payload).toEqual({ ...OPZ, slideTotali: slides.length, slideRipristinate: slides.length - 1 });
    expect(await eventi(orgId, "certificate-requested")).toHaveLength(1);
    expect((await verifyChain(orgId)).valid).toBe(true);

    // l'altra iscrizione dello stesso utente non è stata toccata
    expect(await db.select().from(slideProgress).where(eq(slideProgress.enrollmentId, enrAltro))).toHaveLength(0);
    expect(await db.select().from(certificate).where(eq(certificate.enrollmentId, enrAltro))).toHaveLength(0);

    // seconda esecuzione per errore: stesso attestato, nessuna mail, nessuna slide toccata
    const mailDopo = inviate.length;
    const r2 = await ripristinaCompletamento(enr, OPZ);
    expect(r2).toMatchObject({ id: r.id, number: r.number, nuovo: false, slideRipristinate: 0 });
    expect(inviate.length).toBe(mailDopo);
    expect(await db.select().from(certificate).where(eq(certificate.enrollmentId, enr))).toHaveLength(1);
    // anche la seconda volta resta traccia nel registro, e la catena regge
    expect(await eventi(orgId, "completion-restored")).toHaveLength(2);
    expect((await verifyChain(orgId)).valid).toBe(true);
  });

  it("su un'iscrizione che ha già l'attestato non ne crea un altro e non manda mail", async () => {
    const { courseId } = await ingestCourse(sampleCourse());
    createdCourseIds.push(courseId);
    const { uid, orgId } = await nuovoDiscente("b");
    const enr = await iscrivi(orgId, uid, courseId);
    const [gia] = await db.insert(certificate).values({ enrollmentId: enr, number: `EVALIS-TEST-${RUN}` }).returning();
    const mailPrima = inviate.length;

    const r = await ripristinaCompletamento(enr, OPZ);
    expect(r).toMatchObject({ id: gia.id, number: gia.number, nuovo: false });
    expect(inviate.length).toBe(mailPrima);
    expect(await db.select().from(certificate).where(eq(certificate.enrollmentId, enr))).toHaveLength(1);
    expect(await db.select().from(slideProgress).where(and(eq(slideProgress.enrollmentId, enr), isNull(slideProgress.completedAt)))).toHaveLength(0);
  });

  it("iscrizione inesistente: errore, niente scritto", async () => {
    await expect(ripristinaCompletamento("00000000-0000-4000-8000-000000000000", OPZ)).rejects.toThrow(/Enrollment inesistente/);
  });
});
