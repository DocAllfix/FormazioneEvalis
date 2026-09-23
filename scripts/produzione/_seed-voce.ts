// SEED MIRATO di singole voci del listino: corsi o pacchetti, uno per uno e per nome.
// Serve perché _setup-listino.ts rifà TUTTO il listino: su un account che incassa davvero
// non si passa sopra a prezzi già in vendita per aggiungerne due nuovi.
//
// Uso: DATABASE_URL=… npx tsx scripts/produzione/_seed-voce.ts corso:<slug> bundle:<slug> …
//      aggiungi --prova per vedere solo che cosa verrebbe toccato, senza scrivere.
// GUARDIA: con chiave Stripe LIVE serve LISTINO_LIVE_OK=1.
import "dotenv/config";
import { getStripe } from "@/lib/stripe/client";
import { seedCorsoBySlug, seedBundleBySlug, verifyCorsoBySlug, verifyBundleBySlug } from "@/features/billing/listino-seed";

const voci = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const prova = process.argv.includes("--prova");
if (!voci.length) {
  console.error("Uso: _seed-voce.ts corso:<slug> | bundle:<slug> [...] [--prova]");
  process.exit(2);
}

const key = process.env.STRIPE_SECRET_KEY ?? "";
const modo = key.startsWith("sk_live_") ? "LIVE" : key.startsWith("sk_test_") ? "TEST" : "SCONOSCIUTA";
const dbHost = (process.env.DATABASE_URL ?? "").match(/@([^:/]+)/)?.[1] ?? "?";
console.log(`Stripe: ${modo} · DB: ${dbHost} · voci: ${voci.length}${prova ? " · PROVA (non scrive)" : ""}`);
if (modo === "SCONOSCIUTA") { console.error("STRIPE_SECRET_KEY assente o non riconosciuta."); process.exit(1); }
if (modo === "LIVE" && process.env.LISTINO_LIVE_OK !== "1") {
  console.error("Chiave LIVE: per procedere imposta LISTINO_LIVE_OK=1 (guardia anti-errore).");
  process.exit(1);
}

const stripe = getStripe();
for (const voce of voci) {
  const [tipo, ...resto] = voce.split(":");
  const slug = resto.join(":");
  if ((tipo !== "corso" && tipo !== "bundle") || !slug) {
    console.error(`  voce non valida: ${voce} (attesa forma corso:<slug> o bundle:<slug>)`);
    process.exit(2);
  }
  if (prova) {
    const v = tipo === "corso"
      ? await verifyCorsoBySlug(stripe, slug, "lancio")
      : await verifyBundleBySlug(stripe, slug, "lancio");
    console.log(`  ${tipo} ${slug}: ${v.pass ? "già a posto" : "DA SEEDARE"} — ${v.dettagli.join(" · ")}`);
    continue;
  }
  const esito = tipo === "corso" ? await seedCorsoBySlug(stripe, slug) : await seedBundleBySlug(stripe, slug);
  console.log(`  ${tipo} ${esito}`);
}
process.exit(0);
