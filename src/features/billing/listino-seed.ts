// Seed e verifica del LISTINO (unica implementazione): usata dagli script locali
// (_setup-listino/_verifica-listino) e dalla route di go-live che gira su Vercel
// (dove vive la chiave Stripe LIVE). Idempotente per voce; mapping per SLUG.

import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { course, bundle, bundleCourse } from "@/lib/db/schema";
import { CORSI, BUNDLES, COUPONS_AZIENDA, type CorsoListino, type BundleListino } from "./listino-dati";

/** Price attivo conforme? Altrimenti ne crea uno nuovo sul Product (persistito) e disattiva il vecchio. */
async function ensurePrice(
  stripe: Stripe,
  opts: { name: string; productId: string | null; currentPriceId: string | null; cents: number },
): Promise<{ productId: string; priceId: string; changed: boolean }> {
  const productId = opts.productId ?? (await stripe.products.create({ name: opts.name })).id;
  if (opts.currentPriceId) {
    try {
      const p = await stripe.prices.retrieve(opts.currentPriceId);
      const prodOk = (typeof p.product === "string" ? p.product : p.product?.id) === productId;
      if (p.active && prodOk && p.unit_amount === opts.cents && p.currency === "eur" && p.tax_behavior === "exclusive") {
        return { productId, priceId: p.id, changed: false };
      }
    } catch {
      /* price inesistente o di un'altra modalità → si ricrea */
    }
  }
  const created = await stripe.prices.create({
    product: productId,
    currency: "eur",
    unit_amount: opts.cents,
    tax_behavior: "exclusive",
  });
  if (opts.currentPriceId) await stripe.prices.update(opts.currentPriceId, { active: false }).catch(() => {});
  return { productId, priceId: created.id, changed: true };
}

export async function ensureCoupons(stripe: Stripe): Promise<string[]> {
  const out: string[] = [];
  for (const c of COUPONS_AZIENDA) {
    try {
      await stripe.coupons.create({ id: c.id, percent_off: c.percentOff, duration: "once", name: c.name });
      out.push(`${c.id}: creato`);
    } catch (e) {
      if ((e as { code?: string }).code === "resource_already_exists") out.push(`${c.id}: già presente`);
      else throw e;
    }
  }
  return out;
}

export function corsoDati(slug: string): CorsoListino | undefined {
  return CORSI.find((c) => c.slug === slug);
}
export function bundleDati(slug: string): BundleListino | undefined {
  return BUNDLES.find((b) => b.slug === slug);
}

export async function seedCorsoBySlug(stripe: Stripe, slug: string): Promise<string> {
  const dati = corsoDati(slug);
  if (!dati) throw new Error(`corso non a listino: ${slug}`);
  const [row] = await db
    .select({ id: course.id, title: course.title, stripeProductId: course.stripeProductId, stripePriceId: course.stripePriceId })
    .from(course)
    .where(eq(course.slug, slug))
    .limit(1);
  if (!row) throw new Error(`corso non trovato per slug: ${slug}`);
  const res = await ensurePrice(stripe, { name: row.title, productId: row.stripeProductId, currentPriceId: row.stripePriceId, cents: dati.attivoCents });
  await db
    .update(course)
    .set({
      stripeProductId: res.productId,
      stripePriceId: res.priceId,
      priceCents: dati.attivoCents,
      listPriceCents: dati.listinoCents,
      currency: "eur",
    })
    .where(eq(course.id, row.id));
  return `${slug}: ${dati.attivoCents / 100}€ (listino ${dati.listinoCents / 100}€) ${res.changed ? "price NUOVO" : "invariato"}`;
}

export async function seedBundleBySlug(stripe: Stripe, slug: string): Promise<string> {
  const dati = bundleDati(slug);
  if (!dati) throw new Error(`bundle non a listino: ${slug}`);
  const position = BUNDLES.findIndex((b) => b.slug === slug);
  const [existing] = await db.select().from(bundle).where(eq(bundle.slug, slug)).limit(1);
  const row =
    existing ??
    (await db
      .insert(bundle)
      .values({ slug: dati.slug, title: dati.title, description: dati.description, kind: dati.kind, position })
      .returning())[0];
  const res = await ensurePrice(stripe, { name: dati.title, productId: row.stripeProductId, currentPriceId: row.stripePriceId, cents: dati.attivoCents });
  const all = await db.select({ id: course.id, slug: course.slug }).from(course);
  const bySlug = new Map(all.map((c) => [c.slug ?? "", c.id]));
  const links: { courseId: string; role: "included" | "eligible" }[] = [];
  for (const s of dati.included) {
    const id = bySlug.get(s);
    if (!id) throw new Error(`bundle ${slug}: corso included mancante ${s}`);
    links.push({ courseId: id, role: "included" });
  }
  for (const s of dati.eligible ?? []) {
    const id = bySlug.get(s);
    if (!id) throw new Error(`bundle ${slug}: corso eligible mancante ${s}`);
    links.push({ courseId: id, role: "eligible" });
  }
  await db.transaction(async (tx) => {
    await tx
      .update(bundle)
      .set({
        title: dati.title,
        description: dati.description,
        kind: dati.kind,
        stripeProductId: res.productId,
        stripePriceId: res.priceId,
        priceCents: dati.attivoCents,
        listPriceCents: dati.listinoCents,
        currency: "eur",
        active: true,
        position,
        updatedAt: new Date(),
      })
      .where(eq(bundle.id, row.id));
    await tx.delete(bundleCourse).where(eq(bundleCourse.bundleId, row.id));
    await tx.insert(bundleCourse).values(links.map((l) => ({ bundleId: row.id, ...l })));
  });
  return `${slug}: ${dati.attivoCents / 100}€ (listino ${dati.listinoCents / 100}€), ${links.length} corsi ${res.changed ? "price NUOVO" : "invariato"}`;
}

