// Audit B10 e B12.
// B10: aprendo il quiz due volte (due schede) PRIMA di consegnare, dopo una bocciatura si
//      consegnava subito il secondo tentativo saltando l'attesa. Ora la consegna è rifiutata
//      finché un altro tentativo dello stesso quiz è in attesa. Aprire un nuovo tentativo non
//      viene mai bloccato da questa regola: chi ricarica la pagina non resta fermo.
// B12: il controllo "dati anagrafici bloccati" e il salvataggio erano due passi separati: un
//      salvataggio mandato nell'istante in cui nasceva il certificato passava lo stesso.

import { describe, it, expect, afterAll, beforeAll, vi } from "vitest";
import { and, asc, eq, inArray, sql } from "drizzle-orm";

vi.mock("@/lib/email/resend", async (orig) => ({
  ...(await orig<typeof import("@/lib/email/resend")>()),
  inviaEmailConAllegati: vi.fn(async () => ({ sent: false })), // nessuna mail vera
}));

import { db } from "@/lib/db";
import {
  user, organization, member, course, enrollment, slide, lesson, module, quiz, quizQuestion, quizAttempt,
  slideProgress, certificate, anagraficaCertificato, activityLog,
} from "@/lib/db/schema";
import { serializeOrgMetadata } from "@/features/auth/org-metadata";
import { ingestCourse } from "@/features/courses/ingest";
import { sampleCourse } from "@/features/courses/seed";
import { startQuiz, submitQuiz } from "@/features/quiz/engine";
import { salvaAnagrafica } from "@/features/certificates/anagrafica";
import { ensureCertificateRecord } from "@/features/certificates/lifecycle";

const RUN = Date.now();
const ORG = `attesa-org-${RUN}`;
const utenti: string[] = [];
let courseId = "", cp = "", fin = "";
let slideIds: string[] = [];
let giuste = new Map<string, string>();

async function discente(tag: string) {
  const id = `attesa-${tag}-${RUN}`;
  utenti.push(id);
  const ora = new Date();
  await db.insert(user).values({ id, name: `Nome ${tag}`, email: `${id}@example.test`, emailVerified: true, createdAt: ora, updatedAt: ora });
  await db.insert(member).values({ id: `m-${id}`, organizationId: ORG, userId: id, role: "member", createdAt: ora });
  const [e] = await db.insert(enrollment).values({ organizationId: ORG, userId: id, courseId, source: "manual", status: "active" }).returning({ id: enrollment.id });
  return { id, enr: e.id, ctx: { userId: id } };
}
type Avviato = Awaited<ReturnType<typeof startQuiz>>;
const risposte = (s: Avviato, corrette: boolean) =>
  s.questions.map((q) => {
    const ok = giuste.get(q.id)!;
    const altre = (q.options as { id: string }[]).map((o) => o.id).filter((x) => x !== ok);
    return { questionId: q.id, optionId: corrette ? ok : altre[0] };
  });
const rifiuto = async (p: Promise<unknown>) => p.then(() => null, (e: Error) => e.message);

