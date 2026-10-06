// "I miei acquisti" e ricevute: CHI VEDE COSA. La RLS su payment_event lascia leggere all'app
// ogni riga, quindi questa regola è l'unica barriera: qui la si prova su tutti i casi che
// contano. Lanciare anche con RLS_FORCE_ROLE=app_rls per girare col ruolo della produzione.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { sql, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { user, organization, member, course, paymentEvent } from "@/lib/db/schema";
import { listMyPurchases, paymentIntentDiMioAcquisto } from "@/features/billing/acquisti";

const RUN = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
const A = `acq-a-${RUN}`; // privato che compra per sé
const B = `acq-b-${RUN}`; // un altro privato
const O = `acq-o-${RUN}`; // titolare di un'azienda
const M = `acq-m-${RUN}`; // dipendente di quell'azienda
const orgA = `acq-orga-${RUN}`;
const orgB = `acq-orgb-${RUN}`;
const orgC = `acq-orgc-${RUN}`;
const ev = (n: string) => `evt_acq_${n}_${RUN}`;
let corsoId = "";
const ledger: Record<string, string> = {}; // nome → id riga

function riga(nome: string, v: { type: string; userId: string | null; orgId: string | null; intent: string; importo?: number; meta?: Record<string, string>; stato?: string }) {
  return {
    stripeEventId: ev(nome),
    type: v.type,
    livemode: false,
    userId: v.userId,
    organizationId: v.orgId,
    paymentIntentId: v.intent,
    amountTotal: v.importo ?? 21838,
    currency: "eur",
    occurredAt: new Date(),
    payload: { data: { object: { payment_status: v.stato ?? "paid", metadata: v.meta ?? {} } } },
  };
}

beforeAll(async () => {
  for (const [id, nome] of [[A, "Privato A"], [B, "Privato B"], [O, "Titolare O"], [M, "Dipendente M"]]) {
    await db.insert(user).values({ id, name: nome, email: `${id}@example.test`, emailVerified: true, createdAt: new Date(), updatedAt: new Date() });
  }
  for (const [id, nome] of [[orgA, "Spazio A"], [orgB, "Spazio B"], [orgC, "Azienda C"]]) {
    await db.insert(organization).values({ id, name: nome, slug: id, createdAt: new Date() });
  }
  await db.insert(member).values([
    { id: `m-a-${RUN}`, organizationId: orgA, userId: A, role: "owner", createdAt: new Date() },
    { id: `m-b-${RUN}`, organizationId: orgB, userId: B, role: "owner", createdAt: new Date() },
    { id: `m-o-${RUN}`, organizationId: orgC, userId: O, role: "owner", createdAt: new Date() },
    { id: `m-m-${RUN}`, organizationId: orgC, userId: M, role: "member", createdAt: new Date() },
  ]);
  const [c] = await db.insert(course).values({ title: `Corso acquisti ${RUN}`, status: "published", requiredMinutes: 0 }).returning({ id: course.id });
  corsoId = c.id;

  const corsoPer = (userId: string, orgId: string) => ({ kind: "course_purchase", courseId: corsoId, userId, orgId });
  const righe = await db.insert(paymentEvent).values([
    riga("a", { type: "checkout.session.completed", userId: A, orgId: orgA, intent: `pi_a_${RUN}`, meta: corsoPer(A, orgA) }),
    // l'azienda C paga un corso PER il dipendente M: il pagamento è dell'azienda
    riga("m", { type: "checkout.session.completed", userId: M, orgId: orgC, intent: `pi_m_${RUN}`, meta: corsoPer(M, orgC) }),
    // il titolare O compra per sé, a nome dell'azienda
    riga("o", { type: "checkout.session.completed", userId: O, orgId: orgC, intent: `pi_o_${RUN}`, meta: corsoPer(O, orgC) }),
    // rimborso dell'acquisto di A (gli eventi di charge non hanno metadata utente)
    riga("rimborso", { type: "charge.refunded", userId: null, orgId: null, intent: `pi_a_${RUN}` }),
    // un evento che NON è un acquisto, anche se porta l'utente A: non va mostrato
    riga("fallito", { type: "payment_intent.payment_failed", userId: A, orgId: orgA, intent: `pi_x_${RUN}` }),
    // B paga con un metodo a conferma ritardata: prima "completato ma non incassato", poi "riuscito"
    riga("attesa", { type: "checkout.session.completed", userId: B, orgId: orgB, intent: `pi_b_${RUN}`, meta: corsoPer(B, orgB), stato: "unpaid" }),
  ]).returning({ id: paymentEvent.id, ev: paymentEvent.stripeEventId });
  for (const r of righe) ledger[r.ev.replace(`evt_acq_`, "").replace(`_${RUN}`, "")] = r.id;
});

