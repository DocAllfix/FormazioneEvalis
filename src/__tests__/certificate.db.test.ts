// Integrazione DB (Supabase) certificati: provvisorio gated a fine corso (numero, QR, mail),
// verifica pubblica per QR e per numero, caricamento dell'accreditato da parte dello staff
// (percorso, PDF vero, sostituzione), download, revoca, catena di audit. Storage reale guardato da
// SUPABASE_SERVICE_ROLE_KEY. Le mail NON partono: l'invio è sostituito da un contatore.
// Pulizia: oggetti storage + activity_log (GUC) + enrollment/cert/user/org.

import { describe, it, expect, afterAll, vi } from "vitest";
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
  ensureCertificateRecord, revokeCertificateById, getCertificatoPerChiave, certificatoPerDownload,
  preparaCaricamentoById, confermaCaricamentoById,
} from "@/features/certificates/lifecycle";
import { EMAIL_VENDITE } from "@/features/billing/notifica-vendita";
import { salvaAnagrafica, leggiAnagrafica, anagraficaBloccata } from "@/features/certificates/anagrafica";
import { isStorageConfigured, deleteCertificatePdf } from "@/lib/supabase/storage";
import { verifyChain } from "@/features/audit/log";

type Inviata = { to: string; subject: string; allegati: { nome: string; contenuto: Uint8Array }[] };
// le mail con allegato si contano, non si inviano
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

/** Carica dei bytes sul link firmato, come fa il browser dello staff. */
async function caricaSuLink(url: string, bytes: Uint8Array) {
  const form = new FormData();
  form.append("cacheControl", "3600");
  form.append("", new Blob([Buffer.from(bytes)], { type: "application/pdf" }));
  const r = await fetch(url, { method: "PUT", body: form, headers: { "x-upsert": "false" } });
  expect(r.ok).toBe(true);
}

const PDF_ACCREDITATO = new Uint8Array(Buffer.from("%PDF-1.4\n% certificato accreditato di prova\n%%EOF\n", "latin1"));
const intestazione = (b: Uint8Array) => Buffer.from(b.slice(0, 5)).toString("latin1");