beforeAll(async () => {
  await db.insert(organization).values({ id: ORG, name: ORG, slug: ORG, createdAt: new Date(), metadata: serializeOrgMetadata({ type: "company", seatLimit: 50 }) });
  ({ courseId } = await ingestCourse({ ...sampleCourse(), title: `Corso attesa ${RUN}` }));
  const qs = await db.select({ id: quiz.id, type: quiz.type }).from(quiz).where(eq(quiz.courseId, courseId));
  cp = qs.find((q) => q.type === "checkpoint")!.id;
  fin = qs.find((q) => q.type === "final")!.id; // attesa 60 secondi dopo una bocciatura
  const banca = await db.select({ id: quizQuestion.id, ok: quizQuestion.correctOptionId }).from(quizQuestion).where(inArray(quizQuestion.quizId, [cp, fin]));
  giuste = new Map(banca.map((q) => [q.id, q.ok as string]));
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

describe("B10 — attesa dopo un quiz fallito", () => {
  it("due tentativi aperti: bocciato il primo, il secondo NON si può consegnare subito; dopo l'attesa sì", async () => {
    const d = await discente("b10");
    const primo = await startQuiz(d.enr, fin, d.ctx);
    const secondo = await startQuiz(d.enr, fin, d.ctx); // seconda scheda, aperta prima di consegnare

    const r1 = await submitQuiz(primo.attemptId, risposte(primo, false), d.ctx);
    expect(r1.passed).toBe(false);
    expect(r1.lockedUntil).toBeTruthy();

    const errore = await rifiuto(submitQuiz(secondo.attemptId, risposte(secondo, true), d.ctx));
    expect(errore).toMatch(/potrai riprovare/i);
    const [stato] = await db.select({ inviato: quizAttempt.submittedAt, passed: quizAttempt.passed }).from(quizAttempt).where(eq(quizAttempt.id, secondo.attemptId));
    expect(stato.inviato).toBeNull(); // il tentativo resta aperto, non valutato

    // anche aprire un tentativo nuovo durante l'attesa dà il messaggio (comportamento di prima)
    expect(await rifiuto(startQuiz(d.enr, fin, d.ctx))).toMatch(/potrai riprovare/i);

    // attesa finita (simulata): il secondo tentativo ora si consegna
    await db.update(quizAttempt).set({ lockedUntil: new Date(Date.now() - 1000) }).where(eq(quizAttempt.id, primo.attemptId));
    const r2 = await submitQuiz(secondo.attemptId, risposte(secondo, true), d.ctx);
    expect(r2.passed).toBe(true);
  });

  it("consegne simultanee di due tentativi (una sbagliata, una giusta): la giusta vale solo se arriva prima della bocciatura", async () => {
    for (let i = 0; i < 8; i++) {
      const d = await discente(`gara${i}`);
      const a = await startQuiz(d.enr, fin, d.ctx);
      const b = await startQuiz(d.enr, fin, d.ctx);
      await Promise.allSettled([
        submitQuiz(a.attemptId, risposte(a, false), d.ctx),
        submitQuiz(b.attemptId, risposte(b, true), d.ctx),
      ]);
      const righe = await db.select({ id: quizAttempt.id, passed: quizAttempt.passed, inviato: quizAttempt.submittedAt }).from(quizAttempt).where(eq(quizAttempt.enrollmentId, d.enr));
      const A = righe.find((r) => r.id === a.attemptId)!;
      const B = righe.find((r) => r.id === b.attemptId)!;
      expect(A.passed).toBe(false); // la sbagliata viene sempre valutata
      if (B.passed) expect(B.inviato!.getTime()).toBeLessThanOrEqual(A.inviato!.getTime()); // mai "promosso" DOPO la bocciatura
    }
  }, 120_000);

  it("quiz senza attesa (checkpoint del corso di prova): due tentativi aperti si consegnano entrambi", async () => {
    const d = await discente("senzaattesa");
    const a = await startQuiz(d.enr, cp, d.ctx);
    const b = await startQuiz(d.enr, cp, d.ctx);
    expect((await submitQuiz(a.attemptId, risposte(a, false), d.ctx)).passed).toBe(false);
    expect((await submitQuiz(b.attemptId, risposte(b, true), d.ctx)).passed).toBe(true);
  });
});

describe("B12 — anagrafica e nascita del certificato", () => {
  const dati = (luogo: string) => ({ codiceFiscale: "RSSMRA80A01H501U", dataNascita: "1980-01-01", luogoNascita: luogo });

  it("salvataggio e nascita del certificato nello stesso istante: mai certificato nato e poi dati cambiati", async () => {
    for (let i = 0; i < 10; i++) {
      const d = await discente(`b12-${i}`);
      const ora = new Date();
      await salvaAnagrafica(d.id, dati("Roma"));
      await db.insert(slideProgress).values(slideIds.map((slideId) => ({ enrollmentId: d.enr, slideId, effectiveSeconds: 40, audioCompleted: true, completedAt: ora, updatedAt: ora })));
      await db.insert(quizAttempt).values([cp, fin].map((quizId) => ({ enrollmentId: d.enr, quizId, startedAt: ora, submittedAt: ora, passed: true, score: 100 })));

      const [cert, salva] = await Promise.allSettled([ensureCertificateRecord(d.enr, d.ctx), salvaAnagrafica(d.id, dati("Milano"))]);
      expect(cert.status).toBe("fulfilled");
      const [c] = await db.select({ creato: certificate.createdAt }).from(certificate).where(eq(certificate.enrollmentId, d.enr));
      const [a] = await db.select({ luogo: anagraficaCertificato.luogoNascita, aggiornato: anagraficaCertificato.updatedAt }).from(anagraficaCertificato).where(eq(anagraficaCertificato.userId, d.id));
      expect(c).toBeTruthy();
      if (salva.status === "fulfilled") {
        // il salvataggio è passato: allora è avvenuto PRIMA che il certificato nascesse
        expect(a.luogo).toBe("Milano");
        expect(a.aggiornato.getTime()).toBeLessThanOrEqual(c.creato.getTime());
      } else {
        expect(a.luogo).toBe("Roma"); // rifiutato: i dati sono rimasti quelli del certificato
      }
      // in ogni caso, a certificato nato i dati non si cambiano più
      expect(await rifiuto(salvaAnagrafica(d.id, dati("Torino")))).toMatch(/già stati usati/);
    }
  }, 180_000);

  it("mentre il certificato sta nascendo il salvataggio ASPETTA, e poi viene rifiutato", async () => {
    const d = await discente("b12-lucchetto");
    await salvaAnagrafica(d.id, dati("Roma"));
    let finito = false;
    const salvataggio = await db.transaction(async (tx) => {
      // stesso lucchetto che prende la nascita del certificato
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${"anagrafica:" + d.id}))`);
      const p = salvaAnagrafica(d.id, dati("Milano")).then(() => null, (e: Error) => e.message).finally(() => { finito = true; });
      await new Promise((r) => setTimeout(r, 1500));
      expect(finito).toBe(false); // non è passato davanti alla nascita del certificato
      await tx.insert(certificate).values({ enrollmentId: d.enr, status: "ready_for_review", number: `EVALIS-B12-${RUN}` });
      return { p }; // in un oggetto: la transazione deve chiudersi (e rilasciare il lucchetto) senza aspettarlo
    });
    expect(await salvataggio.p).toMatch(/già stati usati/);
    const [a] = await db.select({ luogo: anagraficaCertificato.luogoNascita }).from(anagraficaCertificato).where(eq(anagraficaCertificato.userId, d.id));
    expect(a.luogo).toBe("Roma");
  });

  it("senza certificato l'anagrafica si salva e si corregge come prima", async () => {
    const d = await discente("b12-libero");
    await salvaAnagrafica(d.id, dati("Roma"));
    await salvaAnagrafica(d.id, dati("Napoli"));
    const [a] = await db.select({ luogo: anagraficaCertificato.luogoNascita }).from(anagraficaCertificato).where(and(eq(anagraficaCertificato.userId, d.id)));
    expect(a.luogo).toBe("Napoli");
  });
});
