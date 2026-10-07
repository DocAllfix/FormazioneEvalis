// Numero dell'attestato ACCREDITATO. L'ente che emette l'accreditato gli dà un numero suo
// (es. C013562026), diverso dal numero EVALIS del provvisorio. Chi riceve l'attestato cerca
// QUEL numero sulla pagina di verifica: deve trovarlo. Lo staff lo scrive al caricamento.

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
  ensureCertificateRecord, getCertificatoPerChiave, preparaCaricamentoById, confermaCaricamentoById,
} from "@/features/certificates/lifecycle";
import { deleteCertificatePdf, isStorageConfigured } from "@/lib/supabase/storage";

const RUN = Date.now();
const ORG = `certnum-org-${RUN}`;
const NUM = `C9${String(RUN).slice(-8)}`; // stesso formato dell'ente: lettera + cifre
const utenti: string[] = [];
const caricati: string[] = [];
let courseId = "";
let quizIds: string[] = [];
let slideIds: string[] = [];
const PDF = new Uint8Array(Buffer.from("%PDF-1.4\n% attestato accreditato di prova\n%%EOF\n", "latin1"));

async function alProvvisorio(tag: string) {
  const id = `certnum-${tag}-${RUN}`;
  utenti.push(id);
  const ora = new Date();
  await db.insert(user).values({ id, name: `Corsista ${tag}`, email: `${id}@example.test`, emailVerified: true, createdAt: ora, updatedAt: ora });
  await db.insert(member).values({ id: `m-${id}`, organizationId: ORG, userId: id, role: "member", createdAt: ora });
  await db.insert(anagraficaCertificato).values({ userId: id, codiceFiscale: "RSSMRA80A01H501U", dataNascita: "1980-01-01", luogoNascita: "Roma" });
  const [e] = await db.insert(enrollment).values({ organizationId: ORG, userId: id, courseId, source: "manual", status: "active" }).returning({ id: enrollment.id });
  await db.insert(slideProgress).values(slideIds.map((slideId) => ({ enrollmentId: e.id, slideId, effectiveSeconds: 40, audioCompleted: true, completedAt: ora, updatedAt: ora })));
  await db.insert(quizAttempt).values(quizIds.map((quizId) => ({ enrollmentId: e.id, quizId, startedAt: ora, submittedAt: ora, passed: true, score: 100 })));
  const c = await ensureCertificateRecord(e.id, { userId: id });
  return { id, certId: c!.id, evalis: c!.number! };
}

async function carica(certId: string) {
  const p = await preparaCaricamentoById(certId);
  const form = new FormData();
  form.append("cacheControl", "3600");
  form.append("", new Blob([Buffer.from(PDF)], { type: "application/pdf" }));
  const r = await fetch(p.url, { method: "PUT", body: form, headers: { "x-upsert": "false" } });
  expect(r.ok).toBe(true);
  caricati.push(p.path);
  return p.path;
}
const rifiuto = async (p: Promise<unknown>) => p.then(() => null, (e: Error) => e.message);
const riga = async (certId: string) => (await db.select().from(certificate).where(eq(certificate.id, certId)))[0];

beforeAll(async () => {
  await db.insert(organization).values({ id: ORG, name: ORG, slug: ORG, createdAt: new Date(), metadata: serializeOrgMetadata({ type: "company", seatLimit: 50 }) });
  ({ courseId } = await ingestCourse({ ...sampleCourse(), title: `Corso certnum ${RUN}` }));
  quizIds = (await db.select({ id: quiz.id }).from(quiz).where(eq(quiz.courseId, courseId))).map((q) => q.id);
  slideIds = (
    await db.select({ id: slide.id }).from(slide).innerJoin(lesson, eq(lesson.id, slide.lessonId)).innerJoin(module, eq(module.id, lesson.moduleId))
      .where(eq(module.courseId, courseId)).orderBy(asc(slide.position))
  ).map((s) => s.id);
});

