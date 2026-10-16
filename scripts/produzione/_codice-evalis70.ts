// CODICE PROMOZIONALE EVALIS70 — −70% su qualsiasi acquisto (corsi e pacchetti), riservato allo staff
// Evalis (richiesta del committente del 16/10/2026): non è pubblicizzato, lo conoscono solo loro.
// Massimo 50 utilizzi in tutto. Il cliente lo scrive nel campo «codice promozionale» del checkout
// Stripe (allow_promotion_codes in checkout.ts; il campo non compare quando c'è lo sconto azienda
// automatico, perché Stripe non ammette le due cose insieme).
// Idempotente: crea il coupon e il codice solo se mancano, poi li verifica.
// Uso: npx tsx scripts/produzione/_codice-evalis70.ts [--live-ok]
//   --live-ok  guardia: obbligatoria quando la chiave Stripe nel .env è LIVE
import "dotenv/config";
import Stripe from "stripe";

const COUPON = { id: "evalis70", percentOff: 70, name: "Codice EVALIS70 (staff Evalis)" }; // nome max 40 caratteri
const CODICE = "EVALIS70";
const MAX_UTILIZZI = 50;

const key = process.env.STRIPE_SECRET_KEY ?? "";
const live = key.startsWith("sk_live_");
if (live && !process.argv.includes("--live-ok")) {
  console.error("Chiave Stripe LIVE: rilancia con --live-ok per confermare.");
  process.exit(2);
}
const stripe = new Stripe(key);
console.log(`Stripe: ${live ? "LIVE" : "test"}`);

try {
  await stripe.coupons.retrieve(COUPON.id);
  console.log(`coupon ${COUPON.id}: già presente`);
} catch {
  await stripe.coupons.create({ id: COUPON.id, percent_off: COUPON.percentOff, duration: "once", name: COUPON.name });
  console.log(`coupon ${COUPON.id}: creato`);
}

const esistenti = await stripe.promotionCodes.list({ code: CODICE, limit: 10 });
let promo = esistenti.data.find((p) => p.active);
if (promo) console.log(`codice ${CODICE}: già presente (${promo.id})`);
else {
  promo = await stripe.promotionCodes.create({ coupon: COUPON.id, code: CODICE, max_redemptions: MAX_UTILIZZI });
  console.log(`codice ${CODICE}: creato (${promo.id})`);
}

// verifica: il codice punta al coupon giusto, al 70%, con il tetto di utilizzi
const coupon = typeof promo.coupon === "string" ? await stripe.coupons.retrieve(promo.coupon) : promo.coupon;
const ok = promo.active && coupon.id === COUPON.id && coupon.percent_off === COUPON.percentOff && coupon.valid &&
  promo.max_redemptions === MAX_UTILIZZI;
console.log(`verifica: ${ok ? "OK" : "ERRATA"} · ${coupon.percent_off}% · utilizzi ${promo.times_redeemed}/${promo.max_redemptions}`);
process.exit(ok ? 0 : 1);
