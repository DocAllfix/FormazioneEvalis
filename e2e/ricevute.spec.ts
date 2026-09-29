// Profilo → I miei acquisti → Scarica ricevuta, nel browser.
// La regola di chi vede cosa è provata a fondo in src/__tests__/acquisti.db.test.ts; qui si
// prova la pagina e la rotta: accesso negato da sloggati, 404 identico per id inesistenti o
// altrui, elenco visibile al proprietario, e ripiego ordinato se Stripe non ha la ricevuta.
// Il pagamento si semina nel registro del DB di sviluppo (come fanno gli altri e2e col corso).

import "dotenv/config";
import { test, expect } from "@playwright/test";
import postgres from "postgres";
import { registraVerificaLogin, tracciaErroriConsole } from "./helpers";

const DB = process.env.DATABASE_URL!;
const seminati: string[] = [];

async function seminaAcquisto(email: string, intent: string): Promise<string> {
  const sql = postgres(DB, { prepare: false, max: 1 });
  try {
    const [u] = await sql`SELECT id FROM "user" WHERE email = ${email}`;
    const [m] = await sql`SELECT organization_id FROM member WHERE user_id = ${u.id} AND role = 'owner' LIMIT 1`;
    const [c] = await sql`SELECT id, title FROM course WHERE status = 'published' AND slug IS NOT NULL ORDER BY slug LIMIT 1`;
    const evento = `evt_e2e_ricevuta_${Date.now()}`;
    seminati.push(evento);
    const [r] = await sql`
      INSERT INTO payment_event (stripe_event_id, type, livemode, user_id, organization_id, payment_intent_id,
                                 amount_total, currency, occurred_at, payload)
      VALUES (${evento}, 'checkout.session.completed', false, ${u.id}, ${m.organization_id}, ${intent},
              21838, 'eur', now(),
              ${sql.json({ data: { object: { metadata: { kind: "course_purchase", courseId: c.id, userId: u.id, orgId: m.organization_id } } } })})
      RETURNING id`;
    return r.id as string;
  } finally {
    await sql.end();
  }
}

test.afterAll(async () => {
  if (!seminati.length) return;
  const sql = postgres(DB, { prepare: false, max: 1 });
  try {
    await sql.begin(async (tx) => {
      await tx.unsafe("SET LOCAL app.audit_maintenance = 'on'"); // il registro è append-only
      await tx`DELETE FROM payment_event WHERE stripe_event_id = ANY(${seminati})`;
    });
  } finally {
    await sql.end();
  }
});

test("da sloggati la ricevuta chiede l'accesso", async ({ page }) => {
  await page.goto("/api/ricevuta/00000000-0000-4000-8000-000000000000");
  await expect(page).toHaveURL(/\/login\?next=%2Fprofilo/);
});

test("profilo: acquisti, ricevuta dei propri pagamenti, 404 per quelli che non esistono", async ({ page }) => {
  test.setTimeout(120_000);
  const errori: string[] = [];
  page.on("console", tracciaErroriConsole(errori));
  const { email } = await registraVerificaLogin(page);

  // senza acquisti
  await page.goto("/profilo");
  await expect(page.getByRole("heading", { name: "I miei acquisti" })).toBeVisible();
  await expect(page.getByText("Non hai ancora fatto acquisti.")).toBeVisible();

  // un id che non esiste: 404, senza dire se il pagamento c'è o è di altri
  const inesistente = await page.request.get("/api/ricevuta/00000000-0000-4000-8000-000000000000", { maxRedirects: 0 });
  expect(inesistente.status()).toBe(404);

  // un acquisto suo, con un pagamento che su Stripe non esiste: si vede in elenco, e la ricevuta
  // ripiega sul profilo con un avviso invece di rompersi
  const id = await seminaAcquisto(email, `pi_e2e_inesistente_${Date.now()}`);
  await page.goto("/profilo");
  const voce = page.locator(`a[href="/api/ricevuta/${id}"]`);
  await expect(voce).toBeVisible();
  await expect(page.getByText("218,38")).toBeVisible();
  const r = await page.request.get(`/api/ricevuta/${id}`, { maxRedirects: 0 });
  expect(r.status()).toBe(303);
  expect(r.headers()["location"]).toContain("/profilo?ricevuta=non-disponibile");
  await page.goto("/profilo?ricevuta=non-disponibile");
  await expect(page.getByText("La ricevuta non è disponibile in questo momento")).toBeVisible();
  expect(errori).toEqual([]);
});