afterAll(async () => {
  for (const p of caricati) await deleteCertificatePdf(p).catch(() => {});
  if (utenti.length) await db.delete(enrollment).where(inArray(enrollment.userId, utenti));
  if (courseId) await db.delete(course).where(eq(course.id, courseId));
  await db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL app.audit_maintenance = 'on'`);
    await tx.delete(activityLog).where(eq(activityLog.organizationId, ORG));
  });
  await db.delete(organization).where(eq(organization.id, ORG));
  if (utenti.length) await db.delete(user).where(inArray(user.id, utenti));
});

describe.skipIf(!isStorageConfigured())("certificato accreditato — numero dell'attestato", () => {
  it("al caricamento si scrive il numero dell'attestato: la verifica pubblica lo trova, comunque sia scritto", async () => {
    const a = await alProvvisorio("a");
    inviate.length = 0;
    const emesso = await confermaCaricamentoById(a.certId, await carica(a.certId), a.id, { numeroAccreditato: `  ${NUM.toLowerCase()} ` });
    expect(emesso).toMatchObject({ status: "issued", number: NUM });
    expect((await riga(a.certId)).accreditatoNumero).toBe(NUM);
    expect((await riga(a.certId)).number).toBe(a.evalis); // il numero EVALIS resta com'era

    // chi ha in mano l'attestato cerca il numero stampato: maiuscole, minuscole, spazi
    for (const chiave of [NUM, NUM.toLowerCase(), ` ${NUM} `, `${NUM.slice(0, 4)} ${NUM.slice(4)}`]) {
      const v = await getCertificatoPerChiave(chiave);
      expect(v, `ricerca «${chiave}»`).toMatchObject({ valid: true, status: "issued", number: NUM, learnerName: "Corsista a" });
    }
    // anche il vecchio numero EVALIS del provvisorio porta allo stesso certificato
    expect(await getCertificatoPerChiave(a.evalis)).toMatchObject({ valid: true, number: NUM });

    // la mail al corsista parla del numero dell'attestato, e il file ne porta il nome
    expect(inviate).toHaveLength(1);
    expect(inviate[0].html).toContain(NUM);
    expect(inviate[0].allegati[0].nome).toBe(`Certificato-${NUM}.pdf`);
  }, 120_000);

  it("un numero già usato da un altro certificato viene rifiutato, e il certificato resta provvisorio", async () => {
    const b = await alProvvisorio("b");
    const a = (await db.select({ evalis: certificate.number }).from(certificate).where(eq(certificate.accreditatoNumero, NUM)))[0];

    expect(await rifiuto(confermaCaricamentoById(b.certId, await carica(b.certId), b.id, { numeroAccreditato: NUM }))).toMatch(/già usato/);
    // nemmeno il numero EVALIS di un ALTRO certificato si può prendere
    expect(await rifiuto(confermaCaricamentoById(b.certId, await carica(b.certId), b.id, { numeroAccreditato: a.evalis! }))).toMatch(/già usato/);
    for (const sporco of ["ab", "x".repeat(60), "C01 <script>", "'; drop table"]) {
      expect(await rifiuto(confermaCaricamentoById(b.certId, await carica(b.certId), b.id, { numeroAccreditato: sporco })), sporco).toMatch(/non valido/);
    }
    expect(await riga(b.certId)).toMatchObject({ status: "ready_for_review", accreditatoNumero: null, pdfPath: null });
    expect((await getCertificatoPerChiave(b.evalis))?.provvisorio).toBe(true);
  }, 180_000);

  it("sostituzione del file: senza numero resta quello di prima, con un numero nuovo si corregge", async () => {
    const [a] = await db.select({ id: certificate.id }).from(certificate).where(eq(certificate.accreditatoNumero, NUM));
    await confermaCaricamentoById(a.id, await carica(a.id), "staff", { sostituisci: true });
    expect((await riga(a.id)).accreditatoNumero).toBe(NUM);

    const corretto = `${NUM}-B`;
    await confermaCaricamentoById(a.id, await carica(a.id), "staff", { sostituisci: true, numeroAccreditato: corretto });
    expect((await riga(a.id)).accreditatoNumero).toBe(corretto);
    expect(await getCertificatoPerChiave(corretto)).toMatchObject({ valid: true, number: corretto });
    expect(await getCertificatoPerChiave(NUM)).toBeNull(); // il numero sbagliato non porta più a nulla
  }, 120_000);

  it("senza numero dell'attestato tutto funziona come prima, col numero EVALIS", async () => {
    const c = await alProvvisorio("c");
    const emesso = await confermaCaricamentoById(c.certId, await carica(c.certId), c.id);
    expect(emesso).toMatchObject({ status: "issued", number: c.evalis });
    expect(await getCertificatoPerChiave(c.evalis)).toMatchObject({ valid: true, number: c.evalis });
  }, 120_000);
});
