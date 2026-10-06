// L'app non ha una funzione per eliminare le aziende: l'endpoint di better-auth resta spento,
// perché eliminare l'organizzazione cancellerebbe a cascata i ticket dei dipendenti.
// "Lascia l'azienda" e "rimuovi membro" devono continuare a funzionare.

import { describe, it, expect, afterAll, vi } from "vitest";
import { and, eq, inArray, sql, like } from "drizzle-orm";

vi.mock("@/lib/email/resend", () => ({
  sendPasswordResetEmail: vi.fn(async () => ({ sent: false })),
  sendVerificationEmail: vi.fn(async () => ({ sent: false })),
  sendOrgInvitationEmail: vi.fn(async () => ({ sent: false })),
}));

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user, organization, member, activityLog } from "@/lib/db/schema";

const RUN = Date.now();
const userIds: string[] = [];

afterAll(async () => {
  const orgs = await db.select({ id: organization.id }).from(organization).where(like(organization.slug, `%${RUN}%`));
  const pers = userIds.map((u) => `u-${u}`);
  const tutte = [...orgs.map((o) => o.id)];
  if (pers.length) {
    const p = await db.select({ id: organization.id }).from(organization).where(inArray(organization.slug, pers));
    tutte.push(...p.map((o) => o.id));
  }
  if (tutte.length) {
    await db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL app.audit_maintenance = 'on'`);
      await tx.delete(activityLog).where(inArray(activityLog.organizationId, tutte));
    });
    await db.delete(organization).where(inArray(organization.id, tutte));
  }
  if (userIds.length) await db.delete(user).where(inArray(user.id, userIds));
});

async function utente(tag: string) {
  const email = `elimina-${tag}+${RUN}@example.test`;
  const su = await auth.api.signUpEmail({ body: { name: tag, email, password: "Password-123!" } });
  userIds.push(su.user.id);
  await db.update(user).set({ emailVerified: true }).where(eq(user.id, su.user.id));
  const r = await auth.api.signInEmail({ body: { email, password: "Password-123!" }, asResponse: true });
  return { uid: su.user.id, headers: new Headers({ cookie: r.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ") }) };
}

describe("eliminazione azienda via better-auth", () => {
  it("il titolare non può eliminare l'azienda; lasciare e rimuovere membri funziona", async () => {
    const T = await utente("titolare");
    const B = await utente("b");
    const C = await utente("c");
    const org = (await auth.api.createOrganization({ body: { name: "Elimina", slug: `elimina-${RUN}` }, headers: T.headers }))!;
    await db.insert(member).values([
      { id: `m-b-${RUN}`, organizationId: org.id, userId: B.uid, role: "member", createdAt: new Date() },
      { id: `m-c-${RUN}`, organizationId: org.id, userId: C.uid, role: "member", createdAt: new Date() },
    ]);

    let rifiutato = false;
    try {
      await auth.api.deleteOrganization({ body: { organizationId: org.id }, headers: T.headers });
    } catch {
      rifiutato = true;
    }
    expect(rifiutato).toBe(true);
    expect(await db.select({ id: organization.id }).from(organization).where(eq(organization.id, org.id))).toHaveLength(1);

    await auth.api.leaveOrganization({ body: { organizationId: org.id }, headers: B.headers });
    expect(
      await db.select({ id: member.id }).from(member).where(and(eq(member.organizationId, org.id), eq(member.userId, B.uid))),
    ).toHaveLength(0);

    await auth.api.removeMember({ body: { memberIdOrEmail: `m-c-${RUN}`, organizationId: org.id }, headers: T.headers });
    expect(
      await db.select({ id: member.id }).from(member).where(and(eq(member.organizationId, org.id), eq(member.userId, C.uid))),
    ).toHaveLength(0);
  });
});
