// VERIFICA FISCALE (sola lettura): con quale codice imposta viene tassato un corso, e quanta
// IVA pagherebbe davvero un cliente italiano. Un prodotto Stripe creato senza tax_code eredita
// il default dell'account: va confermato che porti al 22%, altrimenti l'IVA non verrebbe
// addebitata al cliente e l'azienda dovrebbe scorporarla dall'incasso.
// Non scrive nulla: legge l'account, legge il prodotto, chiede a Stripe Tax un calcolo.
//
// Uso: npx tsx scripts/produzione/_verifica-iva.ts [--prod] <slug> [<slug> …]
import "dotenv/config";

const args = process.argv.slice(2);
const slugs = args.filter((a) => !a.startsWith("--"));
if (!slugs.length) { console.error("Uso: _verifica-iva.ts [--prod] <slug> [...]"); process.exit(2); }
if (args.includes("--prod")) {
  const prod = process.env.PROD_DATABASE_URL;
  if (!prod) { console.error("--prod richiesto ma PROD_DATABASE_URL non è impostata."); process.exit(1); }
  process.env.DATABASE_URL = prod;
}

const key = process.env.STRIPE_SECRET_KEY ?? "";
console.log(`Stripe: ${key.startsWith("sk_live_") ? "LIVE" : key.startsWith("sk_test_") ? "TEST" : "SCONOSCIUTA"}`);

const { eq } = await import("drizzle-orm");
const { db } = await import("@/lib/db");
const { course } = await import("@/lib/db/schema");
const { getStripe } = await import("@/lib/stripe/client");

const stripe = getStripe();
const settings = await stripe.tax.settings.retrieve();
const codiceDefault = settings.defaults?.tax_code ?? null;
console.log(`Stripe Tax: stato=${settings.status} · codice imposta predefinito dell'account=${codiceDefault ?? "nessuno"}`);

for (const slug of slugs) {
  const [c] = await db
    .select({ title: course.title, prezzo: course.priceCents, prodotto: course.stripeProductId, prezzoId: course.stripePriceId })
    .from(course)
    .where(eq(course.slug, slug))
    .limit(1);
  if (!c) { console.log(`  ${slug}: NON TROVATO nel database`); continue; }
  const prod = c.prodotto ? await stripe.products.retrieve(c.prodotto) : null;
  const codice = prod?.tax_code ?? codiceDefault;
  const imponibile = c.prezzo ?? 0;
  const calc = await stripe.tax.calculations.create({
    currency: "eur",
    line_items: [{
      amount: imponibile,
      reference: "verifica",
      tax_behavior: "exclusive",
      ...(typeof codice === "string" ? { tax_code: codice } : {}),
    }],
    customer_details: {
      address: { line1: "Via Roma 1", postal_code: "20100", city: "Milano", country: "IT" },
      address_source: "billing",
    },
  });
  const aliquota = calc.tax_breakdown?.[0]?.tax_rate_details?.percentage_decimal ?? "?";
  console.log(
    `  ${c.title}\n` +
    `    codice imposta: ${typeof codice === "string" ? codice : String(codice)} (del prodotto: ${prod?.tax_code ?? "nessuno, eredita l'account"})\n` +
    `    imponibile ${(imponibile / 100).toFixed(2)}€ · IVA ${(calc.tax_amount_exclusive / 100).toFixed(2)}€ · aliquota ${aliquota}% · totale cliente ${(calc.amount_total / 100).toFixed(2)}€`,
  );
}
process.exit(0);
