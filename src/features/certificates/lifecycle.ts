// Ciclo di vita del certificato: predisposizione (ready_for_review) automatica al
// raggiungimento dei requisiti, APPROVAZIONE UMANA dello staff (mai automatica) che
// genera PDF+QR, archivia e emette, verifica pubblica, revoca. Eventi nella catena audit.

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { certificate, enrollment, course, user } from "@/lib/db/schema";
import { isReadyForCertificate } from "./readiness";
import { buildCertificatePdf } from "./pdf";
import { appendActivity, auditContextFromEnrollment } from "@/features/audit/log";
import { uploadCertificatePdf, signedCertificateUrl } from "@/lib/supabase/storage";
import { sendCertificateIssuedEmail } from "@/lib/email/resend";
import { requirePlatformAdmin, requireSession, isPlatformStaffEmail } from "@/features/auth/guards";
import { withTenant, type TenantCtx } from "@/lib/db/tenant";

function makeCertificateNumber(date: Date, verifyUuid: string): string {
  return `EVALIS-${date.getFullYear()}-${verifyUuid.slice(0, 8).toUpperCase()}`;
}

function verifyUrlFor(verifyUuid: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}/verify/${verifyUuid}`;
}

/**
 * Predispone il certificato (ready_for_review) SOLO se i requisiti sono soddisfatti.
 * Idempotente (unique enrollment). Da chiamare dal layer app (post-esame/dashboard),
 * NON dal quiz engine (evita cicli di import).
 */
export async function ensureCertificateRecord(
  enrollmentId: string,
  ctx: TenantCtx = {},
): Promise<{ id: string; status: string } | null> {
  const readiness = await isReadyForCertificate(enrollmentId, ctx);
  if (!readiness.ready) return null;

  return withTenant(ctx, async (tx) => {
    const [existing] = await tx
      .select({ id: certificate.id, status: certificate.status })
      .from(certificate)
      .where(eq(certificate.enrollmentId, enrollmentId))
      .limit(1);
    if (existing) return existing;

    const inserted = await tx
      .insert(certificate)
      .values({ enrollmentId, status: "ready_for_review" })
      .onConflictDoNothing({ target: certificate.enrollmentId })
      .returning({ id: certificate.id, status: certificate.status });
    if (inserted.length === 0) {
      const [c] = await tx
        .select({ id: certificate.id, status: certificate.status })
        .from(certificate)
        .where(eq(certificate.enrollmentId, enrollmentId))
        .limit(1);
      return c;
    }
    const { organizationId, userId } = await auditContextFromEnrollment(tx, enrollmentId);
    await appendActivity(tx, {
      organizationId,
      userId,
      verb: "certificate-requested",
      object: `certificate:${inserted[0].id}`,
    });
    return inserted[0];
  });
}

/** Coda di revisione per lo staff piattaforma. */
export async function listPendingCertificates() {
  await requirePlatformAdmin();
  return withTenant({ platformAdmin: true }, async (tx) =>
    tx
      .select({
        id: certificate.id,
        enrollmentId: certificate.enrollmentId,
        learnerName: user.name,
        learnerEmail: user.email,
        courseTitle: course.title,
        createdAt: certificate.createdAt,
      })
      .from(certificate)
      .innerJoin(enrollment, eq(enrollment.id, certificate.enrollmentId))
      .innerJoin(user, eq(user.id, enrollment.userId))
      .innerJoin(course, eq(course.id, enrollment.courseId))
      .where(eq(certificate.status, "ready_for_review")),
  );
}

/** Logica di approvazione+emissione (testabile, senza guard). */
export async function approveCertificateById(
  certificateId: string,
  reviewerUserId: string,
  ctx: TenantCtx = {},
) {
  const [cert] = await withTenant(ctx, async (tx) =>
    tx.select().from(certificate).where(eq(certificate.id, certificateId)).limit(1),
  );
  if (!cert) throw new Error("Certificato inesistente.");
  if (cert.status === "issued") return { id: cert.id, status: "issued" as const, number: cert.number };
  if (cert.status === "revoked") throw new Error("Certificato revocato: non emettibile.");

  // ri-controllo dei requisiti al momento dell'emissione (difesa)
  const readiness = await isReadyForCertificate(cert.enrollmentId, ctx);
  if (!readiness.ready) throw new Error(`Requisiti non soddisfatti: ${readiness.reasons.join("; ")}`);

  const [info] = await withTenant(ctx, async (tx) =>
    tx
      .select({
        learnerName: user.name,
        learnerEmail: user.email,
        courseTitle: course.title,
        organizationId: enrollment.organizationId,
        userId: enrollment.userId,
      })
      .from(enrollment)
      .innerJoin(user, eq(user.id, enrollment.userId))
      .innerJoin(course, eq(course.id, enrollment.courseId))
      .where(eq(enrollment.id, cert.enrollmentId))
      .limit(1),
  );
  if (!info) throw new Error("Dati enrollment incompleti.");

  const now = new Date();
  const number = makeCertificateNumber(now, cert.verifyUuid);
  const verifyUrl = verifyUrlFor(cert.verifyUuid);

  const pdf = await buildCertificatePdf({
    learnerName: info.learnerName,
    courseTitle: info.courseTitle,
    issuedAt: now,
    number,
    verifyUrl,
  });
  const pdfPath = await uploadCertificatePdf(cert.verifyUuid, pdf);

  await withTenant(ctx, async (tx) => {
    await tx
      .update(certificate)
      .set({ status: "issued", number, pdfPath, approvedBy: reviewerUserId, approvedAt: now, issuedAt: now, updatedAt: now })
      .where(eq(certificate.id, certificateId));
    await appendActivity(tx, {
      organizationId: info.organizationId,
      userId: info.userId,
      verb: "certificate-issued",
      object: `certificate:${certificateId}`,
      payload: { number },
    });
  });

  // notifica best-effort: un guasto email non deve invalidare l'emissione
  await sendCertificateIssuedEmail({
    to: info.learnerEmail,
    learnerName: info.learnerName,
    courseTitle: info.courseTitle,
    verifyUrl,
  }).catch((e) => console.error("[email] certificate issued failed", e));

  return { id: certificateId, status: "issued" as const, number, verifyUrl };
}

/** Server Action: approvazione (solo staff piattaforma). */
export async function approveCertificate(certificateId: string) {
  const ctx = await requirePlatformAdmin();
  return approveCertificateById(certificateId, ctx.user.id, { platformAdmin: true });
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

/** Verifica pubblica (per token): dati minimi d'attestazione + validità. */
export async function getCertificateByVerifyUuid(verifyUuid: string) {
  const [row] = await db
    .select({
      status: certificate.status,
      number: certificate.number,
      issuedAt: certificate.issuedAt,
      learnerName: user.name,
      courseTitle: course.title,
    })
    .from(certificate)
    .innerJoin(enrollment, eq(enrollment.id, certificate.enrollmentId))
    .innerJoin(user, eq(user.id, enrollment.userId))
    .innerJoin(course, eq(course.id, enrollment.courseId))
    .where(eq(certificate.verifyUuid, verifyUuid))
    .limit(1);
  if (!row) return null;
  return {
    valid: row.status === "issued",
    status: row.status,
    number: row.number,
    issuedAt: row.issuedAt,
    learnerName: row.learnerName,
    courseTitle: row.courseTitle,
  };
}

/** Download protetto del PDF: solo il proprietario dell'enrollment o lo staff. */
export async function getCertificateDownloadUrl(certificateId: string): Promise<string> {
  const ctx = await requireSession();
  // staff vede tutti (valvola), altrimenti scope al proprio userId: in entrambi i casi
  // la lettura è gated dalla RLS, e il controllo ownership/staff sotto resta la barriera.
  const staff = isPlatformStaffEmail(ctx.user.email);
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
