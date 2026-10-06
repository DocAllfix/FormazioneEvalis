// Regole del checkout (audit B18, B19, B16, C8). Stripe è sostituito: si guarda COSA il
// checkout gli chiederebbe (cliente, sconto, metadati) e quando si rifiuta prima di chiamarlo.
//  B18: un corso ritirato dalla vendita (bozza) o non del catalogo pubblico non si compra.
//  B19: un pacchetto con dentro un corso ritirato non si vende; idem il corso a scelta ritirato.
//  C8:  il dipendente semplice che compra per sé compra da privato: suo spazio, suo cliente
//       Stripe, nessuno sconto aziendale. Titolare e amministratori comprano per l'azienda.
//  B16: chi non è più membro dell'azienda non compra più a suo nome, anche con la sessione vecchia.

import { describe, it, expect, afterAll, beforeAll, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";

let sessione: { user: { id: string; email: string; name: string }; session: { activeOrganizationId: string | null } } | null = null;
vi.mock("@/lib/auth/server", () => ({ getCurrentSession: async () => sessione }));

const creaSessione = vi.fn(async (_p: Record<string, unknown>) => ({ url: "https://stripe.test/checkout" }));
const creaCliente = vi.fn(async (p: { metadata: { orgId: string } }) => ({ id: `cus_test_${p.metadata.orgId}` }));
vi.mock("@/lib/stripe/client", () => ({
  getStripe: () => ({ checkout: { sessions: { create: creaSessione } }, customers: { create: creaCliente } }),
  isStripeConfigured: () => true,
}));

import { db } from "@/lib/db";
import { user, organization, member, course, enrollment, bundle, bundleCourse } from "@/lib/db/schema";
import { serializeOrgMetadata } from "@/features/auth/org-metadata";
import { createCoursePurchaseCheckout, createBundlePurchaseCheckout } from "@/features/billing/checkout";
import { listActiveBundles } from "@/features/catalog/queries";

vi.mock("next/cache", () => ({ unstable_cache: (f: unknown) => f, revalidateTag: () => {}, revalidatePath: () => {} }));

const RUN = Date.now();
const id = (n: string) => `ck-${n}-${RUN}`;
const T = id("titolare"), D = id("dipendente"), X = id("ex"), P = id("privato"), H = id("collega");
const AZ = id("azienda"), PT = id("pt"), PD = id("pd"), PX = id("px"), PP = id("pp"), ALTRA = id("altra");
const corsi: Record<string, string> = {};
const pacchetti: Record<string, string> = {};

function entra(uid: string, attivo: string | null) {
  sessione = { user: { id: uid, email: `${uid}@example.test`, name: uid }, session: { activeOrganizationId: attivo } };
  creaSessione.mockClear();
}
const ultima = () => creaSessione.mock.calls.at(-1)![0] as { customer: string; discounts?: unknown; metadata: Record<string, string> };

beforeAll(async () => {
  const ora = new Date();
  await db.insert(user).values([T, D, X, P, H].map((u) => ({ id: u, name: u, email: `${u}@example.test`, emailVerified: true, createdAt: ora, updatedAt: ora })));
  const org = (oid: string, tipo: "company" | "personal") => ({ id: oid, name: oid, slug: oid, createdAt: ora, metadata: serializeOrgMetadata({ type: tipo, seatLimit: tipo === "company" ? 10 : 1 }) });
  await db.insert(organization).values([org(AZ, "company"), org(ALTRA, "company"), org(PT, "personal"), org(PD, "personal"), org(PX, "personal"), org(PP, "personal")]);
  const m = (oid: string, uid: string, role: string) => ({ id: `m-${oid}-${uid}`, organizationId: oid, userId: uid, role, createdAt: ora });
  await db.insert(member).values([
    m(PT, T, "owner"), m(AZ, T, "owner"),
    m(PD, D, "owner"), m(AZ, D, "member"),
    m(AZ, H, "member"),
    m(PX, X, "owner"), // X era dipendente dell'azienda: ora non lo è più
    m(PP, P, "owner"),
  ]);
  const c = async (nome: string, v: Partial<typeof course.$inferInsert>) => {
    const [r] = await db.insert(course).values({ title: `Corso ${nome} ${RUN}`, status: "published", requiredMinutes: 0, stripePriceId: `price_${nome}`, priceCents: 10000, ...v }).returning({ id: course.id });
    corsi[nome] = r.id;
  };
  await c("venduto", {});
  await c("venduto2", {});
  await c("ritirato", { status: "draft" });
  await c("privato", { organizationId: ALTRA }); // corso di un'azienda, non del catalogo pubblico
  // un collega ha già comprato "venduto" a nome dell'azienda → per l'azienda scatta il −20%
  await db.insert(enrollment).values({ organizationId: AZ, userId: H, courseId: corsi.venduto, source: "b2c_purchase", status: "active" });

  const b = async (nome: string, kind: "fixed" | "pick_one", link: [string, "included" | "eligible"][]) => {
    const [r] = await db.insert(bundle).values({ slug: id(`b-${nome}`), title: `Pacchetto ${nome} ${RUN}`, kind, stripePriceId: `price_b_${nome}`, priceCents: 15000, active: true, position: 9000 }).returning({ id: bundle.id });
    pacchetti[nome] = r.id;
    await db.insert(bundleCourse).values(link.map(([k, role]) => ({ bundleId: r.id, courseId: corsi[k], role })));
  };
  await b("sano", "fixed", [["venduto", "included"], ["venduto2", "included"]]);
  await b("monco", "fixed", [["venduto", "included"], ["ritirato", "included"]]);
  await b("scelta", "pick_one", [["venduto", "included"], ["venduto2", "eligible"], ["ritirato", "eligible"]]);
});

afterAll(async () => {
  await db.delete(enrollment).where(inArray(enrollment.userId, [T, D, X, P, H]));
  await db.delete(bundle).where(inArray(bundle.id, Object.values(pacchetti)));
  await db.delete(course).where(inArray(course.id, Object.values(corsi)));
  await db.delete(organization).where(inArray(organization.id, [AZ, ALTRA, PT, PD, PX, PP]));
  await db.delete(user).where(inArray(user.id, [T, D, X, P, H]));
});

describe("B18 — corso non in vendita", () => {
  it("un corso ritirato (bozza) o non del catalogo pubblico non si compra; Stripe non viene chiamato", async () => {
    entra(P, PP);
    await expect(createCoursePurchaseCheckout(corsi.ritirato)).rejects.toThrow(/non (è )?disponibile/i);
    await expect(createCoursePurchaseCheckout(corsi.privato)).rejects.toThrow(/non (è )?disponibile/i);
    expect(creaSessione).not.toHaveBeenCalled();
  });

  it("un corso in vendita si compra: privato → suo spazio, nessuno sconto", async () => {
    entra(P, PP);
    await createCoursePurchaseCheckout(corsi.venduto);
    expect(ultima().metadata).toMatchObject({ kind: "course_purchase", userId: P, courseId: corsi.venduto, orgId: PP });
    expect(ultima().customer).toBe(`cus_test_${PP}`);
    expect(ultima().discounts).toBeUndefined();
  });
});

describe("C8 / B16 — a nome di chi si compra", () => {
  it("titolare: compra per l'azienda, con lo sconto aziendale", async () => {
    entra(T, AZ);
    await createCoursePurchaseCheckout(corsi.venduto);
    expect(ultima().metadata.orgId).toBe(AZ);
    expect(ultima().customer).toBe(`cus_test_${AZ}`);
    expect(ultima().discounts).toEqual([{ coupon: "azienda-20" }]);
  });

  it("dipendente semplice che compra per sé: da privato, suo cliente Stripe, prezzo pieno", async () => {
    entra(D, AZ);
    await createCoursePurchaseCheckout(corsi.venduto);
    expect(ultima().metadata).toMatchObject({ userId: D, orgId: PD });
    expect(ultima().customer).toBe(`cus_test_${PD}`);
    expect(ultima().discounts).toBeUndefined();
  });

  it("dipendente semplice: anche i pacchetti vanno sul suo spazio", async () => {
    entra(D, AZ);
    await createBundlePurchaseCheckout(pacchetti.sano);
    expect(ultima().metadata.orgId).toBe(PD);
    expect(ultima().customer).toBe(`cus_test_${PD}`);
  });

  it("dipendente arrivato da un vecchio invito, senza spazio personale: gli viene creato", async () => {
    entra(H, AZ);
    await createCoursePurchaseCheckout(corsi.venduto2);
    const [suo] = await db.select({ oid: member.organizationId }).from(member).where(eq(member.userId, H)).then((r) => r.filter((x) => x.oid !== AZ));
    expect(suo).toBeTruthy();
    expect(ultima().metadata.orgId).toBe(suo.oid);
    await db.delete(organization).where(eq(organization.id, suo.oid));
  });

  it("ex dipendente con la sessione ancora puntata sull'azienda: compra sul proprio spazio, senza sconto", async () => {
    entra(X, AZ);
    await createCoursePurchaseCheckout(corsi.venduto);
    expect(ultima().metadata.orgId).toBe(PX);
    expect(ultima().customer).toBe(`cus_test_${PX}`);
    expect(ultima().discounts).toBeUndefined();
  });

  it("il titolare compra PER un dipendente: azienda, iscrizione al dipendente; un dipendente non può farlo", async () => {
    entra(T, AZ);
    await createCoursePurchaseCheckout(corsi.venduto2, D);
    expect(ultima().metadata).toMatchObject({ userId: D, orgId: AZ });
    expect(ultima().customer).toBe(`cus_test_${AZ}`);

    entra(D, AZ);
    await expect(createCoursePurchaseCheckout(corsi.venduto2, H)).rejects.toThrow();
    entra(T, AZ);
    await expect(createCoursePurchaseCheckout(corsi.venduto2, P)).rejects.toThrow(/non è un membro/i);
    expect(creaSessione).not.toHaveBeenCalled();
  });
});

describe("B19 — pacchetti con corsi ritirati", () => {
  it("pacchetto fisso con un corso ritirato: non si vende", async () => {
    entra(P, PP);
    await expect(createBundlePurchaseCheckout(pacchetti.monco)).rejects.toThrow(/non (è )?disponibile/i);
    expect(creaSessione).not.toHaveBeenCalled();
  });

  it("pacchetto a scelta: il corso ritirato non si può scegliere, quello in vendita sì", async () => {
    entra(P, PP);
    await expect(createBundlePurchaseCheckout(pacchetti.scelta, corsi.ritirato)).rejects.toThrow(/non (è )?disponibile/i);
    expect(creaSessione).not.toHaveBeenCalled();
    await createBundlePurchaseCheckout(pacchetti.scelta, corsi.venduto2);
    expect(ultima().metadata).toMatchObject({ kind: "bundle_purchase", bundleId: pacchetti.scelta, chosenCourseId: corsi.venduto2 });
  });

  it("vetrina: il pacchetto sano c'è, quello con un corso ritirato no; nella scelta resta solo il corso in vendita", async () => {
    const vetrina = await listActiveBundles();
    const ids = vetrina.map((b) => b.id);
    expect(ids).toContain(pacchetti.sano);
    expect(ids).not.toContain(pacchetti.monco);
    const scelta = vetrina.find((b) => b.id === pacchetti.scelta)!;
    expect(scelta.courses.filter((c) => c.role === "eligible").map((c) => c.id)).toEqual([corsi.venduto2]);
  });
});
