import { test, expect } from "@playwright/test";
import {
  emailUnica,
  PASSWORD_TEST,
  preImpostaConsensoCookie,
  resetRateLimitAuth,
  verificaEmailNelDb,
  login,
  tracciaErroriConsole,
} from "./helpers";

// E2E AZIENDA — il quarto flusso critico: creazione dello spazio azienda dall'onboarding e
// invito di un dipendente. Non usa `registraVerificaLogin` perché quell'helper SALTA
// l'onboarding, mentre qui l'onboarding è proprio ciò che si vuole esercitare.

test("azienda: crea lo spazio azienda dall'onboarding → invita un dipendente", async ({ page }) => {
  test.setTimeout(150_000);
  const consoleErrors: string[] = [];
  page.on("console", tracciaErroriConsole(consoleErrors));

  await resetRateLimitAuth();
  await preImpostaConsensoCookie(page);

  // --- Registrazione dell'admin azienda ---
  const email = emailUnica("e2e-azienda");
  await page.goto("/registrati");
  await page.getByLabel("Nome e cognome").fill("E2E Admin Azienda");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD_TEST);
  await page.getByLabel("Conferma password").fill(PASSWORD_TEST);
  await page.getByRole("button", { name: "Crea account" }).click();
  await expect(page.getByRole("heading", { name: "Controlla la tua email" })).toBeVisible({ timeout: 30_000 });
  await verificaEmailNelDb(email);
  await login(page, email);

  // --- Onboarding: ramo AZIENDA ---
  await expect(page.getByRole("heading", { name: /Come vuoi usare Evalis Academy/i })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: /Per la mia azienda/i }).click();

  const nomeAzienda = `Acme E2E ${Date.now()}`;
  await page.getByLabel(/Nome dell'azienda|Nome azienda/i).fill(nomeAzienda);

  // conferma: il wizard prosegue fino alla console azienda
  await page.getByRole("button", { name: /Crea|Continua|Avanti/i }).first().click();
  await page.waitForURL((u) => u.pathname.includes("/admin"), { timeout: 60_000, waitUntil: "commit" });

  // --- Invito di un dipendente ---
  await page.goto("/admin/persone", { waitUntil: "domcontentloaded" });
  const emailDipendente = emailUnica("e2e-dipendente");
  await page.getByPlaceholder("nome@azienda.it").fill(emailDipendente);
  await page.getByRole("button", { name: "Invita" }).click();

  // il dipendente invitato compare nell'elenco dell'azienda
  await expect(page.getByText(emailDipendente)).toBeVisible({ timeout: 30_000 });

  expect(consoleErrors, `console errors: ${consoleErrors.join(" | ")}`).toEqual([]);
});
