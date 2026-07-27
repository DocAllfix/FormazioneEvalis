// SEED del listino: crea/aggiorna Product+Price Stripe (tax_behavior exclusive) per i 13
// corsi e i 5 bundle, i coupon azienda, e scrive il DB. IDEMPOTENTE: rieseguibile — se il
// Price attivo corrisponde già ai valori non crea nulla. Mapping per SLUG (fail esplicito).
// GUARDIA: con chiave LIVE serve LISTINO_LIVE_OK=1 (evita di scrivere price di test in prod).
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { course, bundle, bundleCourse } from "@/lib/db/schema";
import { getStripe } from "@/lib/stripe/client";
import { CORSI, BUNDLES, COUPONS_AZIENDA } from "./_listino-dati";

const key = process.env.STRIPE_SECRET_KEY ?? "";
const mode = key.startsWith("sk_live_") ? "LIVE" : key.startsWith("sk_test_") ? "TEST" : "SCONOSCIUTA";
const dbHost = (process.env.DATABASE_URL ?? "").match(/@([^:/]+)/)?.[1] ?? "?";
console.log(`Stripe: ${mode} · DB: ${dbHost}`);
if (mode === "SCONOSCIUTA") { console.error("STRIPE_SECRET_KEY assente o non riconosciuta."); process.exit(1); }
if (mode === "LIVE" && process.env.LISTINO_LIVE_OK !== "1") {
  console.error("Chiave LIVE: per procedere imposta LISTINO_LIVE_OK=1 (guardia anti-errore).");
  process.exit(1);
}

const stripe = getStripe();

/** Price attivo conforme? Altrimenti creane uno nuovo sul Product e disattiva il vecchio. */
async function ensurePrice(opts: {
  name: string;
  productId: string | null;
  currentPriceId: string | null;
  cents: number;
}): Promise<{ productId: string; priceId: string; changed: boolean }> {
  const productId = opts.productId ?? (await stripe.products.create({ name: opts.name })).id;
  if (opts.currentPriceId) {
    try {
      const p = await stripe.prices.retrieve(opts.currentPriceId);
      const prodOk = (typeof p.product === "string" ? p.product : p.product?.id) === productId;
      if (p.active && prodOk && p.unit_amount === opts.cents && p.currency === "eur" && p.tax_behavior === "exclusive") {
        return { productId, priceId: p.id, changed: false };
      }
    } catch { /* price inesistente/di un'altra modalità → si ricrea */ }
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

// --- coupon azienda (ID fissi, idempotenti) ---
for (const c of COUPONS_AZIENDA) {
  try {
    await stripe.coupons.create({ id: c.id, percent_off: c.percentOff, duration: "once", name: c.name });
    console.log(`coupon ${c.id}: creato`);
  } catch (e) {
    if ((e as { code?: string }).code === "resource_already_exists") console.log(`coupon ${c.id}: già presente`);
    else throw e;
  }
}

// --- corsi ---
const bySlug = new Map<string, { id: string; title: string; stripeProductId: string | null; stripePriceId: string | null }>();
for (const r of await db
  .select({ id: course.id, slug: course.slug, title: course.title, stripeProductId: course.stripeProductId, stripePriceId: course.stripePriceId })
  .from(course)) {
  if (r.slug) bySlug.set(r.slug, r);
}
for (const c of CORSI) {
  const row = bySlug.get(c.slug);
  if (!row) { console.error(`✗ CORSO NON TROVATO per slug: ${c.slug}`); process.exit(1); }
  const res = await ensurePrice({ name: row.title, productId: row.stripeProductId, currentPriceId: row.stripePriceId, cents: c.attivoCents });
  await db
    .update(course)
    .set({
      stripeProductId: res.productId,
      stripePriceId: res.priceId,
      priceCents: c.attivoCents,
      listPriceCents: c.listinoCents,
      currency: "eur",
    })
    .where(eq(course.id, row.id));
  console.log(`corso ${c.slug}: ${c.attivoCents / 100}€ (listino ${c.listinoCents / 100}€) ${res.changed ? "→ price NUOVO" : "→ invariato"}`);
}

// --- bundle ---
for (const [i, b] of BUNDLES.entries()) {
  const [existing] = await db.select().from(bundle).where(eq(bundle.slug, b.slug)).limit(1);
  const row =
    existing ??
    (await db
      .insert(bundle)
      .values({ slug: b.slug, title: b.title, description: b.description, kind: b.kind, position: i })
      .returning())[0];
  const res = await ensurePrice({ name: b.title, productId: row.stripeProductId, currentPriceId: row.stripePriceId, cents: b.attivoCents });
  // composizione: mappa gli slug → id corso (fail esplicito) e ricostruisci in tx
  const links: { courseId: string; role: "included" | "eligible" }[] = [];
  for (const slug of b.included) {
    const cr = bySlug.get(slug);
    if (!cr) { console.error(`✗ bundle ${b.slug}: corso included mancante ${slug}`); process.exit(1); }
    links.push({ courseId: cr.id, role: "included" });
  }
  for (const slug of b.eligible ?? []) {
    const cr = bySlug.get(slug);
    if (!cr) { console.error(`✗ bundle ${b.slug}: corso eligible mancante ${slug}`); process.exit(1); }
    links.push({ courseId: cr.id, role: "eligible" });
  }
  await db.transaction(async (tx) => {
    await tx
      .update(bundle)
      .set({
        title: b.title,
        description: b.description,
        kind: b.kind,
        stripeProductId: res.productId,
        stripePriceId: res.priceId,
        priceCents: b.attivoCents,
        listPriceCents: b.listinoCents,
        currency: "eur",
        active: true,
        position: i,
        updatedAt: new Date(),
      })
      .where(eq(bundle.id, row.id));
    await tx.delete(bundleCourse).where(eq(bundleCourse.bundleId, row.id));
    await tx.insert(bundleCourse).values(links.map((l) => ({ bundleId: row.id, ...l })));
  });
  console.log(`bundle ${b.slug}: ${b.attivoCents / 100}€ (listino ${b.listinoCents / 100}€), ${links.length} corsi ${res.changed ? "→ price NUOVO" : "→ invariato"}`);
}

console.log("SETUP COMPLETO. Ora esegui: npx tsx scripts/produzione/_verifica-listino.ts --fase lancio");
process.exit(0);
