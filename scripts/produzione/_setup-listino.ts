// SEED del listino (CLI locale): stessa implementazione della route di go-live
// (src/features/billing/listino-seed.ts) — corsi, bundle e coupon, idempotente.
// GUARDIA: con chiave LIVE serve LISTINO_LIVE_OK=1.
import "dotenv/config";
import { getStripe } from "@/lib/stripe/client";
import { CORSI, BUNDLES } from "@/features/billing/listino-dati";
import { ensureCoupons, seedCorsoBySlug, seedBundleBySlug } from "@/features/billing/listino-seed";

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
for (const r of await ensureCoupons(stripe)) console.log(`coupon ${r}`);
for (const c of CORSI) console.log(`corso ${await seedCorsoBySlug(stripe, c.slug)}`);
for (const b of BUNDLES) console.log(`bundle ${await seedBundleBySlug(stripe, b.slug)}`);
console.log("SETUP COMPLETO. Ora: npx tsx scripts/produzione/_verifica-listino.ts --fase lancio");
process.exit(0);
