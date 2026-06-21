// Crea (idempotente, via lookup_key) i due prezzi di TEST per il Modulo 2:
//  - posto B2B (recurring mensile)  - corso B2C (one-off)
// Esegui: node scripts/stripe-setup.mjs
// Poi: STRIPE_SEAT_PRICE_ID=<seat> in .env; assegna <course> a course.stripe_price_id.

import "dotenv/config";
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("STRIPE_SECRET_KEY mancante in .env");
  process.exit(1);
}
const stripe = new Stripe(key);

async function ensurePrice({ productName, lookupKey, priceData }) {
  const existing = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });
  if (existing.data[0]) return existing.data[0];
  const product = await stripe.products.create({ name: productName });
  return stripe.prices.create({ product: product.id, lookup_key: lookupKey, ...priceData });
}

const seat = await ensurePrice({
  productName: "Posto formazione (B2B)",
  lookupKey: "evalis_seat_monthly",
  priceData: { currency: "eur", unit_amount: 4900, recurring: { interval: "month" } },
});

const course = await ensurePrice({
  productName: "Corso singolo (B2C)",
  lookupKey: "evalis_course_oneoff",
  priceData: { currency: "eur", unit_amount: 9900 },
});

console.log("\n=== Prezzi di test pronti ===");
console.log("SEAT  (B2B):", seat.id, "→ .env  STRIPE_SEAT_PRICE_ID=" + seat.id);
console.log("COURSE(B2C):", course.id, "→ assegnare a course.stripe_price_id del corso di esempio");
