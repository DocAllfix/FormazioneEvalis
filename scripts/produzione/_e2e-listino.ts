// E2E LISTINO (Stripe TEST-mode, entità USA-E-GETTA — MAI i 13 corsi reali: il DB è unico
// e valorizzare i loro prezzi li renderebbe subito acquistabili sul sito live).
//
// Copre l'intera catena con dati veri di Stripe:
//  1. corso singolo con sconto azienda −20% AUTOMATICO: sessione con TAX_PARAMS reali,
//     PAGAMENTO REALE con carta test via Playwright (IVA 22% + coupon verificati sui totali),
//  2. consegna dell'evento checkout.session.completed FIRMATO (generateTestHeaderString,
//     stessa verifica di firma del webhook vero) al server locale → enrollment + audit,
//  3. bundle fixed → 2 enrollment + 1 audit; replay dell'evento → "già processato",
//  4. bundle pick_one col corso a scelta → enrollment base+scelto.
// Prerequisito: `npm run dev` attivo su :3000 con lo stesso STRIPE_WEBHOOK_SECRET dell'env.
import "dotenv/config";
import { and, eq, inArray, sql } from "drizzle-orm";
import { chromium } from "@playwright/test";
import { db } from "@/lib/db";
import { course, bundle, bundleCourse, enrollment, organization, activityLog, stripeProcessedEvent } from "@/lib/db/schema";
import { getStripe } from "@/lib/stripe/client";
import { TAX_PARAMS, courseCompanyDiscountPercent } from "@/features/billing/checkout";
import { COMPANY_COUPONS } from "@/features/billing/discounts";
import { serializeOrgMetadata } from "@/features/auth/org-metadata";

const stripe = getStripe();
const key = process.env.STRIPE_SECRET_KEY ?? "";
if (!key.startsWith("sk_test_")) { console.error("E2E SOLO in test-mode (sk_test_)."); process.exit(1); }
const WHSEC = process.env.STRIPE_WEBHOOK_SECRET ?? "";
if (!WHSEC) { console.error("STRIPE_WEBHOOK_SECRET mancante."); process.exit(1); }
const BASE = "http://localhost:3000";
const RUN = Date.now();
let pass = 0, fail = 0;
const ok = (m: string) => { pass++; console.log(`  PASS ${m}`); };
const ko = (m: string) => { fail++; console.log(`  FAIL ${m}`); };

// --- scratch: corsi, bundle, org azienda, customer ---
async function scratchCourse(title: string, cents: number) {
  const [c] = await db.insert(course).values({ title, status: "draft", requiredMinutes: 0 }).returning({ id: course.id });
  const prod = await stripe.products.create({ name: title });
  const price = await stripe.prices.create({ product: prod.id, currency: "eur", unit_amount: cents, tax_behavior: "exclusive" });
  await db.update(course).set({ stripeProductId: prod.id, stripePriceId: price.id, priceCents: cents }).where(eq(course.id, c.id));
  return { id: c.id, priceId: price.id, productId: prod.id };
}

const cleanup: { courses: string[]; bundles: string[]; orgs: string[]; customers: string[]; products: string[] } = { courses: [], bundles: [], orgs: [], customers: [], products: [] };

const cA = await scratchCourse(`E2E singolo ${RUN}`, 10000); // 100,00 €
const cB1 = await scratchCourse(`E2E bundle-a ${RUN}`, 5000);
const cB2 = await scratchCourse(`E2E bundle-b ${RUN}`, 5000);
const cEl = await scratchCourse(`E2E eligible ${RUN}`, 5000);
cleanup.courses.push(cA.id, cB1.id, cB2.id, cEl.id);
cleanup.products.push(cA.productId, cB1.productId, cB2.productId, cEl.productId);

const orgId = `e2e-${RUN}`;
await db.insert(organization).values({
  id: orgId, name: "E2E Azienda", slug: orgId, createdAt: new Date(),
  metadata: serializeOrgMetadata({ type: "company", seatLimit: 10 }),
});
cleanup.orgs.push(orgId);
// primo iscritto già presente → il 2° acquisto deve avere −20%
await db.insert(enrollment).values({ organizationId: orgId, userId: `e2e-u1-${RUN}`, courseId: cA.id, source: "b2c_purchase", status: "active" });

const customer = await stripe.customers.create({ email: `e2e-${RUN}@example.test` });
cleanup.customers.push(customer.id);

// coupon azienda (idempotenti)
for (const [pct, id] of Object.entries(COMPANY_COUPONS)) {
  try { await stripe.coupons.create({ id, percent_off: Number(pct), duration: "once" }); } catch { /* già presente */ }
}

