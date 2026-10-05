// Prova dei campi per la fattura sull'account Stripe di TEST (nessun denaro): crea una sessione
// con gli stessi parametri del checkout vero (IVA + campi fattura), la apre nel browser, compila
// codice fiscale e SDI/PEC, paga con la carta di prova e rilegge la sessione completata.
// Stampa la sessione su produzione/_qa-playwright/_landing/sessione-fattura.json, che la prova
// della mail usa come dato vero. Rifiuta di girare con una chiave che non sia di test.
import "dotenv/config";
import { writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import Stripe from "stripe";

const KEY = process.env.STRIPE_SECRET_KEY ?? "";
if (!KEY.startsWith("sk_test_")) { console.error("Serve la chiave di TEST: fermo."); process.exit(1); }
const stripe = new Stripe(KEY);
const OUT = "produzione/_qa-playwright/_landing";

// stessi parametri di src/features/billing/checkout.ts (TAX_PARAMS + CAMPI_FATTURA)
const CAMPI = [
  { key: "sdipec", label: { type: "custom", custom: "Codice SDI o PEC (privati: 0000000)" }, type: "text", optional: false, text: { minimum_length: 6, maximum_length: 100 } },
  { key: "codicefiscale", label: { type: "custom", custom: "Codice fiscale (solo se vuoi la fattura)" }, type: "text", optional: true, text: { maximum_length: 16 } },
];
const NOTA = { submit: { message: "Codice SDI o PEC: le aziende indicano il proprio codice destinatario o la PEC. I privati che non li hanno, o che non hanno bisogno della fattura, scrivono 0000000 (sette zeri). Il codice fiscale serve solo ai privati che vogliono la fattura." } };
const cliente = await stripe.customers.create({ email: `fattura+${Date.now()}@evalis.test`, name: "Prova Fattura" });
const s = await stripe.checkout.sessions.create({
  mode: "payment",
  customer: cliente.id,
  line_items: [{ quantity: 1, price_data: { currency: "eur", unit_amount: 17900, tax_behavior: "exclusive", product_data: { name: "Corso di prova fattura", tax_code: "txcd_20060058" } } }],
  automatic_tax: { enabled: true },
  billing_address_collection: "required",
  tax_id_collection: { enabled: true },
  customer_update: { address: "auto", name: "auto" },
  custom_fields: CAMPI,
  custom_text: NOTA,
  locale: "it",
  metadata: { kind: "course_purchase", userId: "prova", courseId: "prova", orgId: "prova" },
  success_url: "https://example.com/ok",
  cancel_url: "https://example.com/no",
});
console.log(`OK  Stripe accetta la sessione con i campi: ${s.id}`);

const b = await chromium.launch();
const p = await b.newPage({ locale: "it-IT" });
await p.goto(s.url, { waitUntil: "domcontentloaded", timeout: 90000 });
await p.locator("#codicefiscale, [name=codicefiscale]").first().waitFor({ timeout: 60000 });
await p.screenshot({ path: `${OUT}/checkout-campi-fattura.png`, fullPage: true });
console.log(`OK  pagina aperta, screenshot in ${OUT}/checkout-campi-fattura.png`);

// compilazione e pagamento con la carta di prova
try {
  await p.locator("#sdipec, [name=sdipec]").first().fill("0000000"); // privato: sette zeri, niente CF
  await p.locator("[data-testid=card-accordion-item]").click(); // i campi carta compaiono dopo la scelta
  await p.locator("#cardNumber").waitFor({ timeout: 30000 });
  const card = p.locator("#cardNumber");
  if (await card.count()) {
    await card.fill("4242424242424242");
    await p.locator("#cardExpiry").fill("12 / 34");
    await p.locator("#cardCvc").fill("123");
  }
  await p.locator("#billingName").fill("Mario Rossi");
  const paese = p.locator("#billingCountry");
  if (await paese.count()) await paese.selectOption("IT");
  await p.locator("#billingAddressLine1").fill("Via Roma 1");
  await p.locator("#billingPostalCode").fill("00100");
  await p.locator("#billingLocality").fill("Roma");
  const prov = p.locator("#billingAdministrativeArea");
  if (await prov.count()) await prov.selectOption({ label: "Roma" }).catch(() => prov.fill("RM"));
  await p.screenshot({ path: `${OUT}/checkout-campi-compilati.png`, fullPage: true });
  await p.locator("button[type=submit]").first().click();
  await p.waitForURL(/example\.com\/ok/, { timeout: 90000 });
  const fatta = await stripe.checkout.sessions.retrieve(s.id);
  console.log(`OK  pagamento di prova completato: ${fatta.payment_status}`);
  console.log(`    campi ricevuti: ${JSON.stringify(fatta.custom_fields.map((c) => [c.key, c.text?.value]))}`);
  writeFileSync(`${OUT}/sessione-fattura.json`, JSON.stringify(fatta, null, 2));
} catch (e) {
  await p.screenshot({ path: `${OUT}/checkout-errore.png`, fullPage: true });
  console.log(`KO  compilazione automatica non riuscita: ${e.message.split("\n")[0]}`);
  process.exitCode = 1;
}
await b.close();
