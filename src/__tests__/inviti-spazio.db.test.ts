// Inviti (audit B1, B4).
// B1: l'id dell'invito lo conosce anche chi invita, quindi non può rendere "verificata" l'email
//     di un altro: l'unica verifica è il link mandato alla casella.
// B4: chi ha un invito in sospeso (anche scaduto) e si registra ha comunque il suo spazio
//     personale; chi è membro di un'azienda lavora nello spazio dell'azienda.

import { describe, it, expect, afterAll, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";

vi.mock("@/lib/email/resend", () => ({
  sendPasswordResetEmail: vi.fn(async () => ({ sent: false })),
  sendVerificationEmail: vi.fn(async () => ({ sent: false })),
  sendOrgInvitationEmail: vi.fn(async () => ({ sent: false })),
}));

import { auth } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email/resend";
import { db } from "@/lib/db";
import { user, organization, member, invitation, session } from "@/lib/db/schema";
import { createCompanyOrg } from "@/features/auth/orgs";
import { parseOrgMetadata } from "@/features/auth/org-metadata";
import * as inviti from "@/features/auth/invitations";
import * as azioniAzienda from "@/features/admin/server-actions";
import { spazioPredefinito, assicuraSpazio } from "@/features/auth/spazio-predefinito";

const RUN = Date.now();
const PW = "Password-123!";
const mail = (n: string) => `inviti-${n}+${RUN}@example.test`;
const userIds: string[] = [];
const orgIds: string[] = [];

afterAll(async () => {
  if (orgIds.length) await db.delete(organization).where(inArray(organization.id, orgIds));
  if (userIds.length) {
    await db.delete(organization).where(inArray(organization.slug, userIds.map((id) => `u-${id}`)));
    await db.delete(user).where(inArray(user.id, userIds));
  }
});

async function registra(nome: string, email: string, verificato = true) {
  const r = await auth.api.signUpEmail({ body: { name: nome, email, password: PW } });
  userIds.push(r.user.id);
  if (verificato) await db.update(user).set({ emailVerified: true }).where(eq(user.id, r.user.id));
  return r.user.id;
}

async function azienda(ownerId: string, tag: string) {
  const id = await createCompanyOrg({ name: `Azienda ${tag}`, slug: `inviti-${tag}-${RUN}`, seatLimit: 5, ownerUserId: ownerId });
  orgIds.push(id);
  return id;
}

async function invita(orgId: string, inviterId: string, email: string, scadeTraMs = 86_400_000) {
  const id = crypto.randomUUID();
  await db.insert(invitation).values({
    id, organizationId: orgId, email, role: "member", status: "pending",
    expiresAt: new Date(Date.now() + scadeTraMs), createdAt: new Date(), inviterId,
  });
  return id;
}

async function spaziDi(uid: string) {
  const righe = await db
    .select({ orgId: member.organizationId, role: member.role, metadata: organization.metadata })
    .from(member)
    .innerJoin(organization, eq(organization.id, member.organizationId))
    .where(eq(member.userId, uid));
  return righe.map((r) => ({ orgId: r.orgId, role: r.role, tipo: parseOrgMetadata(r.metadata)?.type }));
}

describe("inviti — verifica dell'email", () => {
  it("B1: non esiste più la verifica tramite l'id dell'invito; l'email altrui resta non verificata", async () => {
    expect((inviti as Record<string, unknown>).verifyInvitedAccount).toBeUndefined();
    expect((azioniAzienda as Record<string, unknown>).verifyInvitedAccountAction).toBeUndefined();

    // l'attaccante invita la vittima dalla propria azienda e ne registra l'email con una sua password
    const attaccante = await registra("Attaccante", mail("attaccante"));
    const org = await azienda(attaccante, "att");
    const vittima = mail("vittima");
    await invita(org, attaccante, vittima);
    const uid = await registra("Finta vittima", vittima, false);

    const [u] = await db.select({ v: user.emailVerified }).from(user).where(eq(user.id, uid));
    expect(u.v).toBe(false);
    await expect(auth.api.signInEmail({ body: { email: vittima, password: PW } })).rejects.toThrow();
  });
});

describe("conferma dell'email — link perso o scaduto", () => {
  it("chi prova ad accedere con la password giusta ma senza conferma riceve un nuovo link", async () => {
    const email = mail("scaduto");
    await registra("Link scaduto", email, false);
    const invio = vi.mocked(sendVerificationEmail);
    invio.mockClear();

    await expect(auth.api.signInEmail({ body: { email, password: PW } })).rejects.toThrow();
    expect(invio).toHaveBeenCalledTimes(1);
    expect(invio.mock.calls[0][0].to).toBe(email);

    // password sbagliata: nessun link (non si può far partire mail a nome di altri)
    invio.mockClear();
    await expect(auth.api.signInEmail({ body: { email, password: "Sbagliata-123!" } })).rejects.toThrow();
    expect(invio).not.toHaveBeenCalled();
  });
});

describe("inviti — spazio personale e spazio di lavoro", () => {
  it("B4: registrazione con un invito in sospeso → spazio personale presente", async () => {
    const owner = await registra("Titolare", mail("owner1"));
    const org = await azienda(owner, "b4");
    const email = mail("dip1");
    await invita(org, owner, email);
    const uid = await registra("Dipendente", email);
    expect((await spaziDi(uid)).map((s) => s.tipo)).toEqual(["personal"]);
  });

  it("B4: invito scaduto → spazio personale presente", async () => {
    const owner = await registra("Titolare", mail("owner2"));
    const org = await azienda(owner, "scad");
    const email = mail("dip2");
    await invita(org, owner, email, -3600_000);
    const uid = await registra("Dipendente", email);
    expect((await spaziDi(uid)).map((s) => s.tipo)).toEqual(["personal"]);
  });

  it("chi è membro di un'azienda lavora nell'azienda (titolare e dipendente), anche al login", async () => {
    const owner = await registra("Titolare", mail("owner3"));
    const org = await azienda(owner, "lav");
    expect(await spazioPredefinito(owner)).toBe(org);

    const email = mail("dip3");
    const dip = await registra("Dipendente", email);
    const personale = (await spaziDi(dip))[0].orgId;
    expect(await spazioPredefinito(dip)).toBe(personale);

    await db.insert(member).values({ id: crypto.randomUUID(), organizationId: org, userId: dip, role: "member", createdAt: new Date() });
    expect(await spazioPredefinito(dip)).toBe(org);

    await auth.api.signInEmail({ body: { email, password: PW } });
    const [s] = await db.select({ attivo: session.activeOrganizationId }).from(session).where(eq(session.userId, dip));
    expect(s.attivo).toBe(org);
  });

  it("utente rimasto senza nessuno spazio → ne riceve uno personale al primo uso, una volta sola", async () => {
    const uid = await registra("Senza spazio", mail("senza"));
    await db.delete(organization).where(eq(organization.slug, `u-${uid}`)); // come gli utenti colpiti da B4
    expect(await spaziDi(uid)).toHaveLength(0);

    const [a, b] = await Promise.all([assicuraSpazio(uid), assicuraSpazio(uid)]);
    expect(a).toBe(b);
    const spazi = await spaziDi(uid);
    expect(spazi.map((s) => s.tipo)).toEqual(["personal"]);
    expect(spazi[0].orgId).toBe(a);
  });
});