// --- 1. sconto azienda calcolato dal DB reale ---
const pct = await courseCompanyDiscountPercent(orgId, cA.id);
pct === 20 ? ok("sconto azienda: 2° iscritto stessa azienda → 20%") : ko(`sconto azienda: atteso 20, avuto ${pct}`);

// --- 2. sessione corso singolo con TAX_PARAMS + coupon (esattamente come il checkout vero) ---
const buyer2 = `e2e-u2-${RUN}`;
const session = await stripe.checkout.sessions.create({
  mode: "payment",
  customer: customer.id,
  line_items: [{ price: cA.priceId, quantity: 1 }],
  discounts: [{ coupon: COMPANY_COUPONS[20] }],
  ...TAX_PARAMS,
  metadata: { kind: "course_purchase", userId: buyer2, courseId: cA.id, orgId },
  success_url: `${BASE}/dashboard?purchase=success`,
  cancel_url: `${BASE}/dashboard?purchase=cancel`,
});
session.url ? ok("sessione corso singolo creata (Stripe Tax + coupon)") : ko("sessione senza URL");

// --- 3. PAGAMENTO REALE con carta test (Playwright sulla pagina Checkout) ---
async function payCheckout(url: string): Promise<boolean> {
  const b = await chromium.launch();
  const p = await (await b.newContext()).newPage();
  try {
    await p.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await p.waitForTimeout(2500);
    const fill = async (sel: string, v: string) => { const el = p.locator(sel).first(); if (await el.count()) await el.fill(v).catch(() => {}); };
    await fill("#email", `e2e-${RUN}@example.test`);
    await fill("#cardNumber", "4242 4242 4242 4242");
    await fill("#cardExpiry", "12 / 34");
    await fill("#cardCvc", "123");
    await fill("#billingName", "E2E Test");
    const country = p.locator("#billingCountry").first();
    if (await country.count()) await country.selectOption("IT").catch(() => {});
    await p.waitForTimeout(500);
    await fill("#billingAddressLine1", "Via Roma 1");
    await p.waitForTimeout(300);
    // dropdown suggerimenti indirizzo: chiudi con Enter manuale se compare
    await p.keyboard.press("Escape").catch(() => {});
    await fill("#billingLocality", "Milano");
    await fill("#billingPostalCode", "20100");
    await fill("#billingAdministrativeArea", "MI");
    await p.waitForTimeout(800);
    const submit = p.locator(".SubmitButton, button[type=submit]").first();
    await submit.click({ timeout: 10000 });
    // attende il redirect al success o lo stato paid
    for (let i = 0; i < 30; i++) {
      await p.waitForTimeout(2000);
      if (p.url().includes("purchase=success")) break;
      const s = await stripe.checkout.sessions.retrieve(session.id);
      if (s.payment_status === "paid") break;
    }
  } catch (e) {
    console.log("  (playwright:", (e as Error).message.split("\n")[0], ")");
  } finally {
    await b.close();
  }
  const s = await stripe.checkout.sessions.retrieve(session.id);
  return s.payment_status === "paid";
}

const paid = await payCheckout(session.url!);
if (paid) {
  const s = await stripe.checkout.sessions.retrieve(session.id, { expand: ["total_details"] });
  const sub = s.amount_subtotal ?? 0, tot = s.amount_total ?? 0;
  const discount = s.total_details?.amount_discount ?? 0, tax = s.total_details?.amount_tax ?? 0;
  ok(`PAGATO: subtotale ${sub / 100}€, sconto ${discount / 100}€, IVA ${tax / 100}€, totale ${tot / 100}€`);
  discount === 2000 ? ok("coupon −20% applicato (20,00€)") : ko(`sconto atteso 2000, avuto ${discount}`);
  tax === Math.round((sub - discount) * 0.22) ? ok("IVA 22% sull'imponibile scontato") : ko(`IVA ${tax} vs attesa ${Math.round((sub - discount) * 0.22)}`);
} else {
  ko("pagamento test non completato (pagina Checkout non automatizzabile?) — la consegna webhook prosegue comunque");
}

// --- 4. consegna evento FIRMATO al webhook locale (stessa verifica di firma del prod) ---
async function deliverEvent(sessionObj: unknown, eventId: string): Promise<Response> {
  const payload = JSON.stringify({
    id: eventId,
    object: "event",
    api_version: "2023-10-16",
    type: "checkout.session.completed",
    data: { object: sessionObj },
  });
  const sig = stripe.webhooks.generateTestHeaderString({ payload, secret: WHSEC });
  return fetch(`${BASE}/api/webhooks/stripe`, {
    method: "POST",
    headers: { "stripe-signature": sig, "content-type": "application/json" },
    body: payload,
  });
}

