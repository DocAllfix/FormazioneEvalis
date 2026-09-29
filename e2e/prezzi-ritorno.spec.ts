// Prezzi in pubblico e ritorno automatico dopo la registrazione.
//
// Il percorso che il committente ha chiesto: chi clicca un prezzo in landing si registra e,
// confermata la mail, torna sul prodotto che aveva scelto, pronto per comprarlo. Qui si prova
// ogni anello della catena. Il link della mail non arriva nei test: si verifica che la
// registrazione lo costruisca col ritorno giusto (callbackURL) e poi si apre la sua
// destinazione, come farebbe il link.
//
// Serve un corso vero, pubblicato e a prezzo di lancio: lo si prende dal DB di sviluppo (il
// seed degli altri test crea corsi senza slug né prezzo, che in landing non compaiono).

import "dotenv/config";
import { test, expect } from "@playwright/test";
import postgres from "postgres";
import {
  emailUnica,
  fillStabile,
  login,
  PASSWORD_TEST,
  preImpostaConsensoCookie,
  registraVerificaLogin,
  resetRateLimitAuth,
  tracciaErroriConsole,
  verificaEmailNelDb,
} from "./helpers";

async function corsoInVendita(): Promise<{ id: string; slug: string }> {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });
  try {
    const [c] = await sql`
      SELECT id, slug FROM course
      WHERE status = 'published' AND organization_id IS NULL AND slug IS NOT NULL
        AND stripe_price_id IS NOT NULL AND list_price_cents > price_cents
      ORDER BY slug LIMIT 1`;
    if (!c) throw new Error("Nessun corso pubblicato a prezzo di lancio nel DB di sviluppo.");
    return { id: c.id as string, slug: c.slug as string };
  } finally {
    await sql.end();
  }
}

test("prezzi visibili in pubblico: catalogo e scheda", async ({ page }) => {
  const errori: string[] = [];
  page.on("console", tracciaErroriConsole(errori));
  await preImpostaConsensoCookie(page);
  const corso = await corsoInVendita();

  await page.goto("/catalogo");
  await expect(page.getByText("+ IVA").first()).toBeVisible();
  await expect(page.getByText("Prezzo lancio").first()).toBeVisible();
  await expect(page.getByText(/Prezzo di lancio fino al/).first()).toBeVisible();

  await page.goto(`/catalogo/${corso.slug}`);
  await expect(page.getByRole("link", { name: "Acquista il corso" })).toBeVisible();
  await expect(page.getByText("Prezzo lancio")).toBeVisible();
  expect(errori).toEqual([]);
});

test("il prezzo del corso porta alla registrazione col ritorno a quel corso", async ({ page }) => {
  await preImpostaConsensoCookie(page);
  const corso = await corsoInVendita();
  await page.goto(`/catalogo/${corso.slug}`);
  await page.getByRole("link", { name: "Acquista il corso" }).click();
  await expect(page).toHaveURL(`/registrati?next=${encodeURIComponent(`/corsi/${corso.id}`)}`);
});

test("il pacchetto porta alla registrazione col ritorno a QUEL pacchetto", async ({ page }) => {
  await preImpostaConsensoCookie(page);
  await page.goto("/catalogo");
  const pacchetto = page.locator('[id^="pacchetto-"]').first();
  const id = await pacchetto.getAttribute("id");
  await pacchetto.getByRole("link", { name: /acquista/i }).click();
  await expect(page).toHaveURL(`/registrati?next=${encodeURIComponent(`/corsi#${id}`)}`);
});

test("utente nuovo: registrazione → conferma → onboarding → torna sul corso scelto", async ({ page }) => {
  test.setTimeout(120_000);
  await resetRateLimitAuth();
  await preImpostaConsensoCookie(page);
  const corso = await corsoInVendita();
  const destinazione = `/corsi/${corso.id}`;
  const email = emailUnica("ritorno");

  // registrazione partita dal prezzo: il link di conferma deve riportare all'onboarding col ritorno
  await page.goto(`/registrati?next=${encodeURIComponent(destinazione)}`);
  await fillStabile(page.getByLabel("Nome e cognome"), "E2E Ritorno");
  await fillStabile(page.getByLabel("Email"), email);
  await fillStabile(page.getByLabel("Password", { exact: true }), PASSWORD_TEST);
  await fillStabile(page.getByLabel("Conferma password"), PASSWORD_TEST);
  const richiesta = page.waitForRequest((r) => r.url().includes("/api/auth/sign-up/email"));
  await page.getByRole("button", { name: "Crea account" }).click();
  const corpo = JSON.parse((await richiesta).postData() ?? "{}");
  const callback = `/onboarding?next=${encodeURIComponent(destinazione)}`;
  expect(corpo.callbackURL).toBe(callback);
  await expect(page.getByRole("heading", { name: "Controlla la tua email" })).toBeVisible();
  await expect(page.getByText("Dal link tornerai direttamente")).toBeVisible();

  // il link della mail: email confermata, poi si arriva sulla sua destinazione. Senza la
  // sessione che il link creerebbe, l'onboarding chiede l'accesso CONSERVANDO il ritorno.
  await verificaEmailNelDb(email);
  await login(page, email, PASSWORD_TEST, callback);
  await expect(page).toHaveURL(/\/onboarding\?next=/);

  await page.getByRole("button", { name: "Salta" }).click();
  await expect(page).toHaveURL(destinazione);
  await expect(page.getByRole("button", { name: /acquista il corso/i })).toBeVisible();
});

test("utente già registrato: 'Hai già un account?' → accesso → torna sul corso", async ({ page, context }) => {
  test.setTimeout(120_000);
  const corso = await corsoInVendita();
  const { email } = await registraVerificaLogin(page); // utente esistente, onboarding già fatto
  await context.clearCookies(); // esce
  await login(page, email, PASSWORD_TEST, `/corsi/${corso.id}`);
  await expect(page).toHaveURL(`/corsi/${corso.id}`);
});

test("sicurezza: un next verso un altro sito viene ignorato", async ({ page, context }) => {
  test.setTimeout(120_000);
  const { email } = await registraVerificaLogin(page);
  await context.clearCookies();
  await resetRateLimitAuth();
  await page.goto("/login?next=//evil.example");
  await fillStabile(page.getByLabel("Email"), email);
  await fillStabile(page.getByLabel("Password", { exact: true }), PASSWORD_TEST);
  await page.getByRole("button", { name: "Accedi" }).click();
  await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 20_000, waitUntil: "commit" });
  const u = new URL(page.url());
  expect(u.hostname).toBe("localhost");
  expect(u.pathname).toBe("/dashboard");
});
