import { test, expect } from "@playwright/test";
import { registraVerificaLogin, tracciaErroriConsole } from "./helpers";

test("landing pubblica carica", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Evalis/);
});

test("gating: /dashboard da sloggato redirige a /login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("registrazione → dashboard → certificati → profilo → logout", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", tracciaErroriConsole(consoleErrors));

  // Registrazione (con verifica email obbligatoria) → utente verificato → login.
  const { email } = await registraVerificaLogin(page);

  // --- Dashboard (gated, empty-state reale) ---
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "I miei percorsi" })).toBeVisible();
  await expect(page.getByText("Non hai ancora percorsi attivi")).toBeVisible();

  // --- Nav: Certificati ---
  await page.getByRole("link", { name: "Certificati" }).click();
  await expect(page).toHaveURL(/\/certificati/);
  await expect(page.getByText("Nessun certificato ancora")).toBeVisible();

  // --- Menu account → Profilo ---
  await page.getByLabel("Menu account").click();
  await page.getByRole("menuitem", { name: "Profilo" }).click();
  await expect(page).toHaveURL(/\/profilo/);
  // l'email compare anche nel footer sidebar: scopiamo al valore del campo profilo (text-near-black)
  await expect(page.locator("span.text-near-black", { hasText: email })).toBeVisible();
  await expect(page.getByText("Sessione singola attiva")).toBeVisible();

  // --- Logout ---
  await page.getByLabel("Menu account").click();
  await page.getByRole("menuitem", { name: "Esci" }).click();
  await expect(page).toHaveURL(/\/login/);

  // --- Gating dopo logout ---
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);

  expect(consoleErrors, `console errors: ${consoleErrors.join(" | ")}`).toEqual([]);
});
