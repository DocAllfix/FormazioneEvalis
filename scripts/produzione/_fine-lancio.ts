// FINE DEL PERIODO DI LANCIO (switch MANUALE, quando deciso): porta i prezzi ATTIVI ai
// prezzi UFFICIALI del listino, per corsi e bundle. Crea un Price nuovo sullo stesso
// Product, disattiva il vecchio, aggiorna il DB (priceCents = listino → il barrato in UI
// sparisce da solo perché listPriceCents non è più maggiore). Voci a prezzo unico
// (19011, agg14001) = no-op. Richiede --confirm. Con chiave LIVE serve anche LISTINO_LIVE_OK=1.
// Dopo: npx tsx scripts/produzione/_verifica-listino.ts --fase ufficiale
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { course, bundle } from "@/lib/db/schema";
import { getStripe } from "@/lib/stripe/client";
import { CORSI, BUNDLES } from "./_listino-dati";

const key = process.env.STRIPE_SECRET_KEY ?? "";
const mode = key.startsWith("sk_live_") ? "LIVE" : "TEST";
console.log(`Stripe: ${mode}`);
if (!process.argv.includes("--confirm")) {
  console.error("Questo script cambia i prezzi DI VENDITA. Rilancia con --confirm.");
  process.exit(1);
}
if (mode === "LIVE" && process.env.LISTINO_LIVE_OK !== "1") {
  console.error("Chiave LIVE: serve LISTINO_LIVE_OK=1.");
  process.exit(1);
}
const stripe = getStripe();

async function switchPrice(label: string, row: { stripeProductId: string | null; stripePriceId: string | null }, cents: number) {
  if (!row.stripeProductId) throw new Error(`${label}: stripeProductId mancante (esegui prima _setup-listino)`);
  const price = await stripe.prices.create({ product: row.stripeProductId, currency: "eur", unit_amount: cents, tax_behavior: "exclusive" });
  if (row.stripePriceId) await stripe.prices.update(row.stripePriceId, { active: false }).catch(() => {});
  return price.id;
}

for (const c of CORSI) {
  if (c.attivoCents === c.listinoCents) { console.log(`corso ${c.slug}: prezzo unico, no-op`); continue; }
  const [row] = await db.select().from(course).where(eq(course.slug, c.slug)).limit(1);
  if (!row) { console.error(`✗ corso ${c.slug} non trovato`); process.exit(1); }
  if (row.priceCents === c.listinoCents) { console.log(`corso ${c.slug}: già a listino, no-op`); continue; }
  const priceId = await switchPrice(c.slug, row, c.listinoCents);
  await db.update(course).set({ stripePriceId: priceId, priceCents: c.listinoCents }).where(eq(course.id, row.id));
  console.log(`corso ${c.slug}: ${(row.priceCents ?? 0) / 100}€ → ${c.listinoCents / 100}€`);
}

for (const b of BUNDLES) {
  const [row] = await db.select().from(bundle).where(eq(bundle.slug, b.slug)).limit(1);
  if (!row) { console.error(`✗ bundle ${b.slug} non trovato`); process.exit(1); }
  if (row.priceCents === b.listinoCents) { console.log(`bundle ${b.slug}: già a listino, no-op`); continue; }
  const priceId = await switchPrice(b.slug, row, b.listinoCents);
  await db.update(bundle).set({ stripePriceId: priceId, priceCents: b.listinoCents, updatedAt: new Date() }).where(eq(bundle.id, row.id));
  console.log(`bundle ${b.slug}: ${(row.priceCents ?? 0) / 100}€ → ${b.listinoCents / 100}€`);
}

console.log("SWITCH COMPLETO. Verifica: npx tsx scripts/produzione/_verifica-listino.ts --fase ufficiale");
process.exit(0);
