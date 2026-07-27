// VERIFICA (read-only): confronta DB + Stripe contro il listino approvato, voce per voce.
// PASS/FAIL per 13 corsi + 5 bundle (con composizione ESATTA) + 2 coupon azienda.
// --fase lancio (default) confronta il prezzo attivo con attivoCents; --fase ufficiale
// con listinoCents (per il dopo _fine-lancio). Exit 1 se anche una sola voce FAIL.
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { course, bundle, bundleCourse } from "@/lib/db/schema";
import { getStripe } from "@/lib/stripe/client";
import { CORSI, BUNDLES, COUPONS_AZIENDA } from "./_listino-dati";

const fase = process.argv.includes("--fase") ? process.argv[process.argv.indexOf("--fase") + 1] : "lancio";
if (fase !== "lancio" && fase !== "ufficiale") { console.error("--fase lancio|ufficiale"); process.exit(1); }
const stripe = getStripe();
let fails = 0;
const ok = (label: string) => console.log(`  PASS  ${label}`);
const ko = (label: string, why: string) => { fails++; console.log(`  FAIL  ${label} — ${why}`); };

async function checkStripePrice(label: string, priceId: string | null, productId: string | null, cents: number) {
  if (!priceId || !productId) return ko(label, "stripePriceId/ProductId mancanti nel DB");
  try {
    const p = await stripe.prices.retrieve(priceId);
    const prodId = typeof p.product === "string" ? p.product : p.product?.id;
    if (!p.active) return ko(label, "price NON attivo su Stripe");
    if (prodId !== productId) return ko(label, `price su product diverso (${prodId})`);
    if (p.unit_amount !== cents) return ko(label, `Stripe unit_amount=${p.unit_amount} atteso ${cents}`);
    if (p.currency !== "eur") return ko(label, `currency=${p.currency}`);
    if (p.tax_behavior !== "exclusive") return ko(label, `tax_behavior=${p.tax_behavior} (serve exclusive per Stripe Tax)`);
    const prod = await stripe.products.retrieve(productId);
    if (!prod.active) return ko(label, "product NON attivo su Stripe");
    ok(label);
  } catch (e) {
    ko(label, `Stripe: ${(e as Error).message}`);
  }
}

console.log(`VERIFICA LISTINO — fase: ${fase.toUpperCase()}`);

console.log("Corsi:");
for (const c of CORSI) {
  const expected = fase === "lancio" ? c.attivoCents : c.listinoCents;
  const [row] = await db.select().from(course).where(eq(course.slug, c.slug)).limit(1);
  if (!row) { ko(c.slug, "corso non trovato per slug"); continue; }
  if (row.priceCents !== expected) { ko(c.slug, `DB priceCents=${row.priceCents} atteso ${expected}`); continue; }
  if (row.listPriceCents !== c.listinoCents) { ko(c.slug, `DB listPriceCents=${row.listPriceCents} atteso ${c.listinoCents}`); continue; }
  await checkStripePrice(c.slug, row.stripePriceId, row.stripeProductId, expected);
}

console.log("Bundle:");
for (const b of BUNDLES) {
  const expected = fase === "lancio" ? b.attivoCents : b.listinoCents;
  const [row] = await db.select().from(bundle).where(eq(bundle.slug, b.slug)).limit(1);
  if (!row) { ko(b.slug, "bundle non trovato"); continue; }
  if (!row.active) { ko(b.slug, "non attivo"); continue; }
  if (row.kind !== b.kind) { ko(b.slug, `kind=${row.kind} atteso ${b.kind}`); continue; }
  if (row.priceCents !== expected) { ko(b.slug, `DB priceCents=${row.priceCents} atteso ${expected}`); continue; }
  if (row.listPriceCents !== b.listinoCents) { ko(b.slug, `DB listPriceCents=${row.listPriceCents} atteso ${b.listinoCents}`); continue; }
  // composizione ESATTA (per slug corso)
  const links = await db
    .select({ slug: course.slug, role: bundleCourse.role })
    .from(bundleCourse)
    .innerJoin(course, eq(course.id, bundleCourse.courseId))
    .where(eq(bundleCourse.bundleId, row.id));
  const got = { included: links.filter((l) => l.role === "included").map((l) => l.slug).sort(), eligible: links.filter((l) => l.role === "eligible").map((l) => l.slug).sort() };
  const want = { included: [...b.included].sort(), eligible: [...(b.eligible ?? [])].sort() };
  if (JSON.stringify(got) !== JSON.stringify(want)) { ko(b.slug, `composizione errata: ${JSON.stringify(got)} vs attesa ${JSON.stringify(want)}`); continue; }
  await checkStripePrice(b.slug, row.stripePriceId, row.stripeProductId, expected);
}

console.log("Coupon azienda:");
for (const c of COUPONS_AZIENDA) {
  try {
    const coup = await stripe.coupons.retrieve(c.id);
    if (coup.percent_off === c.percentOff && coup.valid) ok(c.id);
    else ko(c.id, `percent_off=${coup.percent_off} valid=${coup.valid}`);
  } catch {
    ko(c.id, "coupon assente su Stripe");
  }
}

console.log(fails === 0 ? `\nTUTTO PASS (${CORSI.length} corsi + ${BUNDLES.length} bundle + ${COUPONS_AZIENDA.length} coupon) — piattaforma = listino.` : `\n${fails} FAIL — NON conforme al listino.`);
process.exit(fails === 0 ? 0 : 1);
