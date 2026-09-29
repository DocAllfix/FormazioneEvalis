// Prova della ricevuta VERA: crea un pagamento sull'account Stripe di TEST (carta di prova, nessun
// denaro), lo semina nel registro di SVILUPPO per un utente di prova, apre il profilo e clicca
// "Scarica ricevuta": deve arrivare alla ricevuta ufficiale di Stripe. Pulisce il registro.
// Strumento di verifica; rifiuta di girare con una chiave che non sia di test.
import "dotenv/config";
import { chromium } from "@playwright/test";
import postgres from "postgres";
import Stripe from "stripe";

const KEY = process.env.STRIPE_SECRET_KEY ?? "";
if (!KEY.startsWith("sk_test_")) { console.error("Serve la chiave di TEST: fermo."); process.exit(1); }
const BASE = "http://localhost:3100";
const email = `ricevuta+${Date.now()}@evalis.test`;
const PASSWORD = "Password123!";
const ok = (m) => console.log(`OK  ${m}`);
const ko = (m) => { console.log(`KO  ${m}`); process.exitCode = 1; };

// 1. pagamento di prova su Stripe TEST
const stripe = new Stripe(KEY);
const pi = await stripe.paymentIntents.create({
  amount: 21838, currency: "eur", payment_method: "pm_card_visa", confirm: true,
  automatic_payment_methods: { enabled: true, allow_redirects: "never" },
  description: "Prova ricevuta Evalis (test)",
});
pi.status === "succeeded" ? ok(`pagamento di prova ${pi.id} riuscito`) : ko(`pagamento di prova: ${pi.status}`);

// 2. utente di prova registrato e verificato, poi l'acquisto seminato nel registro
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
await sql`DELETE FROM rate_limit WHERE "key" LIKE 'auth:%'`;
const b = await chromium.launch();
const p = await b.newPage();
await p.addInitScript(() => {
  try { localStorage.setItem("evalis-consenso-cookie", JSON.stringify({ necessari: true, statistiche: false, quando: new Date().toISOString(), versione: 2 })); } catch {}
});
const r = await p.request.post(`${BASE}/api/auth/sign-up/email`, { data: { name: "Prova Ricevuta", email, password: PASSWORD } });
r.ok() ? ok("utente di prova registrato") : ko(`registrazione: ${r.status()}`);
await sql`UPDATE "user" SET email_verified = true WHERE email = ${email}`;
const [u] = await sql`SELECT id FROM "user" WHERE email = ${email}`;
const [m] = await sql`SELECT organization_id FROM member WHERE user_id = ${u.id} AND role = 'owner' LIMIT 1`;
const [c] = await sql`SELECT id, title FROM course WHERE status = 'published' AND slug IS NOT NULL ORDER BY slug LIMIT 1`;
const evento = `evt_prova_ricevuta_${Date.now()}`;
const [riga] = await sql`
  INSERT INTO payment_event (stripe_event_id, type, livemode, user_id, organization_id, payment_intent_id,
                             amount_total, currency, occurred_at, payload)
  VALUES (${evento}, 'checkout.session.completed', false, ${u.id}, ${m.organization_id}, ${pi.id},
          21838, 'eur', now(),
          ${sql.json({ data: { object: { metadata: { kind: "course_purchase", courseId: c.id, userId: u.id, orgId: m.organization_id } } } })})
  RETURNING id`;

// 3. accesso e clic su "Scarica ricevuta"
const login = await p.request.post(`${BASE}/api/auth/sign-in/email`, { data: { email, password: PASSWORD } });
login.ok() ? ok("accesso") : ko(`accesso: ${login.status()}`);
await p.goto(`${BASE}/profilo`, { waitUntil: "networkidle", timeout: 240000 });
const salta = p.getByRole("button", { name: "Salta" });
if (await salta.isVisible().catch(() => false)) {
  await salta.click();
  await p.waitForURL(/dashboard/, { timeout: 60000 });
  await p.goto(`${BASE}/profilo`, { waitUntil: "networkidle", timeout: 240000 });
}
(await p.getByText(c.title).isVisible()) ? ok(`in elenco: «${c.title.split("—")[0].trim()}» · 218,38 €`) : ko("l'acquisto non compare nel profilo");
await p.screenshot({ path: "produzione/_qa-playwright/_landing/profilo-acquisti.png", fullPage: true });

const [scheda] = await Promise.all([
  p.context().waitForEvent("page"),
  p.locator(`a[href="/api/ricevuta/${riga.id}"]`).click(),
]);
await scheda.waitForLoadState("domcontentloaded", { timeout: 60000 });
const dove = new URL(scheda.url());
dove.host.endsWith("stripe.com") ? ok(`il pulsante apre la ricevuta ufficiale di Stripe (${dove.host})`) : ko(`aperto: ${scheda.url()}`);
await scheda.waitForTimeout(2500);
const testo = await scheda.locator("body").innerText();
/218,38|218\.38/.test(testo) ? ok("la ricevuta riporta l'importo di 218,38 €") : ko("importo non trovato nella ricevuta");
await scheda.screenshot({ path: "produzione/_qa-playwright/_landing/ricevuta-stripe.png", fullPage: true });
await b.close();

// 4. pulizia del registro (append-only: serve la valvola di manutenzione)
await sql.begin(async (tx) => {
  await tx.unsafe("SET LOCAL app.audit_maintenance = 'on'");
  await tx`DELETE FROM payment_event WHERE stripe_event_id = ${evento}`;
});
await sql.end();
console.log(process.exitCode ? "\nPROVA FALLITA" : "\nPROVA COMPLETA");
