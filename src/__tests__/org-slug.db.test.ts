// Lo slug dell'azienda finisce nell'indirizzo della mail di invito: deve rispettare le stesse regole
// del modulo dell'app (isValidSlug) anche quando l'azienda viene creata o rinominata direttamente
// dalle API di better-auth. Gli spazi personali (`u-<id>`) restano rinominabili.

import { describe, it, expect, afterAll, vi } from "vitest";
import { eq, inArray, sql, like } from "drizzle-orm";

vi.mock("@/lib/email/resend", () => ({
  sendPasswordResetEmail: vi.fn(async () => ({ sent: false })),
  sendVerificationEmail: vi.fn(async () => ({ sent: false })),
  sendOrgInvitationEmail: vi.fn(async () => ({ sent: false })),
}));

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user, organization, activityLog } from "@/lib/db/schema";
import { firstMembershipOrgId } from "@/features/auth/guards";

const RUN = Date.now();
const userIds: string[] = [];

afterAll(async () => {
  const orgs = await db.select({ id: organization.id }).from(organization).where(like(organization.slug, `%${RUN}%`));
  const ids = orgs.map((o) => o.id);
  if (ids.length) {
    await db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL app.audit_maintenance = 'on'`);
      await tx.delete(activityLog).where(inArray(activityLog.organizationId, ids));
    });
    await db.delete(organization).where(inArray(organization.id, ids));
  }
  if (userIds.length) await db.delete(user).where(inArray(user.id, userIds));
});

async function utenteConCookie() {
  const email = `slug+${RUN}@example.test`;
  const su = await auth.api.signUpEmail({ body: { name: "Slug", email, password: "Password-123!" } });
  userIds.push(su.user.id);
  await db.update(user).set({ emailVerified: true }).where(eq(user.id, su.user.id));
  const r = await auth.api.signInEmail({ body: { email, password: "Password-123!" }, asResponse: true });
  const cookie = r.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  return { uid: su.user.id, headers: new Headers({ cookie }) };
}

async function rifiutato(p: Promise<unknown>): Promise<boolean> {
  try {
    await p;
    return false;
  } catch {
    return true;
  }
}

describe("slug azienda via API dirette", () => {
  it("rifiuta slug non validi in creazione e in rinomina, accetta quelli validi", async () => {
    const { uid, headers } = await utenteConCookie();

    expect(await rifiutato(auth.api.createOrganization({ body: { name: "A", slug: `sub${RUN}.evil.test/x?` }, headers }))).toBe(true);
    expect(await rifiutato(auth.api.createOrganization({ body: { name: "B", slug: `b${RUN}"><b>x` }, headers }))).toBe(true);
    expect(await rifiutato(auth.api.createOrganization({ body: { name: "C", slug: "admin" }, headers }))).toBe(true);
    const cattivi = await db.select({ id: organization.id }).from(organization).where(like(organization.slug, `%${RUN}%`));
    expect(cattivi).toHaveLength(0);

    const ok = await auth.api.createOrganization({ body: { name: "Buona", slug: `buona-${RUN}` }, headers });
    expect(ok?.slug).toBe(`buona-${RUN}`);

    expect(
      await rifiutato(auth.api.updateOrganization({ body: { organizationId: ok!.id, data: { slug: `x${RUN}.evil.test/` } }, headers })),
    ).toBe(true);
    const [dopo] = await db.select({ slug: organization.slug }).from(organization).where(eq(organization.id, ok!.id));
    expect(dopo.slug).toBe(`buona-${RUN}`);

    // spazio personale: slug `u-<id>` (maiuscole) — rinominare il SOLO nome resta possibile
    const personale = (await firstMembershipOrgId(uid))!;
    const ren = await auth.api.updateOrganization({ body: { organizationId: personale, data: { name: "Nuovo nome" } }, headers });
    expect(ren?.name).toBe("Nuovo nome");
  });
});
