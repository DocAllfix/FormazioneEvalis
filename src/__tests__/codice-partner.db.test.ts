// Codice PARTNER (NGR, richiesta del committente del 23/10/2026): si inserisce alla registrazione,
// si accetta solo se è di un partner, non si cambia dopo, e la mail di vendita riporta il partner
// di CHI PAGA, anche quando un titolare d'azienda compra per un dipendente.

import { describe, it, expect, afterAll } from "vitest";
import { inArray, eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user, organization, member, activityLog } from "@/lib/db/schema";
import { firstMembershipOrgId } from "@/features/auth/guards";
import { authDatabaseHooks } from "@/features/auth/hooks";
import { partnerDellaVendita } from "@/features/billing/notifica-vendita";

const RUN = Date.now();
const PW = "Password123!";
const utenti: string[] = [];
const organizzazioni: string[] = [];

const registra = async (tag: string, partnerCode?: string) => {
  const r = await auth.api.signUpEmail({
    body: { name: `Partner ${tag}`, email: `partner-${tag}+${RUN}@example.test`, password: PW, ...(partnerCode !== undefined ? { partnerCode } : {}) },
  });
  utenti.push(r.user.id);
  return r.user.id;
};
const codiceDi = async (id: string) => (await db.select({ c: user.partnerCode }).from(user).where(eq(user.id, id)))[0]?.c ?? null;
const vendita = (orgId: string) => ({ metadata: { kind: "course_purchase", orgId } });

afterAll(async () => {
  const personali = utenti.map((id) => `u-${id}`);
  const tutte = [...organizzazioni, ...(await db.select({ id: organization.id }).from(organization).where(inArray(organization.slug, personali))).map((o) => o.id)];
  if (tutte.length) {
    await db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL app.audit_maintenance = 'on'`);
      await tx.delete(activityLog).where(inArray(activityLog.organizationId, tutte));
    });
    await db.delete(organization).where(inArray(organization.id, tutte));
  }
  if (utenti.length) await db.delete(user).where(inArray(user.id, utenti));
});

describe("codice partner", () => {
  it("alla registrazione si salva ripulito; vuoto o assente resta nessun partner", async () => {
    expect(await codiceDi(await registra("ngr", " ngr "))).toBe("NGR");
    expect(await codiceDi(await registra("vuoto", "  "))).toBeNull();
    expect(await codiceDi(await registra("senza"))).toBeNull();
  });

  it("un codice che non è di un partner blocca la registrazione, e l'account non nasce", async () => {
    const email = `partner-errato+${RUN}@example.test`;
    await expect(auth.api.signUpEmail({ body: { name: "Errato", email, password: PW, partnerCode: "NGX" } })).rejects.toThrow(/Codice partner non valido/);
    expect(await db.select({ id: user.id }).from(user).where(eq(user.email, email))).toHaveLength(0);
  });

  it("dopo la registrazione il codice non si cambia: la modifica lo scarta e tiene il resto", async () => {
    const before = authDatabaseHooks.user!.update!.before!;
    const esito = await before({ name: "Nuovo nome", partnerCode: "NGR" } as never);
    expect(esito).toEqual({ data: { name: "Nuovo nome" } });
    expect(await before({ name: "Solo nome" } as never)).toBeUndefined();
  });

  it("la vendita va al partner di chi paga: privato, titolare che compra per un dipendente, nessun partner", async () => {
    const titolare = (await db.select({ id: user.id }).from(user).where(eq(user.email, `partner-ngr+${RUN}@example.test`)))[0].id;
    const dipendente = await registra("dipendente");
    const privatoSenza = (await db.select({ id: user.id }).from(user).where(eq(user.email, `partner-senza+${RUN}@example.test`)))[0].id;

    // acquisto per sé nello spazio personale
    expect(await partnerDellaVendita(vendita((await firstMembershipOrgId(titolare))!))).toBe("NGR");
    expect(await partnerDellaVendita(vendita((await firstMembershipOrgId(privatoSenza))!))).toBeNull();

    // azienda: il titolare (arrivato con NGR) compra per il dipendente (senza codice) → NGR
    const azienda = `partner-azienda-${RUN}`;
    organizzazioni.push(azienda);
    await db.insert(organization).values({ id: azienda, name: azienda, slug: azienda, createdAt: new Date() });
    await db.insert(member).values([
      { id: `m-t-${RUN}`, organizationId: azienda, userId: titolare, role: "owner", createdAt: new Date() },
      { id: `m-d-${RUN}`, organizationId: azienda, userId: dipendente, role: "member", createdAt: new Date() },
    ]);
    expect(await partnerDellaVendita(vendita(azienda))).toBe("NGR");

    // senza orgId nei metadati non si attribuisce niente
    expect(await partnerDellaVendita({ metadata: {} })).toBeNull();
  });
});
