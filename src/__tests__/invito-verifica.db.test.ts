// Verifica dell'account tramite invito. L'id dell'invito lo riceve anche chi invita, quindi non
// deve poter rendere "verificata" un'email dello staff (PLATFORM_STAFF_EMAILS dà i poteri di
// piattaforma). Per gli altri indirizzi il comportamento resta quello di prima.

import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { user, organization, invitation } from "@/lib/db/schema";
import { verifyInvitedAccount } from "@/features/auth/invitations";

const RUN = Date.now();
const STAFF = `staff-finto+${RUN}@example.test`;
const NORMALE = `dipendente+${RUN}@example.test`;
const INVITANTE = `invitante-${RUN}`;
const ORG = `org-invito-${RUN}`;
const userIds = [INVITANTE, `u-staff-${RUN}`, `u-norm-${RUN}`];
const precedente = process.env.PLATFORM_STAFF_EMAILS;

beforeAll(async () => {
  process.env.PLATFORM_STAFF_EMAILS = `altro@example.test, ${STAFF.toUpperCase()}`;
  const ora = new Date();
  await db.insert(user).values([
    { id: INVITANTE, name: "Invitante", email: `invitante+${RUN}@example.test`, emailVerified: true, createdAt: ora, updatedAt: ora },
    { id: userIds[1], name: "Finto staff", email: STAFF, emailVerified: false, createdAt: ora, updatedAt: ora },
    { id: userIds[2], name: "Dipendente", email: NORMALE, emailVerified: false, createdAt: ora, updatedAt: ora },
  ]);
  await db.insert(organization).values({ id: ORG, name: "Azienda prova", slug: ORG, createdAt: ora });
  const scade = new Date(Date.now() + 3600_000);
  await db.insert(invitation).values([
    { id: `inv-staff-${RUN}`, organizationId: ORG, email: STAFF, role: "member", status: "pending", expiresAt: scade, inviterId: INVITANTE },
    { id: `inv-norm-${RUN}`, organizationId: ORG, email: NORMALE, role: "member", status: "pending", expiresAt: scade, inviterId: INVITANTE },
  ]);
});

afterAll(async () => {
  process.env.PLATFORM_STAFF_EMAILS = precedente;
  await db.delete(organization).where(eq(organization.id, ORG)); // cascade inviti
  await db.delete(user).where(inArray(user.id, userIds));
});

const verificato = async (email: string) =>
  (await db.select({ v: user.emailVerified }).from(user).where(eq(user.email, email)))[0]?.v;

describe("verifyInvitedAccount", () => {
  it("rifiuta un'email dello staff e non la marca verificata", async () => {
    await expect(verifyInvitedAccount(`inv-staff-${RUN}`)).rejects.toThrow(/conferma l'email/);
    expect(await verificato(STAFF)).toBe(false);
  });

  it("per un dipendente qualsiasi funziona come prima", async () => {
    await verifyInvitedAccount(`inv-norm-${RUN}`);
    expect(await verificato(NORMALE)).toBe(true);
  });
});
