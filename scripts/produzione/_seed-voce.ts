// SEED MIRATO di singole voci del listino: corsi o pacchetti, uno per uno e per nome.
// Serve perché _setup-listino.ts rifà TUTTO il listino: su un account che incassa davvero
// non si passa sopra a prezzi già in vendita per aggiungerne due nuovi.
//
// Uso: npx tsx scripts/produzione/_seed-voce.ts [--prod] [--live-ok] [--prova] corso:<slug> bundle:<slug> …
//   --prod     scrive sul database di PRODUZIONE (PROD_DATABASE_URL) invece che su quello di sviluppo
//   --live-ok  guardia: obbligatoria quando la chiave Stripe è LIVE
//   --prova    dice solo che cosa verrebbe toccato, senza scrivere niente
//
// Tutto passa da argomenti e non da variabili d'ambiente, così il comando si legge per intero
// (e si autorizza) guardando la riga, senza segreti o interruttori nascosti nel contorno.
import "dotenv/config";

const args = process.argv.slice(2);
const voci = args.filter((a) => !a.startsWith("--"));
const prova = args.includes("--prova");
const suProd = args.includes("--prod");
const liveOk = args.includes("--live-ok");

if (!voci.length) {
  console.error("Uso: _seed-voce.ts [--prod] [--live-ok] [--prova] corso:<slug> | bundle:<slug> [...]");
  process.exit(2);
}

// Il database si sceglie PRIMA di importare qualunque cosa lo usi: il client legge
// DATABASE_URL al momento dell'import, non alla prima query.
if (suProd) {
  const prod = process.env.PROD_DATABASE_URL;
  if (!prod) { console.error("--prod richiesto ma PROD_DATABASE_URL non è impostata."); process.exit(1); }
  process.env.DATABASE_URL = prod;
}

const key = process.env.STRIPE_SECRET_KEY ?? "";
const modo = key.startsWith("sk_live_") ? "LIVE" : key.startsWith("sk_test_") ? "TEST" : "SCONOSCIUTA";
const dbHost = (process.env.DATABASE_URL ?? "").match(/@([^:/]+)/)?.[1] ?? "?";
console.log(`Stripe: ${modo} · DB: ${suProd ? "PRODUZIONE" : "sviluppo"} (${dbHost}) · voci: ${voci.length}${prova ? " · PROVA (non scrive)" : ""}`);
if (modo === "SCONOSCIUTA") { console.error("STRIPE_SECRET_KEY assente o non riconosciuta."); process.exit(1); }
if (modo === "LIVE" && !liveOk && !prova) {
  console.error("Chiave LIVE: per scrivere serve --live-ok (guardia anti-errore).");
  process.exit(1);
}

const { getStripe } = await import("@/lib/stripe/client");
const { seedCorsoBySlug, seedBundleBySlug, verifyCorsoBySlug, verifyBundleBySlug } =
  await import("@/features/billing/listino-seed");

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