const sFinal = await stripe.checkout.sessions.retrieve(session.id);
const r1 = await deliverEvent(sFinal, `evt_e2e_${RUN}_1`);
r1.status === 200 ? ok(`webhook corso singolo → ${r1.status}`) : ko(`webhook → ${r1.status}`);
const [enr2] = await db.select().from(enrollment).where(and(eq(enrollment.userId, buyer2), eq(enrollment.courseId, cA.id)));
enr2?.source === "b2c_purchase" ? ok("enrollment corso singolo creata dal webhook") : ko("enrollment corso singolo ASSENTE");

// --- 5. bundle FIXED: evento sintetico completato (webhook non distingue) → 2 enrollment + 1 audit ---
const [bFix] = await db.insert(bundle).values({ slug: `e2e-fix-${RUN}`, title: "E2E Bundle", kind: "fixed", active: true }).returning();
cleanup.bundles.push(bFix.id);
await db.insert(bundleCourse).values([
  { bundleId: bFix.id, courseId: cB1.id, role: "included" },
  { bundleId: bFix.id, courseId: cB2.id, role: "included" },
]);
const buyer3 = `e2e-u3-${RUN}`;
const fakeBundleSession = { id: `cs_e2e_${RUN}_b`, object: "checkout.session", mode: "payment", payment_status: "paid", metadata: { kind: "bundle_purchase", userId: buyer3, bundleId: bFix.id, orgId } };
const r2 = await deliverEvent(fakeBundleSession, `evt_e2e_${RUN}_2`);
r2.status === 200 ? ok(`webhook bundle fixed → ${r2.status}`) : ko(`webhook bundle → ${r2.status}`);
const enr3 = await db.select().from(enrollment).where(and(eq(enrollment.userId, buyer3), inArray(enrollment.courseId, [cB1.id, cB2.id])));
enr3.length === 2 ? ok("bundle fixed → 2 enrollment") : ko(`bundle fixed → ${enr3.length} enrollment`);
const aud = await db.select().from(activityLog).where(and(eq(activityLog.organizationId, orgId), eq(activityLog.verb, "purchased"), eq(activityLog.object, `bundle:${bFix.id}`)));
aud.length === 1 ? ok("bundle fixed → 1 evento audit") : ko(`audit bundle → ${aud.length}`);

// replay dello STESSO evento → idempotente
const r2b = await deliverEvent(fakeBundleSession, `evt_e2e_${RUN}_2`);
const replayText = await r2b.text();
replayText.includes("già processato") ? ok("replay evento → 'già processato'") : ko(`replay → ${r2b.status} ${replayText}`);

// --- 6. bundle PICK_ONE col corso a scelta ---
const [bPick] = await db.insert(bundle).values({ slug: `e2e-pick-${RUN}`, title: "E2E Pick", kind: "pick_one", active: true }).returning();
cleanup.bundles.push(bPick.id);
await db.insert(bundleCourse).values([
  { bundleId: bPick.id, courseId: cB1.id, role: "included" },
  { bundleId: bPick.id, courseId: cEl.id, role: "eligible" },
]);
const buyer4 = `e2e-u4-${RUN}`;
const fakePickSession = { id: `cs_e2e_${RUN}_p`, object: "checkout.session", mode: "payment", payment_status: "paid", metadata: { kind: "bundle_purchase", userId: buyer4, bundleId: bPick.id, chosenCourseId: cEl.id, orgId } };
const r3 = await deliverEvent(fakePickSession, `evt_e2e_${RUN}_3`);
const enr4 = await db.select().from(enrollment).where(and(eq(enrollment.userId, buyer4), inArray(enrollment.courseId, [cB1.id, cEl.id])));
r3.status === 200 && enr4.length === 2 ? ok("bundle pick_one → base + corso scelto (2 enrollment)") : ko(`pick_one → ${r3.status}, ${enr4.length} enrollment`);

// --- cleanup ---
await db.transaction(async (tx) => {
  await tx.execute(sql`SET LOCAL app.audit_maintenance = 'on'`);
  await tx.delete(activityLog).where(eq(activityLog.organizationId, orgId));
});
await db.delete(stripeProcessedEvent).where(inArray(stripeProcessedEvent.eventId, [`evt_e2e_${RUN}_1`, `evt_e2e_${RUN}_2`, `evt_e2e_${RUN}_3`]));
if (cleanup.bundles.length) await db.delete(bundle).where(inArray(bundle.id, cleanup.bundles));
await db.delete(course).where(inArray(course.id, cleanup.courses)); // cascade enrollment
await db.delete(organization).where(inArray(organization.id, cleanup.orgs));
for (const c of cleanup.customers) await stripe.customers.del(c).catch(() => {});
for (const pId of cleanup.products) await stripe.products.update(pId, { active: false }).catch(() => {});
console.log(`\nE2E: ${pass} PASS, ${fail} FAIL — scratch pulito.`);
process.exit(fail === 0 ? 0 : 1);
