// La presa d'atto dell'avviso ISO 19011 entra nel registro solo quando l'avviso aveva senso:
// corso esistente soggetto alla regola, utente senza 19011. Una sola riga per
// (azienda, utente, corso). Prima si poteva scrivere nel registro qualsiasi testo come "corso",
// anche enorme, e ripeterlo all'infinito.

import { describe, it, expect, afterAll, vi } from "vitest";
import { and, eq, inArray, sql } from "drizzle-orm";

let attivo = { user: { id: "" }, orgId: "" };
vi.mock("@/features/auth/guards", async (orig) => ({
  ...(await orig<typeof import("@/features/auth/guards")>()),
  requireActiveOrg: async () => attivo,
}));
vi.mock("@/lib/email/resend", () => ({
  sendPasswordResetEmail: vi.fn(async () => ({ sent: false })),
  sendVerificationEmail: vi.fn(async () => ({ sent: false })),
  sendOrgInvitationEmail: vi.fn(async () => ({ sent: false })),
}));

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user, organization, course, activityLog, userOnboarding } from "@/lib/db/schema";
import { firstMembershipOrgId } from "@/features/auth/guards";
import { createCompanyOrg } from "@/features/auth/orgs";
import { ingestCourse } from "@/features/courses/ingest";
import { sampleCourse } from "@/features/courses/seed";
import { verifyChain } from "@/features/audit/log";
import { acknowledgeIso19011AdvisoryAction } from "@/features/prerequisites/server-actions";

const RUN = Date.now();
const userIds: string[] = [];
const orgIds: string[] = [];
const courseIds: string[] = [];
const VERBO = "iso19011-advisory-acknowledged";

afterAll(async () => {
  if (orgIds.length) {
    await db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL app.audit_maintenance = 'on'`);
      await tx.delete(activityLog).where(inArray(activityLog.organizationId, orgIds));
    });
  }
  if (courseIds.length) {
    await db.update(course).set({ prerequisiteCourseId: null }).where(inArray(course.id, courseIds));
    await db.delete(course).where(inArray(course.id, courseIds));
  }
  if (orgIds.length) await db.delete(organization).where(inArray(organization.id, orgIds));
  if (userIds.length) await db.delete(user).where(inArray(user.id, userIds));
});

async function utente(tag: string) {
  const r = await auth.api.signUpEmail({ body: { name: tag, email: `avv19011-${tag}+${RUN}@example.test`, password: "Password-123!" } });
  userIds.push(r.user.id);
  const orgId = (await firstMembershipOrgId(r.user.id))!;
  orgIds.push(orgId);
  return { uid: r.user.id, orgId };
}

async function righe(orgId: string, uid: string) {
  return db
    .select({ id: activityLog.id, object: activityLog.object })
    .from(activityLog)
    .where(and(eq(activityLog.organizationId, orgId), eq(activityLog.userId, uid), eq(activityLog.verb, VERBO)));
}

describe("avviso ISO 19011 — presa d'atto nel registro", () => {
  it("solo per un corso ISO vero, una volta per azienda/utente/corso", async () => {
    const { courseId: c19011 } = await ingestCourse(sampleCourse());
    const { courseId: cIso } = await ingestCourse(sampleCourse());
    const { courseId: cLibero } = await ingestCourse(sampleCourse());
    courseIds.push(c19011, cIso, cLibero);
    await db.update(course).set({ prerequisiteCourseId: c19011 }).where(eq(course.id, cIso));

    const A = await utente("a");
    attivo = { user: { id: A.uid }, orgId: A.orgId };

    // rifiutate in silenzio, nessuna riga
    for (const id of ["non-un-uuid", "x".repeat(900_000), crypto.randomUUID(), cLibero, c19011]) {
      await acknowledgeIso19011AdvisoryAction(id);
    }
    expect(await righe(A.orgId, A.uid)).toHaveLength(0);

    // corso ISO, utente senza 19011: una riga, la seconda chiamata non ne aggiunge
    await acknowledgeIso19011AdvisoryAction(cIso);
    await acknowledgeIso19011AdvisoryAction(cIso);
    expect((await righe(A.orgId, A.uid)).map((r) => r.object)).toEqual([`course:${cIso}`]);

    // stesso utente, altra azienda attiva: nuova prova per quel contesto
    const azienda = await createCompanyOrg({ name: "Azienda prova 19011", slug: `avv19011-${RUN}`, seatLimit: 5, ownerUserId: A.uid });
    orgIds.push(azienda);
    attivo = { user: { id: A.uid }, orgId: azienda };
    await acknowledgeIso19011AdvisoryAction(cIso);
    expect(await righe(azienda, A.uid)).toHaveLength(1);

    // utente che ha dichiarato la 19011: l'avviso non gli viene mostrato, niente riga
    const B = await utente("b");
    await db.insert(userOnboarding).values({ userId: B.uid, organizationId: B.orgId, persona: "b2c", iso19011Certified: true });
    attivo = { user: { id: B.uid }, orgId: B.orgId };
    await acknowledgeIso19011AdvisoryAction(cIso);
    expect(await righe(B.orgId, B.uid)).toHaveLength(0);

    expect((await verifyChain(A.orgId)).valid).toBe(true);
    expect((await verifyChain(azienda)).valid).toBe(true);
  }, 120_000);
});