describe("Certificati — provvisorio, accreditato caricato, verifica", () => {
  it("provvisorio a fine corso → verifica → caricamento accreditato → sostituzione → revoca", async () => {
    const { courseId } = await ingestCourse(sampleCourse());
    createdCourseIds.push(courseId);

    const email = `evalis-cert+${RUN}@example.test`;
    const res = await auth.api.signUpEmail({ body: { name: "Mario Rossi", email, password: PW } });
    const uid = res.user.id;
    createdUserIds.push(uid);
    const orgId = (await firstMembershipOrgId(uid))!;
    createdOrgIds.push(orgId);
    const altro = await auth.api.signUpEmail({ body: { name: "Altro", email: `evalis-cert-altro+${RUN}@example.test`, password: PW } });
    createdUserIds.push(altro.user.id);
    createdOrgIds.push((await firstMembershipOrgId(altro.user.id))!);
    const [enr] = await db
      .insert(enrollment)
      .values({ organizationId: orgId, userId: uid, courseId, source: "manual", status: "active" })
      .returning({ id: enrollment.id });

    // requisiti non soddisfatti → nessun record, nessuna mail
    expect(await ensureCertificateRecord(enr.id)).toBeNull();
    expect(inviate.length).toBe(0);

    await completeEnrollment(enr.id, courseId);

    // dati per il certificato: validati, salvati, modificabili finché non c'è un certificato
    await expect(salvaAnagrafica(uid, { codiceFiscale: "RSSMRA80A01H501X", dataNascita: "1980-01-01", luogoNascita: "Roma" })).rejects.toThrow(/codice fiscale/);
    await salvaAnagrafica(uid, { codiceFiscale: "rssmra80a01h501u", dataNascita: "1980-01-01", luogoNascita: "Milano" });
    await salvaAnagrafica(uid, { codiceFiscale: "RSSMRA80A01H501U", dataNascita: "1980-01-01", luogoNascita: "Roma" });
    expect(await leggiAnagrafica(uid)).toEqual({ codiceFiscale: "RSSMRA80A01H501U", dataNascita: "1980-01-01", luogoNascita: "Roma" });
    expect(await anagraficaBloccata(uid)).toBe(false);

    // ora: provvisorio con numero, idempotente, UNA sola mail (all'utente, col PDF provvisorio)
    const rec1 = await ensureCertificateRecord(enr.id);
    const rec2 = await ensureCertificateRecord(enr.id);
    expect(rec1?.status).toBe("ready_for_review");
    expect(rec1?.number).toMatch(/^EVALIS-\d{4}-[0-9A-F]{8}$/);
    expect(rec2?.id).toBe(rec1?.id);
    expect(rec2?.number).toBe(rec1?.number);
    const certId = rec1!.id;
    const number = rec1!.number!;
    expect(inviate.map((m) => m.to)).toEqual([email]); // fuori produzione il committente non riceve nulla
    expect(inviate.some((m) => m.to === EMAIL_VENDITE)).toBe(false);
    expect(inviate[0].allegati[0].nome).toBe(`Certificato-provvisorio-${number}.pdf`);
    expect(intestazione(inviate[0].allegati[0].contenuto)).toBe("%PDF-");

    // ora che il certificato esiste, i dati sono bloccati: il committente li ha già ricevuti
    expect(await anagraficaBloccata(uid)).toBe(true);
    await expect(salvaAnagrafica(uid, { codiceFiscale: "RSSMRA80A01H501U", dataNascita: "1980-01-01", luogoNascita: "Napoli" })).rejects.toThrow(/assistenza/);
    expect((await leggiAnagrafica(uid))?.luogoNascita).toBe("Roma");

    const requested = await db
      .select({ id: activityLog.id })
      .from(activityLog)
      .where(and(eq(activityLog.organizationId, orgId), eq(activityLog.verb, "certificate-requested")));
    expect(requested.length).toBe(1);

    // verifica pubblica del provvisorio: per QR e per numero (anche minuscolo, con spazi)
    const [c0] = await db.select({ verifyUuid: certificate.verifyUuid }).from(certificate).where(eq(certificate.id, certId));
    for (const chiave of [c0.verifyUuid, number, number.toLowerCase(), ` ${number} `]) {
      const v = await getCertificatoPerChiave(chiave);
      expect(v?.provvisorio).toBe(true);
      expect(v?.valid).toBe(false);
      expect(v?.learnerName).toBe("Mario Rossi");
    }
    for (const sporco of ["EVALIS-2026-00000000", "spazzatura", "'; drop table certificate; --", "%E0", ""]) {
      expect(await getCertificatoPerChiave(sporco)).toBeNull();
    }

    // download del provvisorio: il proprietario sì, un altro utente no, lo staff sì
    const mio = await certificatoPerDownload(certId, { userId: uid, staff: false });
    expect(mio?.tipo).toBe("provvisorio");
    if (mio?.tipo === "provvisorio") expect(intestazione(mio.pdf)).toBe("%PDF-");
    expect(await certificatoPerDownload(certId, { userId: altro.user.id, staff: false })).toBeNull();
    expect((await certificatoPerDownload(certId, { userId: altro.user.id, staff: true }))?.tipo).toBe("provvisorio");

    if (!isStorageConfigured()) return; // storage non configurato: ci fermiamo al provvisorio

    // un percorso che non è di questo certificato → rifiutato
    await expect(confermaCaricamentoById(certId, "accreditati/altro-1790000000000.pdf", uid)).rejects.toThrow(/non riconosciuto/);

    // un file che non è un PDF → rifiutato (e cancellato)
    const finto = await preparaCaricamentoById(certId);
    await caricaSuLink(finto.url, new Uint8Array(Buffer.from("non sono un pdf")));
    uploadedPaths.push(finto.path);
    await expect(confermaCaricamentoById(certId, finto.path, uid)).rejects.toThrow(/non è un PDF/);

    // il PDF accreditato → emesso, mail all'utente con QUEL file
    inviate.length = 0;
    const primo = await preparaCaricamentoById(certId);
    await caricaSuLink(primo.url, PDF_ACCREDITATO);
    uploadedPaths.push(primo.path);
    const emesso = await confermaCaricamentoById(certId, primo.path, uid);
    expect(emesso).toMatchObject({ status: "issued", number, sostituito: false });
    expect(inviate.map((m) => m.to)).toEqual([email]);
    expect(inviate[0].allegati[0].nome).toBe(`Certificato-${number}.pdf`);
    expect(Buffer.from(inviate[0].allegati[0].contenuto)).toEqual(Buffer.from(PDF_ACCREDITATO));

    // ora l'utente scarica l'accreditato, e la verifica dice "valido" con lo stesso numero
    expect((await certificatoPerDownload(certId, { userId: uid, staff: false }))?.tipo).toBe("accreditato");
    const v = await getCertificatoPerChiave(number);
    expect(v?.valid).toBe(true);
    expect(v?.number).toBe(number);

    // secondo caricamento: senza conferma di sostituzione → rifiutato; con conferma → sostituito
    const secondo = await preparaCaricamentoById(certId);
    await caricaSuLink(secondo.url, PDF_ACCREDITATO);
    uploadedPaths.push(secondo.path);
    await expect(confermaCaricamentoById(certId, secondo.path, uid)).rejects.toThrow(/già accreditato/);
    const sost = await confermaCaricamentoById(certId, secondo.path, uid, { sostituisci: true });
    expect(sost.sostituito).toBe(true);
    const replaced = await db
      .select({ id: activityLog.id })
      .from(activityLog)
      .where(and(eq(activityLog.organizationId, orgId), eq(activityLog.verb, "certificate-replaced")));
    expect(replaced.length).toBe(1);

    // catena audit valida (requested, issued, replaced)
    expect((await verifyChain(orgId)).valid).toBe(true);

    // revoca → verifica non valida, niente download, niente caricamenti
    await revokeCertificateById(certId, uid, "test");
    const v2 = await getCertificatoPerChiave(number);
    expect(v2?.valid).toBe(false);
    expect(v2?.status).toBe("revoked");
    expect(await certificatoPerDownload(certId, { userId: uid, staff: false })).toBeNull();
    await expect(preparaCaricamentoById(certId)).rejects.toThrow(/revocato/);
  }, 180000);
});
