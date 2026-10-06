// Ciclo di vita del certificato.
//  1. FINE CORSO (automatico, solo se i requisiti sono soddisfatti): nasce il record con numero e
//     QR. È il certificato PROVVISORIO: PDF generato al volo, mai salvato. Partono due mail:
//     all'utente col provvisorio, e al committente coi dati per preparare l'accreditato.
//  2. CERTIFICATO ACCREDITATO (sempre una persona): lo staff carica il PDF accreditato, che
//     sostituisce il provvisorio nell'area privata e parte via mail all'utente. Stesso numero e
//     stesso QR del provvisorio.
//  3. Verifica pubblica per QR o per numero; revoca. Ogni passaggio nella catena di audit.
// Il provvisorio automatico è una scelta esplicita dell'utente (02/10/2026): dichiara sempre di
// esserlo, e il certificato vero resta subordinato alla revisione umana.

import { randomUUID } from "node:crypto";
import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { certificate, enrollment, course, user, quiz, quizAttempt, anagraficaCertificato } from "@/lib/db/schema";
import { dataNascitaLeggibile, lucchettoAnagrafica } from "./anagrafica";
import { isReadyForCertificate } from "./readiness";
import { buildCertificatePdf } from "./pdf";
import {
  destinatarioCommittente,
  mailAccreditatoUtente,
  mailProvvisorioCommittente,
  mailProvvisorioUtente,
  nomeFileCertificato,
  type DatiCertificato,
} from "./notifiche";
import { appendActivity, auditContextFromEnrollment } from "@/features/audit/log";
import { signedCertificateUrl, linkCaricamentoCertificato, leggiCertificatoPdf, deleteCertificatePdf } from "@/lib/supabase/storage";
import { inviaEmailConAllegati } from "@/lib/email/resend";
import { requirePlatformAdmin, requireSession, isPlatformAdmin } from "@/features/auth/guards";
import { withTenant, type TenantCtx } from "@/lib/db/tenant";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Dimensione massima del certificato accreditato caricato. */
export const MAX_ACCREDITATO_BYTES = 20 * 1024 * 1024;