async function incassoRitardatoDiB() {
  const corsoPer = { kind: "course_purchase", courseId: corsoId, userId: B, orgId: orgB };
  const [r] = await db
    .insert(paymentEvent)
    .values(riga("riuscito", { type: "checkout.session.async_payment_succeeded", userId: B, orgId: orgB, intent: `pi_b_${RUN}`, meta: corsoPer }))
    .returning({ id: paymentEvent.id });
  return r.id;
}

afterAll(async () => {
  await db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL app.audit_maintenance = 'on'`); // il registro è append-only
    await tx.delete(paymentEvent).where(inArray(paymentEvent.stripeEventId, ["a", "m", "o", "rimborso", "fallito", "attesa", "riuscito"].map(ev)));
  });
  await db.delete(member).where(inArray(member.organizationId, [orgA, orgB, orgC]));
  await db.delete(organization).where(inArray(organization.id, [orgA, orgB, orgC]));
  await db.delete(user).where(inArray(user.id, [A, B, O, M]));
  if (corsoId) await db.delete(course).where(inArray(course.id, [corsoId]));
});

describe("I miei acquisti — chi vede cosa", () => {
  it("il privato vede il SUO acquisto, col nome del corso, e il rimborso segnato", async () => {
    const lista = await listMyPurchases(A);
    expect(lista.map((x) => x.id)).toEqual([ledger.a]);
    expect(lista[0].cosa).toBe(`Corso acquisti ${RUN}`);
    expect(lista[0].tipo).toBe("corso");
    expect(lista[0].importoCents).toBe(21838);
    expect(lista[0].rimborsato).toBe(true);
  });

  it("un checkout completato ma non incassato non è un acquisto; lo diventa a incasso avvenuto, una volta sola", async () => {
    expect(await listMyPurchases(B)).toEqual([]);
    expect(await paymentIntentDiMioAcquisto(B, ledger.attesa)).toBeNull();
    const riuscito = await incassoRitardatoDiB();
    expect((await listMyPurchases(B)).map((x) => x.id)).toEqual([riuscito]);
  });

  it("il dipendente NON vede il corso che l'azienda ha pagato per lui", async () => {
    expect(await listMyPurchases(M)).toEqual([]);
  });

  it("il titolare vede quello comprato per sé, non quello intestato al dipendente", async () => {
    const lista = await listMyPurchases(O);
    expect(lista.map((x) => x.id)).toEqual([ledger.o]);
    expect(lista[0].rimborsato).toBe(false);
  });

  it("gli eventi che non sono acquisti non compaiono", async () => {
    const lista = await listMyPurchases(A);
    expect(lista.some((x) => x.id === ledger.fallito)).toBe(false);
  });
});

describe("Ricevuta — la rotta ottiene il pagamento solo se è tuo", () => {
  it("al proprietario restituisce il payment intent", async () => {
    expect(await paymentIntentDiMioAcquisto(A, ledger.a)).toBe(`pi_a_${RUN}`);
    expect(await paymentIntentDiMioAcquisto(O, ledger.o)).toBe(`pi_o_${RUN}`);
  });

  it("a chiunque altro, niente — nello stesso modo in cui risponde a un id inesistente", async () => {
    expect(await paymentIntentDiMioAcquisto(B, ledger.a)).toBeNull(); // pagamento di un altro
    expect(await paymentIntentDiMioAcquisto(M, ledger.m)).toBeNull(); // pagato dall'azienda
    expect(await paymentIntentDiMioAcquisto(O, ledger.m)).toBeNull(); // intestato al dipendente
    expect(await paymentIntentDiMioAcquisto(A, ledger.fallito)).toBeNull(); // non è un acquisto
    expect(await paymentIntentDiMioAcquisto(A, ledger.rimborso)).toBeNull(); // non è un acquisto
    expect(await paymentIntentDiMioAcquisto(A, "00000000-0000-4000-8000-000000000000")).toBeNull(); // inesistente
  });

  it("un id che non è un uuid non arriva nemmeno al database", async () => {
    expect(await paymentIntentDiMioAcquisto(A, "'; drop table payment_event; --")).toBeNull();
    expect(await paymentIntentDiMioAcquisto(A, "")).toBeNull();
  });
});
