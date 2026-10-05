// FINE DEL PERIODO DI LANCIO (switch MANUALE, quando deciso): porta i prezzi ATTIVI ai
// prezzi UFFICIALI del listino, per corsi e bundle. Crea un Price nuovo sullo stesso
// Product, disattiva il vecchio, aggiorna il DB (priceCents = listino → il barrato in UI
// sparisce da solo perché listPriceCents non è più maggiore). Voci a prezzo unico
// (19011, agg14001) = no-op.
//
// Uso: npx tsx scripts/produzione/_fine-lancio.ts [--prod] [--live-ok] [--prova] [--anticipa] --confirm
//   --prod      agisce sul database di PRODUZIONE (PROD_DATABASE_URL)
//   --live-ok   guardia: obbligatoria quando la chiave Stripe è LIVE
//   --prova     elenca che cosa cambierebbe, senza toccare né Stripe né il database
//   --anticipa  obbligatorio: il lancio si rinnova ogni mese (fineLancio), chiuderlo è una scelta esplicita
//   --confirm   obbligatorio per scrivere
//
// ⚠️ PERCHÉ --prod CONTA: senza, il client db legge DATABASE_URL, che in locale è il database di
// SVILUPPO. Con la chiave live lo script creerebbe i prezzi nuovi su Stripe e DISATTIVEREBBE i
// vecchi, ma aggiornerebbe il database sbagliato: la produzione resterebbe agganciata a prezzi
// disattivati e ogni acquisto fallirebbe. Per questo il database si sceglie PRIMA di importare
// il client, che legge DATABASE_URL al momento dell'import.
//
// Dopo: npx tsx scripts/produzione/_verifica-listino.ts --fase ufficiale
import "dotenv/config";

const args = process.argv.slice(2);
const suProd = args.includes("--prod");
const prova = args.includes("--prova");

if (suProd) {
  const prod = process.env.PROD_DATABASE_URL;
  if (!prod) { console.error("--prod richiesto ma PROD_DATABASE_URL non è impostata."); process.exit(1); }
  process.env.DATABASE_URL = prod;
}

const { eq } = await import("drizzle-orm");
const { db } = await import("@/lib/db");
const { course, bundle } = await import("@/lib/db/schema");
const { getStripe } = await import("@/lib/stripe/client");
const { CORSI, BUNDLES, fineLancio } = await import("./_listino-dati");

const key = process.env.STRIPE_SECRET_KEY ?? "";
const mode = key.startsWith("sk_live_") ? "LIVE" : "TEST";
const dbHost = (process.env.DATABASE_URL ?? "").match(/@([^:/]+)/)?.[1] ?? "?";
console.log(`Stripe: ${mode} · DB: ${suProd ? "PRODUZIONE" : "sviluppo"} (${dbHost})${prova ? " · PROVA (non scrive)" : ""}`);

if (!prova) {
  if (!args.includes("--confirm")) {
    console.error("Questo script cambia i prezzi DI VENDITA. Rilancia con --confirm (o usa --prova per vedere prima).");
    process.exit(1);
  }
  if (mode === "LIVE" && !args.includes("--live-ok")) {
    console.error("Chiave LIVE: serve --live-ok (guardia anti-errore).");
    process.exit(1);
  }
  if (mode === "LIVE" && !suProd) {
    console.error("Chiave LIVE senza --prod: aggiornerei il database di SVILUPPO lasciando la produzione su prezzi disattivati. Fermo.");
    process.exit(1);
  }
  // il lancio è a rotazione mensile (listino-dati.ts): la scadenza è sempre nel futuro, quindi
  // chiudere davvero il lancio richiede SEMPRE la scelta esplicita --anticipa
  if (Date.now() < fineLancio() && !args.includes("--anticipa")) {
    console.error(`Il prezzo di lancio si rinnova a fine mese (${new Date(fineLancio()).toISOString()}): per chiuderlo davvero serve --anticipa.`);
    process.exit(1);
  }
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
  if (prova) { console.log(`corso ${c.slug}: ${(row.priceCents ?? 0) / 100}€ → ${c.listinoCents / 100}€ (da fare)`); continue; }
  const priceId = await switchPrice(c.slug, row, c.listinoCents);
  await db.update(course).set({ stripePriceId: priceId, priceCents: c.listinoCents }).where(eq(course.id, row.id));
  console.log(`corso ${c.slug}: ${(row.priceCents ?? 0) / 100}€ → ${c.listinoCents / 100}€`);
}

for (const b of BUNDLES) {
  const [row] = await db.select().from(bundle).where(eq(bundle.slug, b.slug)).limit(1);
  if (!row) { console.error(`✗ bundle ${b.slug} non trovato`); process.exit(1); }
  if (row.priceCents === b.listinoCents) { console.log(`bundle ${b.slug}: già a listino, no-op`); continue; }
  if (prova) { console.log(`bundle ${b.slug}: ${(row.priceCents ?? 0) / 100}€ → ${b.listinoCents / 100}€ (da fare)`); continue; }
  const priceId = await switchPrice(b.slug, row, b.listinoCents);
  await db.update(bundle).set({ stripePriceId: priceId, priceCents: b.listinoCents, updatedAt: new Date() }).where(eq(bundle.id, row.id));
  console.log(`bundle ${b.slug}: ${(row.priceCents ?? 0) / 100}€ → ${b.listinoCents / 100}€`);
}

console.log(prova
  ? "PROVA COMPLETA: nulla è stato scritto."
  : "SWITCH COMPLETO. Verifica: npx tsx scripts/produzione/_verifica-listino.ts --fase ufficiale");
process.exit(0);
