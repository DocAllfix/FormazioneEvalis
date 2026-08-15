import { test, expect } from "@playwright/test";
import { registraVerificaLogin, tracciaErroriConsole } from "./helpers";

// E2E forum (Fase 2C): registrazione → nuovo thread → risposta → lista.
// Cattura gli errori di console (devtools): fallisce se la pagina ne emette.

const stamp = Date.now();

test("forum: registra → nuovo thread → rispondi → lista", async ({ page }) => {
  test.setTimeout(120_000);
  const consoleErrors: string[] = [];
  page.on("console", tracciaErroriConsole(consoleErrors));

  // Registrazione con verifica email → utente autenticato sulla dashboard.
  await registraVerificaLogin(page, "E2E Forum");

  // --- Forum ---
  await page.goto("/forum", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Forum" })).toBeVisible();

  // --- Nuovo thread ---
  const title = `Domanda E2E ${stamp}`;
  await page.getByRole("button", { name: "Nuovo thread" }).click();
  await page.getByLabel("Titolo").fill(title);
  await page.getByLabel("Messaggio").fill("Come si verifica il QR del certificato?");
  await page.getByRole("button", { name: "Pubblica" }).click();

  // --- Vista thread ---
  await expect(page).toHaveURL(/\/forum\/[0-9a-f-]+/, { timeout: 60_000 });
  await expect(page.getByRole("heading", { name: title })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Come si verifica il QR del certificato?")).toBeVisible();

  // --- Risposta ---
  await page.getByPlaceholder("Scrivi una risposta…").fill("Dalla sezione Certificati con il QR");
  await page.getByRole("button", { name: "Rispondi" }).click();
  await expect(page.getByText("Dalla sezione Certificati con il QR")).toBeVisible();

  // --- Lista: il thread compare ---
  await page.goto("/forum", { waitUntil: "domcontentloaded" });
  await expect(page.getByText(title)).toBeVisible();

  expect(consoleErrors, `console errors: ${consoleErrors.join(" | ")}`).toEqual([]);
});
