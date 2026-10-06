// Nome e anagrafica scritti nel certificato (audit B8). Prima il certificato leggeva il nome
// dal profilo a ogni richiesta: chi cambiava nome dopo l'emissione cambiava anche il PDF
// provvisorio e la pagina pubblica di verifica, con lo stesso numero di certificato.
// Ora nome, codice fiscale, data e luogo di nascita si fissano quando il certificato nasce.

import { describe, it, expect, afterAll, beforeAll, vi } from "vitest";
import { asc, eq, inArray, sql } from "drizzle-orm";

vi.mock("@/lib/email/resend", async (orig) => ({
  ...(await orig<typeof import("@/lib/email/resend")>()),
  inviaEmailConAllegati: vi.fn(async () => ({ sent: false })), // nessuna mail vera
}));
// il PDF non si legge facilmente: si guarda con quali dati viene chiesto
const pdfChiesto = vi.hoisted(() => [] as { learnerName: string; nascita?: string }[]);
vi.mock("@/features/certificates/pdf", () => ({
  buildCertificatePdf: vi.fn(async (d: { learnerName: string; nascita?: string }) => {
    pdfChiesto.push(d);
    return new Uint8Array([37, 80, 68, 70]);
  }),
}));

import { db } from "@/lib/db";
import {
  user, organization, member, course, enrollment, slide, lesson, module, quiz, quizAttempt,
  slideProgress, certificate, anagraficaCertificato, activityLog,
} from "@/lib/db/schema";
import { serializeOrgMetadata } from "@/features/auth/org-metadata";
import { ingestCourse } from "@/features/courses/ingest";
import { sampleCourse } from "@/features/courses/seed";
import { ensureCertificateRecord, getCertificatoPerChiave, certificatoPerDownload } from "@/features/certificates/lifecycle";

const RUN = Date.now();
const ORG = `certnome-org-${RUN}`;
const utenti: string[] = [];
let courseId = "";
let quizIds: string[] = [];
let slideIds: string[] = [];

async function discenteAlCertificato(tag: string, nome: string, luogo: string) {
  const id = `certnome-${tag}-${RUN}`;
  utenti.push(id);
  const ora = new Date();
  await db.insert(user).values({ id, name: nome, email: `${id}@example.test`, emailVerified: true, createdAt: ora, updatedAt: ora });
  await db.insert(member).values({ id: `m-${id}`, organizationId: ORG, userId: id, role: "member", createdAt: ora });
  await db.insert(anagraficaCertificato).values({ userId: id, codiceFiscale: "RSSMRA80A01H501U", dataNascita: "1980-01-01", luogoNascita: luogo });
  const [e] = await db.insert(enrollment).values({ organizationId: ORG, userId: id, courseId, source: "manual", status: "active" }).returning({ id: enrollment.id });
  await db.insert(slideProgress).values(slideIds.map((slideId) => ({ enrollmentId: e.id, slideId, effectiveSeconds: 40, audioCompleted: true, completedAt: ora, updatedAt: ora })));
  await db.insert(quizAttempt).values(quizIds.map((quizId) => ({ enrollmentId: e.id, quizId, startedAt: ora, submittedAt: ora, passed: true, score: 100 })));
  const cert = await ensureCertificateRecord(e.id, { userId: id });
  return { id, enr: e.id, certId: cert!.id, numero: cert!.number! };
}

beforeAll(async () => {
  await db.insert(organization).values({ id: ORG, name: ORG, slug: ORG, createdAt: new Date(), metadata: serializeOrgMetadata({ type: "company", seatLimit: 50 }) });
  ({ courseId } = await ingestCourse({ ...sampleCourse(), title: `Corso certnome ${RUN}` }));
  quizIds = (await db.select({ id: quiz.id }).from(quiz).where(eq(quiz.courseId, courseId))).map((q) => q.id);
  slideIds = (
    await db.select({ id: slide.id }).from(slide).innerJoin(lesson, eq(lesson.id, slide.lessonId)).innerJoin(module, eq(module.id, lesson.moduleId))
      .where(eq(module.courseId, courseId)).orderBy(asc(slide.position))
  ).map((s) => s.id);
});

afterAll(async () => {
  if (utenti.length) await db.delete(enrollment).where(inArray(enrollment.userId, utenti));
  if (courseId) await db.delete(course).where(eq(course.id, courseId));
  await db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL app.audit_maintenance = 'on'`);
    await tx.delete(activityLog).where(eq(activityLog.organizationId, ORG));
  });
  await db.delete(organization).where(eq(organization.id, ORG));
  if (utenti.length) await db.delete(user).where(inArray(user.id, utenti));
});

describe("certificato — nome e anagrafica fissati alla nascita", () => {
  it("il certificato nasce con nome, codice fiscale, data e luogo di nascita del momento", async () => {
    const d = await discenteAlCertificato("nasce", "Mario Rossi", "Roma");
    const [c] = await db.select().from(certificate).where(eq(certificate.id, d.certId));
    expect(c).toMatchObject({ learnerName: "Mario Rossi", codiceFiscale: "RSSMRA80A01H501U", dataNascita: "1980-01-01", luogoNascita: "Roma" });
  });

  it("cambio di nome e di anagrafica DOPO il certificato: verifica pubblica e PDF restano quelli originali", async () => {
    const d = await discenteAlCertificato("cambia", "Mario Rossi", "Roma");
    // ciò che oggi è possibile dall'endpoint di aggiornamento del profilo (e da una modifica diretta)
    await db.update(user).set({ name: "Nome Cambiato" }).where(eq(user.id, d.id));
    await db.update(anagraficaCertificato).set({ luogoNascita: "Milano" }).where(eq(anagraficaCertificato.userId, d.id));

    expect((await getCertificatoPerChiave(d.numero))?.learnerName).toBe("Mario Rossi");

    pdfChiesto.length = 0;
    const scarico = await certificatoPerDownload(d.certId, { userId: d.id, staff: false });
    expect(scarico?.tipo).toBe("provvisorio");
    expect(pdfChiesto[0].learnerName).toBe("Mario Rossi");
    expect(pdfChiesto[0].nascita).toMatch(/Roma/);
    expect(pdfChiesto[0].nascita).not.toMatch(/Milano/);
  });

  it("un certificato nuovo prende il nome attuale", async () => {
    const d = await discenteAlCertificato("nuovo", "Anna Bianchi", "Bari");
    expect((await getCertificatoPerChiave(d.numero))?.learnerName).toBe("Anna Bianchi");
  });

  it("certificato nato prima di questa modifica (colonne vuote): continua a mostrare il nome del profilo", async () => {
    const d = await discenteAlCertificato("vecchio", "Luca Verdi", "Torino");
    await db.update(certificate).set({ learnerName: null, codiceFiscale: null, dataNascita: null, luogoNascita: null }).where(eq(certificate.id, d.certId));
    expect((await getCertificatoPerChiave(d.numero))?.learnerName).toBe("Luca Verdi");
    pdfChiesto.length = 0;
    await certificatoPerDownload(d.certId, { userId: d.id, staff: false });
    expect(pdfChiesto[0].learnerName).toBe("Luca Verdi");
    expect(pdfChiesto[0].nascita).toMatch(/Torino/);
  });
});