type Verifica = { pass: boolean; dettagli: string[] };

async function verificaStripePrice(
  stripe: Stripe,
  priceId: string | null,
  productId: string | null,
  cents: number,
): Promise<string | null> {
  if (!priceId || !productId) return "stripePriceId/ProductId mancanti nel DB";
  try {
    const p = await stripe.prices.retrieve(priceId);
    const prodId = typeof p.product === "string" ? p.product : p.product?.id;
    if (!p.active) return "price NON attivo su Stripe";
    if (prodId !== productId) return `price su product diverso (${prodId})`;
    if (p.unit_amount !== cents) return `Stripe unit_amount=${p.unit_amount} atteso ${cents}`;
    if (p.currency !== "eur") return `currency=${p.currency}`;
    if (p.tax_behavior !== "exclusive") return `tax_behavior=${p.tax_behavior}`;
    const prod = await stripe.products.retrieve(productId);
    if (!prod.active) return "product NON attivo su Stripe";
    return null;
  } catch (e) {
    return `Stripe: ${(e as Error).message}`;
  }
}

export async function verifyCorsoBySlug(stripe: Stripe, slug: string, fase: "lancio" | "ufficiale"): Promise<Verifica> {
  const dati = corsoDati(slug);
  if (!dati) return { pass: false, dettagli: ["non a listino"] };
  const expected = fase === "lancio" ? dati.attivoCents : dati.listinoCents;
  const [row] = await db.select().from(course).where(eq(course.slug, slug)).limit(1);
  if (!row) return { pass: false, dettagli: ["corso non trovato per slug"] };
  const errs: string[] = [];
  if (row.priceCents !== expected) errs.push(`DB priceCents=${row.priceCents} atteso ${expected}`);
  if (row.listPriceCents !== dati.listinoCents) errs.push(`DB listPriceCents=${row.listPriceCents} atteso ${dati.listinoCents}`);
  const s = await verificaStripePrice(stripe, row.stripePriceId, row.stripeProductId, expected);
  if (s) errs.push(s);
  return { pass: errs.length === 0, dettagli: errs };
}

export async function verifyBundleBySlug(stripe: Stripe, slug: string, fase: "lancio" | "ufficiale"): Promise<Verifica> {
  const dati = bundleDati(slug);
  if (!dati) return { pass: false, dettagli: ["non a listino"] };
  const expected = fase === "lancio" ? dati.attivoCents : dati.listinoCents;
  const [row] = await db.select().from(bundle).where(eq(bundle.slug, slug)).limit(1);
  if (!row) return { pass: false, dettagli: ["bundle non trovato"] };
  const errs: string[] = [];
  if (!row.active) errs.push("non attivo");
  if (row.kind !== dati.kind) errs.push(`kind=${row.kind} atteso ${dati.kind}`);
  if (row.priceCents !== expected) errs.push(`DB priceCents=${row.priceCents} atteso ${expected}`);
  if (row.listPriceCents !== dati.listinoCents) errs.push(`DB listPriceCents=${row.listPriceCents} atteso ${dati.listinoCents}`);
  const links = await db
    .select({ slug: course.slug, role: bundleCourse.role })
    .from(bundleCourse)
    .innerJoin(course, eq(course.id, bundleCourse.courseId))
    .where(eq(bundleCourse.bundleId, row.id));
  const got = {
    included: links.filter((l) => l.role === "included").map((l) => l.slug).sort(),
    eligible: links.filter((l) => l.role === "eligible").map((l) => l.slug).sort(),
  };
  const want = { included: [...dati.included].sort(), eligible: [...(dati.eligible ?? [])].sort() };
  if (JSON.stringify(got) !== JSON.stringify(want)) errs.push(`composizione errata: ${JSON.stringify(got)}`);
  const s = await verificaStripePrice(stripe, row.stripePriceId, row.stripeProductId, expected);
  if (s) errs.push(s);
  return { pass: errs.length === 0, dettagli: errs };
}

export async function verifyCoupons(stripe: Stripe): Promise<Verifica> {
  const errs: string[] = [];
  for (const c of COUPONS_AZIENDA) {
    try {
      const coup = await stripe.coupons.retrieve(c.id);
      if (coup.percent_off !== c.percentOff || !coup.valid) errs.push(`${c.id}: percent_off=${coup.percent_off} valid=${coup.valid}`);
    } catch {
      errs.push(`${c.id}: assente su Stripe`);
    }
  }
  return { pass: errs.length === 0, dettagli: errs };
}
