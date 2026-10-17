// Corsi con attestato SOLO EVALIS (course.attestatoSoloEvalis, migrazione 0035): niente certificato
// accreditato da caricare. Dopo la verifica dello staff la piattaforma genera l'attestato EVALIS
// definitivo, con lo stesso numero e lo stesso QR del provvisorio. Mai prima della verifica: a fine
// corso nasce solo il provvisorio (vincolo CLAUDE.md: mai invio automatico del definitivo).

import { describe, it, expect, afterAll, beforeAll, vi } from "vitest";
import { asc, eq, inArray, sql } from "drizzle-orm";

type Inviata = { to: string; subject: string; html: string; allegati: { nome: string; contenuto: Uint8Array }[] };
const inviate = vi.hoisted(() => [] as Inviata[]);
vi.mock("@/lib/email/resend", async (orig) => ({
  ...(await orig<typeof import("@/lib/email/resend")>()),
  inviaEmailConAllegati: vi.fn(async (m: Inviata) => {
    inviate.push(m); // le mail si contano, non si inviano
    return { sent: true };
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
import {
  ensureCertificateRecord, getCertificatoPerChiave, emettiAttestatoEvalisById, revokeCertificateById, certificatoPerDownload,
  rifirmaAttestatoEvalisById,
} from "@/features/certificates/lifecycle";
import { deleteCertificatePdf, isStorageConfigured, leggiCertificatoPdf } from "@/lib/supabase/storage";
import { CORSI_STILE_COMPLETO } from "@/features/certificates/attestato-evalis-pdf";
import { PDFDocument } from "pdf-lib";

const RUN = Date.now();
const ORG = `attev-org-${RUN}`;
const utenti: string[] = [];
const caricati: string[] = [];
const corsi: { id: string; quizIds: string[]; slideIds: string[] }[] = [];

async function corso(soloEvalis: boolean) {
  const { courseId } = await ingestCourse({ ...sampleCourse(), title: `Corso attev ${soloEvalis} ${RUN}` });
  await db.update(course).set({ attestatoSoloEvalis: soloEvalis }).where(eq(course.id, courseId));
  const quizIds = (await db.select({ id: quiz.id }).from(quiz).where(eq(quiz.courseId, courseId))).map((q) => q.id);
  const slideIds = (
    await db.select({ id: slide.id }).from(slide).innerJoin(lesson, eq(lesson.id, slide.lessonId)).innerJoin(module, eq(module.id, lesson.moduleId))
      .where(eq(module.courseId, courseId)).orderBy(asc(slide.position))
  ).map((s) => s.id);
  const c = { id: courseId, quizIds, slideIds };
  corsi.push(c);
  return c;
}

async function alProvvisorio(tag: string, c: { id: string; quizIds: string[]; slideIds: string[] }) {
  const id = `attev-${tag}-${RUN}`;
  utenti.push(id);
  const ora = new Date();
  await db.insert(user).values({ id, name: `Corsista ${tag}`, email: `${id}@example.test`, emailVerified: true, createdAt: ora, updatedAt: ora });
  await db.insert(member).values({ id: `m-${id}`, organizationId: ORG, userId: id, role: "member", createdAt: ora });
  await db.insert(anagraficaCertificato).values({ userId: id, codiceFiscale: "RSSMRA80A01H501U", dataNascita: "1980-01-01", luogoNascita: "Roma" });
  const [e] = await db.insert(enrollment).values({ organizationId: ORG, userId: id, courseId: c.id, source: "manual", status: "active" }).returning({ id: enrollment.id });
  await db.insert(slideProgress).values(c.slideIds.map((slideId) => ({ enrollmentId: e.id, slideId, effectiveSeconds: 40, audioCompleted: true, completedAt: ora, updatedAt: ora })));
  await db.insert(quizAttempt).values(c.quizIds.map((quizId) => ({ enrollmentId: e.id, quizId, startedAt: ora, submittedAt: ora, passed: true, score: 100 })));
  const cert = await ensureCertificateRecord(e.id, { userId: id });
  return { id, certId: cert!.id, number: cert!.number! };
}

const rifiuto = async (p: Promise<unknown>) => p.then(() => null, (e: Error) => e.message);
const riga = async (certId: string) => (await db.select().from(certificate).where(eq(certificate.id, certId)))[0];

beforeAll(async () => {
  await db.insert(organization).values({ id: ORG, name: ORG, slug: ORG, createdAt: new Date(), metadata: serializeOrgMetadata({ type: "company", seatLimit: 50 }) });
});

afterAll(async () => {
  CORSI_STILE_COMPLETO.delete(`attev-stile-${RUN}`);
  for (const p of caricati) await deleteCertificatePdf(p).catch(() => {});
  if (utenti.length) await db.delete(enrollment).where(inArray(enrollment.userId, utenti));
  for (const c of corsi) await db.delete(course).where(eq(course.id, c.id));
  await db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL app.audit_maintenance = 'on'`);
    await tx.delete(activityLog).where(eq(activityLog.organizationId, ORG));
  });
  await db.delete(organization).where(eq(organization.id, ORG));
  if (utenti.length) await db.delete(user).where(inArray(user.id, utenti));
});

describe.skipIf(!isStorageConfigured())("attestato solo EVALIS", () => {
  it("a fine corso nasce SOLO il provvisorio, che non parla di accreditamento", async () => {
    const c = await corso(true);
    inviate.length = 0;
    const a = await alProvvisorio("a", c);
    expect(await riga(a.certId)).toMatchObject({ status: "ready_for_review", pdfPath: null });
    // la mail all'utente: attestato provvisorio, nessun «accreditato»
    const utente = inviate.find((m) => m.to === `attev-a-${RUN}@example.test`);
    expect(utente?.subject).toContain("attestato provvisorio");
    expect(utente?.html).not.toContain("accreditato");
    const dl = await certificatoPerDownload(a.certId, { userId: a.id, staff: false });
    expect(dl?.tipo).toBe("provvisorio");
  }, 120_000);

  it("lo staff emette l'attestato: PDF generato e salvato, stesso numero, stato issued, audit e mail", async () => {
    const [a] = await db.select({ id: certificate.id, number: certificate.number }).from(certificate)
      .innerJoin(enrollment, eq(enrollment.id, certificate.enrollmentId)).where(eq(enrollment.userId, `attev-a-${RUN}`));
    inviate.length = 0;
    const emesso = await emettiAttestatoEvalisById(a.id, "staff-attev");
    expect(emesso).toMatchObject({ status: "issued", number: a.number });

    const r = await riga(a.id);
    expect(r).toMatchObject({ status: "issued", number: a.number, approvedBy: "staff-attev", accreditatoNumero: null });
    expect(r.pdfPath).toBeTruthy();
    caricati.push(r.pdfPath!);
    const bytes = await leggiCertificatoPdf(r.pdfPath!);
    expect(Buffer.from(bytes!.slice(0, 5)).toString("latin1")).toBe("%PDF-");

    const [log] = await db.select().from(activityLog).where(eq(activityLog.object, `certificate:${a.id}`)).orderBy(sql`${activityLog.createdAt} desc`).limit(1);
    expect(log).toMatchObject({ verb: "certificate-issued" });
    expect(log.payload).toMatchObject({ tipo: "attestato-evalis", number: a.number });

    expect(inviate).toHaveLength(1);
    expect(inviate[0].subject).toContain("attestato EVALIS Academy");
    expect(inviate[0].allegati[0].nome).toBe(`Certificato-${a.number}.pdf`);
    expect(await getCertificatoPerChiave(a.number!)).toMatchObject({ valid: true, number: a.number });
  }, 120_000);

  it("non si emette due volte, né su un certificato revocato", async () => {
    const [a] = await db.select({ id: certificate.id }).from(certificate)
      .innerJoin(enrollment, eq(enrollment.id, certificate.enrollmentId)).where(eq(enrollment.userId, `attev-a-${RUN}`));
    expect(await rifiuto(emettiAttestatoEvalisById(a.id, "staff-attev"))).toMatch(/già stato emesso/);

    const c = corsi[0];
    const b = await alProvvisorio("b", c);
    await revokeCertificateById(b.certId, "staff-attev", "prova", { platformAdmin: true });
    expect(await rifiuto(emettiAttestatoEvalisById(b.certId, "staff-attev"))).toMatch(/revocato/);
    expect((await riga(b.certId)).pdfPath).toBeNull();
  }, 120_000);

  it("due clic contemporanei: una sola emissione e una sola mail", async () => {
    const d = await alProvvisorio("d", corsi[0]);
    inviate.length = 0;
    const esiti = await Promise.allSettled([emettiAttestatoEvalisById(d.certId, "staff-attev"), emettiAttestatoEvalisById(d.certId, "staff-attev")]);
    expect(esiti.filter((e) => e.status === "fulfilled")).toHaveLength(1);
    expect(inviate).toHaveLength(1);
    caricati.push((await riga(d.certId)).pdfPath!);
  }, 120_000);

  it("stile completo (oggi la PdR 125): stesso flusso, attestato EVALIS Academy col protocollo; gli altri corsi restano col modello di prima", async () => {
    // il corso di prova entra nell'elenco dello stile completo come la PdR 125
    const c = await corso(true);
    await db.update(course).set({ slug: `attev-stile-${RUN}` }).where(eq(course.id, c.id));
    CORSI_STILE_COMPLETO.add(`attev-stile-${RUN}`);
    const s = await alProvvisorio("s", c);
    // il provvisorio non cambia: stesso documento degli altri corsi solo EVALIS
    expect((await certificatoPerDownload(s.certId, { userId: s.id, staff: false }))?.tipo).toBe("provvisorio");

    await emettiAttestatoEvalisById(s.certId, "staff-attev");
    const r = await riga(s.certId);
    caricati.push(r.pdfPath!);
    const stile = await PDFDocument.load((await leggiCertificatoPdf(r.pdfPath!))!);
    expect(stile.getTitle()).toBe(`Attestato ${s.number}`);
    expect(stile.getAuthor()).toBe("EVALIS Academy");
    // il protocollo stampato è il numero che la verifica pubblica riconosce
    expect(await getCertificatoPerChiave(s.number)).toMatchObject({ valid: true, number: s.number });

    // un corso solo EVALIS fuori dall'elenco: il definitivo resta quello di prima
    const [a] = await db.select({ pdfPath: certificate.pdfPath }).from(certificate)
      .innerJoin(enrollment, eq(enrollment.id, certificate.enrollmentId)).where(eq(enrollment.userId, `attev-a-${RUN}`));
    const prima = await PDFDocument.load((await leggiCertificatoPdf(a.pdfPath!))!);
    expect(prima.getAuthor()).toBeUndefined();
  }, 120_000);

  it("su un corso con certificato accreditato l'emissione EVALIS è rifiutata", async () => {
    const c = await corso(false);
    const e = await alProvvisorio("e", c);
    expect(await rifiuto(emettiAttestatoEvalisById(e.certId, "staff-attev"))).toMatch(/certificato accreditato/);
    expect(await riga(e.certId)).toMatchObject({ status: "ready_for_review", pdfPath: null });
  }, 120_000);
  it("rifirma di un attestato già emesso: stesso numero e stessa data, PDF nuovo, il vecchio resta, registro e mail", async () => {
    const [a] = await db.select({ id: certificate.id }).from(certificate)
      .innerJoin(enrollment, eq(enrollment.id, certificate.enrollmentId)).where(eq(enrollment.userId, `attev-a-${RUN}`));
    const prima = await riga(a.id);
    // servono operatore e motivo; un attestato non emesso non si rifirma
    expect(await rifiuto(rifirmaAttestatoEvalisById(a.id, "staff-attev", " "))).toMatch(/operatore e motivo/);
    const r = await alProvvisorio("r", corsi[0]);
    expect(await rifiuto(rifirmaAttestatoEvalisById(r.certId, "staff-attev", "prova"))).toMatch(/non è emesso/);

    inviate.length = 0;
    const esito = await rifirmaAttestatoEvalisById(a.id, "staff-attev", "attestato emesso prima della firma");
    const dopo = await riga(a.id);
    caricati.push(dopo.pdfPath!);
    expect(dopo).toMatchObject({ status: "issued", number: prima.number, issuedAt: prima.issuedAt, verifyUuid: prima.verifyUuid });
    expect(dopo.pdfPath).not.toBe(prima.pdfPath);
    expect(esito.precedente).toBe(prima.pdfPath);
    // il PDF consegnato prima non si cancella
    expect(await leggiCertificatoPdf(prima.pdfPath!)).not.toBeNull();
    expect(Buffer.from((await leggiCertificatoPdf(dopo.pdfPath!))!.slice(0, 5)).toString("latin1")).toBe("%PDF-");

    const [log] = await db.select().from(activityLog).where(eq(activityLog.object, `certificate:${a.id}`)).orderBy(sql`${activityLog.createdAt} desc`).limit(1);
    expect(log).toMatchObject({ verb: "certificate-resigned" });
    expect(log.payload).toMatchObject({ number: prima.number, precedente: prima.pdfPath, operatore: "staff-attev" });
    expect(inviate).toHaveLength(1);
    expect(inviate[0].subject).toContain("firmato");
    expect(await getCertificatoPerChiave(prima.number!)).toMatchObject({ valid: true, number: prima.number });
  }, 120_000);
});