const baseUrl = () => (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

function makeCertificateNumber(date: Date, verifyUuid: string): string {
  return `EVALIS-${date.getFullYear()}-${verifyUuid.slice(0, 8).toUpperCase()}`;
}

function verifyUrlFor(verifyUuid: string): string {
  return `${baseUrl()}/verify/${verifyUuid}`;
}

/**
 * Crea il certificato (provvisorio) SOLO se i requisiti sono soddisfatti. Idempotente (unique
 * enrollment): una seconda chiamata restituisce lo stesso record e NON manda mail.
 * Da chiamare dal layer app (fine esame, pagina Certificati), NON dal quiz engine.
 */
export async function ensureCertificateRecord(
  enrollmentId: string,
  ctx: TenantCtx = {},
): Promise<{ id: string; status: string; number: string | null } | null> {
  const cols = { id: certificate.id, status: certificate.status, number: certificate.number };
  // Un certificato che ESISTE GIÀ non si ricontrolla mai: è stato concesso con le regole del
  // suo momento (per esempio con quiz intermedi esonerati) e una regola nuova non lo tocca.
  const [gia] = await withTenant(ctx, (tx) =>
    tx.select(cols).from(certificate).where(eq(certificate.enrollmentId, enrollmentId)).limit(1),
  );
  if (gia) return gia;

  const readiness = await isReadyForCertificate(enrollmentId, ctx);
  if (!readiness.ready) return null;

  const esito = await withTenant(ctx, async (tx) => {
    // stesso lucchetto del salvataggio dell'anagrafica: mentre il certificato nasce i dati del
    // titolare non possono cambiare (e viceversa)
    const titolare = await auditContextFromEnrollment(tx, enrollmentId);
    await tx.execute(lucchettoAnagrafica(titolare.userId));
    const [existing] = await tx.select(cols).from(certificate).where(eq(certificate.enrollmentId, enrollmentId)).limit(1);
    if (existing) return { cert: existing, nuovo: false };

    // numero e QR nascono qui: provvisorio e accreditato li condividono
    const verifyUuid = randomUUID();
    const inserted = await tx
      .insert(certificate)
      .values({ enrollmentId, status: "ready_for_review", verifyUuid, number: makeCertificateNumber(new Date(), verifyUuid) })
      .onConflictDoNothing({ target: certificate.enrollmentId })
      .returning(cols);
    if (inserted.length === 0) {
      const [c] = await tx.select(cols).from(certificate).where(eq(certificate.enrollmentId, enrollmentId)).limit(1);
      return { cert: c, nuovo: false };
    }
    await appendActivity(tx, {
      organizationId: titolare.organizationId,
      userId: titolare.userId,
      verb: "certificate-requested",
      object: `certificate:${inserted[0].id}`,
    });
    return { cert: inserted[0], nuovo: true };
  });

  // mail SOLO alla nascita e DOPO il salvataggio: un guasto email non tocca il certificato
  if (esito.nuovo) {
    await inviaMailCompletamento(esito.cert.id, ctx).catch((e) =>
      console.error(`[certificati] mail di completamento non inviate per ${esito.cert.id}`, e),
    );
  }
  return esito.cert;
}

type DatiCompleti = DatiCertificato & {
  id: string;
  status: string;
  verifyUuid: string;
  pdfPath: string | null;
  enrollmentId: string;
  ownerId: string;
};

/** Tutto ciò che serve a PDF, mail e controlli di un certificato. null se non visibile/inesistente. */
async function datiCertificato(certificateId: string, ctx: TenantCtx): Promise<DatiCompleti | null> {
  if (!UUID.test(certificateId)) return null;
  return withTenant(ctx, async (tx) => {
    const [r] = await tx
      .select({
        id: certificate.id,
        status: certificate.status,
        number: certificate.number,
        verifyUuid: certificate.verifyUuid,
        pdfPath: certificate.pdfPath,
        createdAt: certificate.createdAt,
        enrollmentId: certificate.enrollmentId,
        ownerId: enrollment.userId,
        learnerName: user.name,
        learnerEmail: user.email,
        courseTitle: course.title,
        courseId: course.id,
        requiredMinutes: course.requiredMinutes,
        codiceFiscale: anagraficaCertificato.codiceFiscale,
        dataNascita: anagraficaCertificato.dataNascita,
        luogoNascita: anagraficaCertificato.luogoNascita,
      })
      .from(certificate)
      .innerJoin(enrollment, eq(enrollment.id, certificate.enrollmentId))
      .innerJoin(user, eq(user.id, enrollment.userId))
      .innerJoin(course, eq(course.id, enrollment.courseId))
      .leftJoin(anagraficaCertificato, eq(anagraficaCertificato.userId, enrollment.userId))
      .where(eq(certificate.id, certificateId))
      .limit(1);
    if (!r) return null;
    const [esame] = await tx
      .select({ punteggio: sql<number | null>`max(${quizAttempt.score})` })
      .from(quizAttempt)
      .innerJoin(quiz, eq(quiz.id, quizAttempt.quizId))
      .where(and(eq(quizAttempt.enrollmentId, r.enrollmentId), eq(quiz.type, "final"), eq(quizAttempt.passed, true)));
    // i certificati nati prima di oggi non hanno numero: si usa la stessa regola dell'emissione
    const number = r.number ?? makeCertificateNumber(r.createdAt, r.verifyUuid);
    return {
      id: r.id,
      status: r.status,
      verifyUuid: r.verifyUuid,
      pdfPath: r.pdfPath,
      enrollmentId: r.enrollmentId,
      ownerId: r.ownerId,
      learnerName: r.learnerName,
      learnerEmail: r.learnerEmail,
      courseTitle: r.courseTitle,
      requiredMinutes: r.requiredMinutes,
      completatoIl: r.createdAt,
      number,
      verifyUrl: verifyUrlFor(r.verifyUuid),
      punteggio: esame?.punteggio ?? null,
      codiceFiscale: r.codiceFiscale,
      dataNascita: r.dataNascita,
      luogoNascita: r.luogoNascita,
    };
  });
}

function pdfProvvisorio(d: DatiCertificato): Promise<Uint8Array> {
  return buildCertificatePdf({
    learnerName: d.learnerName,
    courseTitle: d.courseTitle,
    issuedAt: d.completatoIl,
    number: d.number,
    verifyUrl: d.verifyUrl,
    provvisorio: true,
    ...(d.luogoNascita && d.dataNascita ? { nascita: `nato/a a ${d.luogoNascita} il ${dataNascitaLeggibile(d.dataNascita)}` } : {}),
  });
}

/** Le due mail di fine corso. Il committente le riceve solo dalla produzione vera. */
async function inviaMailCompletamento(certificateId: string, ctx: TenantCtx): Promise<void> {
  const d = await datiCertificato(certificateId, ctx);
  if (!d) return;
  const pdf = await pdfProvvisorio(d);
  const allegati = [{ nome: nomeFileCertificato(d.number, true), contenuto: pdf }];

  const utente = mailProvvisorioUtente(d, baseUrl());
  await inviaEmailConAllegati({ to: d.learnerEmail, ...utente, allegati }).catch((e) =>
    console.error(`[certificati] mail provvisorio all'utente non inviata (${d.number})`, e),
  );

  const committente = destinatarioCommittente();
  const perCommittente = mailProvvisorioCommittente(d, baseUrl());
  if (!committente) {
    console.info(`[certificati] (fuori produzione) mail al committente NON inviata: ${perCommittente.subject}`);
    return;
  }
  await inviaEmailConAllegati({ to: committente, ...perCommittente, allegati });
}

/**
 * Rete di sicurezza: per le iscrizioni dell'utente con l'esame finale superato e nessun
 * certificato, riprova a crearlo (i requisiti si ricontrollano tutti). Recupera chi ha finito
 * mentre mancava un requisito, o chi ha perso la chiamata di fine esame per un errore di rete.
 */
export async function assicuraCertificatiDi(userId: string): Promise<void> {
  const ctx: TenantCtx = { userId };
  const mancanti = await withTenant(ctx, async (tx) =>
    tx
      .selectDistinct({ id: enrollment.id })
      .from(enrollment)
      .innerJoin(quizAttempt, eq(quizAttempt.enrollmentId, enrollment.id))
      .innerJoin(quiz, eq(quiz.id, quizAttempt.quizId))
      .leftJoin(certificate, eq(certificate.enrollmentId, enrollment.id))
      .where(and(eq(enrollment.userId, userId), eq(quiz.type, "final"), eq(quizAttempt.passed, true), isNull(certificate.id))),
  );
  for (const m of mancanti) {
    await ensureCertificateRecord(m.id, ctx).catch((e) => console.error(`[certificati] recupero fallito per ${m.id}`, e));
  }
}

export type StatoFiltro = "tutti" | "attesa" | "accreditati" | "revocati";
const STATO_DB = { attesa: "ready_for_review", accreditati: "issued", revocati: "revoked" } as const;

/** Console staff: tutti i certificati, cercabili per nome, email o numero. */
export async function listCertificatiStaff(filtro: { q?: string; stato?: StatoFiltro } = {}) {
  await requirePlatformAdmin();
  const q = filtro.q?.trim().slice(0, 100);
  const condizioni = [
    q ? or(ilike(user.name, `%${q}%`), ilike(user.email, `%${q}%`), ilike(certificate.number, `%${q}%`)) : undefined,
    filtro.stato && filtro.stato !== "tutti" ? eq(certificate.status, STATO_DB[filtro.stato]) : undefined,
  ].filter(Boolean);
  return withTenant({ platformAdmin: true }, async (tx) =>
    tx
      .select({
        id: certificate.id,
        status: certificate.status,
        number: certificate.number,
        learnerName: user.name,
        learnerEmail: user.email,
        courseTitle: course.title,
        createdAt: certificate.createdAt,
        issuedAt: certificate.issuedAt,
        codiceFiscale: anagraficaCertificato.codiceFiscale,
        dataNascita: anagraficaCertificato.dataNascita,
        luogoNascita: anagraficaCertificato.luogoNascita,
      })
      .from(certificate)
      .innerJoin(enrollment, eq(enrollment.id, certificate.enrollmentId))
      .innerJoin(user, eq(user.id, enrollment.userId))
      .innerJoin(course, eq(course.id, enrollment.courseId))
      .leftJoin(anagraficaCertificato, eq(anagraficaCertificato.userId, enrollment.userId))
      .where(condizioni.length ? and(...condizioni) : undefined)
      .orderBy(desc(certificate.createdAt))
      .limit(200),
  );
}

const percorsoAccreditato = (verifyUuid: string) => `accreditati/${verifyUuid}-${Date.now()}.pdf`;
const percorsoValido = (verifyUuid: string, path: string) =>
  new RegExp(`^accreditati/${verifyUuid}-\\d{13}\\.pdf$`).test(path);

/** Primo passo del caricamento: il server decide il percorso e firma il link (testabile, senza guard). */
export async function preparaCaricamentoById(certificateId: string, ctx: TenantCtx = { platformAdmin: true }) {
  const d = await datiCertificato(certificateId, ctx);
  if (!d) throw new Error("Certificato inesistente.");
  if (d.status === "revoked") throw new Error("Certificato revocato: non si può caricare.");
  const path = percorsoAccreditato(d.verifyUuid);
  return { path, url: await linkCaricamentoCertificato(path) };
}

/**
 * Secondo passo: il file è su Storage. Si controlla TUTTO prima di emettere — percorso del
 * certificato giusto, file presente, PDF vero, dimensione — poi stato `issued`, audit e mail.
 * Su un certificato già accreditato serve `sostituisci` (file sbagliato da correggere).
 */
export async function confermaCaricamentoById(
  certificateId: string,
  path: string,
  reviewerUserId: string,
  opts: { sostituisci?: boolean } = {},
  ctx: TenantCtx = { platformAdmin: true },
) {
  const d = await datiCertificato(certificateId, ctx);
  if (!d) throw new Error("Certificato inesistente.");
  if (d.status === "revoked") throw new Error("Certificato revocato: non si può caricare.");
  if (d.status === "issued" && !opts.sostituisci) throw new Error("Il certificato è già accreditato: conferma la sostituzione.");
  if (!percorsoValido(d.verifyUuid, path)) throw new Error("File non riconosciuto per questo certificato.");

  const bytes = await leggiCertificatoPdf(path);
  if (!bytes) throw new Error("Il file non risulta caricato: riprova.");
  const pdfVero = Buffer.from(bytes.slice(0, 5)).toString("latin1") === "%PDF-";
  if (!pdfVero || bytes.length > MAX_ACCREDITATO_BYTES) {
    await deleteCertificatePdf(path).catch(() => {});
    throw new Error(pdfVero ? "Il file supera 20 MB." : "Il file non è un PDF.");
  }

  const sostituzione = d.status === "issued";
  const now = new Date();
  await withTenant(ctx, async (tx) => {
    await tx
      .update(certificate)
      .set({
        status: "issued",
        number: d.number,
        pdfPath: path,
        approvedBy: reviewerUserId,
        approvedAt: now,
        ...(sostituzione ? {} : { issuedAt: now }),
        updatedAt: now,
      })
      .where(eq(certificate.id, certificateId));
    const { organizationId, userId } = await auditContextFromEnrollment(tx, d.enrollmentId);
    await appendActivity(tx, {
      organizationId,
      userId,
      verb: sostituzione ? "certificate-replaced" : "certificate-issued",
      object: `certificate:${certificateId}`,
      payload: { number: d.number, file: path },
    });
  });

  // mail best-effort: il certificato è già emesso e scaricabile dall'area privata
  const mail = mailAccreditatoUtente(d, baseUrl(), sostituzione);
  await inviaEmailConAllegati({
    to: d.learnerEmail,
    ...mail,
    allegati: [{ nome: nomeFileCertificato(d.number, false), contenuto: bytes }],
  }).catch((e) => console.error(`[certificati] mail accreditato non inviata (${d.number})`, e));

  return { id: certificateId, status: "issued" as const, number: d.number, sostituito: sostituzione };
}

/** Server Action: link di caricamento (solo staff piattaforma). */
export async function preparaCaricamento(certificateId: string) {
  await requirePlatformAdmin();
  return preparaCaricamentoById(certificateId);
}

/** Server Action: conferma del caricamento ed emissione (solo staff piattaforma). */
export async function confermaCaricamento(certificateId: string, path: string, sostituisci: boolean) {
  const ctx = await requirePlatformAdmin();
  return confermaCaricamentoById(certificateId, path, ctx.user.id, { sostituisci });
}

/** Logica di revoca (testabile, senza guard). */
export async function revokeCertificateById(
  certificateId: string,
  _reviewerUserId: string,
  reason: string,
  ctx: TenantCtx = {},
) {
  const now = new Date();
  return withTenant(ctx, async (tx) => {
    const [cert] = await tx
      .select({ id: certificate.id, enrollmentId: certificate.enrollmentId })
      .from(certificate)
      .where(eq(certificate.id, certificateId))
      .limit(1);
    if (!cert) throw new Error("Certificato inesistente.");

    await tx
      .update(certificate)
      .set({ status: "revoked", revokedAt: now, updatedAt: now })
      .where(eq(certificate.id, certificateId));
    const { organizationId, userId } = await auditContextFromEnrollment(tx, cert.enrollmentId);
    await appendActivity(tx, {
      organizationId,
      userId,
      verb: "certificate-revoked",
      object: `certificate:${certificateId}`,
      payload: { reason },
    });
    return { id: certificateId, status: "revoked" as const };
  });
}

/** Server Action: revoca (solo staff piattaforma). */
export async function revokeCertificate(certificateId: string, reason: string) {
  const ctx = await requirePlatformAdmin();
  return revokeCertificateById(certificateId, ctx.user.id, reason, { platformAdmin: true });
}

/**
 * Verifica pubblica per CHIAVE: il codice del QR (uuid) oppure il numero stampato
 * (EVALIS-2026-XXXXXXXX, maiuscole o minuscole). Funzione SECURITY DEFINER (migrazione 0030):
 * legge UN solo certificato con i dati minimi d'attestazione. Qualunque input sporco → null.
 */
export async function getCertificatoPerChiave(chiave: string) {
  const k = chiave.trim().slice(0, 64);
  if (!k) return null;
  const rows = (await db.execute(
    sql`SELECT status, number, created_at, issued_at, learner_name, course_title FROM verifica_certificato(${k})`,
  )) as unknown as {
    status: string;
    number: string | null;
    created_at: Date;
    issued_at: Date | null;
    learner_name: string;
    course_title: string;
  }[];
  const row = rows[0];
  if (!row) return null;
  return {
    valid: row.status === "issued",
    provvisorio: row.status === "ready_for_review",
    status: row.status,
    number: row.number,
    completedAt: row.created_at,
    issuedAt: row.issued_at,
    learnerName: row.learner_name,
    courseTitle: row.course_title,
  };
}

/** Download protetto del PDF ACCREDITATO: solo il proprietario dell'enrollment o lo staff. */
export async function getCertificateDownloadUrl(certificateId: string): Promise<string> {
  const ctx = await requireSession();
  // staff vede tutti (valvola), altrimenti scope al proprio userId: in entrambi i casi
  // la lettura è gated dalla RLS, e il controllo ownership/staff sotto resta la barriera.
  // L-1 (audit go-live): stessa nozione di staff di approve/revoke (platformRole OR allowlist),
  // così un admin via platformRole non-allowlist può scaricare quello che può approvare.
  const staff = isPlatformAdmin(ctx.user as { email: string; platformRole?: string | null });
  const tenantCtx: TenantCtx = staff ? { platformAdmin: true } : { userId: ctx.user.id };
  const [cert] = await withTenant(tenantCtx, async (tx) =>
    tx
      .select({ pdfPath: certificate.pdfPath, ownerId: enrollment.userId })
      .from(certificate)
      .innerJoin(enrollment, eq(enrollment.id, certificate.enrollmentId))
      .where(eq(certificate.id, certificateId))
      .limit(1),
  );
  if (!cert || !cert.pdfPath) throw new Error("Certificato non disponibile.");
  const isOwner = cert.ownerId === ctx.user.id;
  if (!isOwner && !staff) throw new Error("Permesso negato.");
  return signedCertificateUrl(cert.pdfPath);
}

/**
 * Il PDF del certificato per la rotta /api/certificato/[id]: il PROVVISORIO generato al volo
 * finché l'accreditato non c'è, poi il link all'accreditato. Stessa barriera del download:
 * proprietario o staff. `null` sia per un id inesistente sia per uno altrui.
 */
export async function certificatoPerDownload(
  certificateId: string,
  chi: { userId: string; staff: boolean },
): Promise<{ tipo: "provvisorio"; nome: string; pdf: Uint8Array } | { tipo: "accreditato"; url: string } | null> {
  const d = await datiCertificato(certificateId, chi.staff ? { platformAdmin: true } : { userId: chi.userId });
  if (!d || (!chi.staff && d.ownerId !== chi.userId)) return null;
  if (d.status === "issued" && d.pdfPath) return { tipo: "accreditato", url: await signedCertificateUrl(d.pdfPath) };
  if (d.status === "ready_for_review") return { tipo: "provvisorio", nome: nomeFileCertificato(d.number, true), pdf: await pdfProvvisorio(d) };
  return null;
}
