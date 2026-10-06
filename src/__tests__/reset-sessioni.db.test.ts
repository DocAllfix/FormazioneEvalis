// Reset della password con il vero better-auth: dopo il reset le sessioni aperte prima non valgono
// più, e la nuova password funziona. Nessuna mail parte davvero: l'invio è sostituito da uno stub
// che cattura il link.

import { describe, it, expect, afterAll, vi } from "vitest";
import { eq, inArray, sql } from "drizzle-orm";

const links: string[] = [];
vi.mock("@/lib/email/resend", () => ({
  sendPasswordResetEmail: vi.fn(async (d: { url: string }) => {
    links.push(d.url);
    return { sent: false };
  }),
  sendVerificationEmail: vi.fn(async () => ({ sent: false })),
  sendOrgInvitationEmail: vi.fn(async () => ({ sent: false })),
}));

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user, organization, activityLog, session as sessione } from "@/lib/db/schema";
import { firstMembershipOrgId } from "@/features/auth/guards";

const RUN = Date.now();
const EMAIL = `reset-sess+${RUN}@example.test`;
const userIds: string[] = [];
const orgIds: string[] = [];

afterAll(async () => {
  if (orgIds.length) {
    await db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL app.audit_maintenance = 'on'`);
      await tx.delete(activityLog).where(inArray(activityLog.organizationId, orgIds));
    });
    await db.delete(organization).where(inArray(organization.id, orgIds));
  }
  if (userIds.length) await db.delete(user).where(inArray(user.id, userIds));
});

function cookieDa(res: Response): string {
  return res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
}

describe("reset password → sessioni chiuse", () => {
  it("la sessione aperta prima del reset non vale più; la nuova password sì", async () => {
    const su = await auth.api.signUpEmail({ body: { name: "Reset", email: EMAIL, password: "Vecchia-pass-123!" } });
    userIds.push(su.user.id);
    orgIds.push((await firstMembershipOrgId(su.user.id))!);
    await db.update(user).set({ emailVerified: true }).where(eq(user.id, su.user.id));

    const login = await auth.api.signInEmail({ body: { email: EMAIL, password: "Vecchia-pass-123!" }, asResponse: true });
    const cookieVecchio = cookieDa(login);
    expect(await auth.api.getSession({ headers: new Headers({ cookie: cookieVecchio }) })).not.toBeNull();

    await auth.api.requestPasswordReset({ body: { email: EMAIL, redirectTo: "/reimposta-password" } });
    const token = new URL(links.at(-1)!).pathname.split("/").pop()!;
    const r = await auth.api.resetPassword({ body: { newPassword: "Nuova-pass-456!", token } });
    expect(r.status).toBe(true);

    expect(await auth.api.getSession({ headers: new Headers({ cookie: cookieVecchio }) })).toBeNull();
    const rimaste = await db.select({ id: sessione.id }).from(sessione).where(eq(sessione.userId, su.user.id));
    expect(rimaste).toHaveLength(0);

    const nuovo = await auth.api.signInEmail({ body: { email: EMAIL, password: "Nuova-pass-456!" }, asResponse: true });
    expect(nuovo.status).toBe(200);
  });
});
