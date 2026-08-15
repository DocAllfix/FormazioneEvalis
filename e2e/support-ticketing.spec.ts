import { test, expect } from "@playwright/test";
import { registraVerificaLogin, tracciaErroriConsole } from "./helpers";

// E2E assistenza (Fase 2A): registrazione discente → apertura ticket → risposta → lista.
// Raccoglie gli errori di console (devtools): la suite fallisce se la pagina ne emette.

const stamp = Date.now();

test("assistenza: registra → apri ticket → rispondi → lista", async ({ page }) => {
  test.setTimeout(120_000); // assorbe i cold-compile delle route in dev
  const consoleErrors: string[] = [];
  page.on("console", tracciaErroriConsole(consoleErrors));

  // Registrazione con verifica email → utente autenticato sulla dashboard.
  await registraVerificaLogin(page, "E2E Ticket");

  // --- Assistenza: empty-state ---
  await page.goto("/assistenza");
  await expect(page.getByRole("heading", { name: "Assistenza" })).toBeVisible();
  await expect(page.getByText("Nessuna richiesta")).toBeVisible();

  // --- Nuovo ticket (dialog) ---
  await page.getByRole("button", { name: "Nuovo ticket" }).click();
  await page.getByLabel("Oggetto").fill("Problema accesso");
  await page.getByLabel("Messaggio").fill("Non riesco ad entrare nel corso");
  await page.getByRole("button", { name: "Invia richiesta" }).click();

  // --- Thread del ticket (toHaveURL poll, no attesa "load"; assert con timeout ampio per il
  // primo compile della route dinamica in dev) ---
  await expect(page).toHaveURL(/\/assistenza\/[0-9a-f-]+/, { timeout: 60_000 });
  await expect(page.getByRole("heading", { name: "Problema accesso" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Non riesco ad entrare nel corso")).toBeVisible();

  // --- Risposta del discente ---
  await page.getByPlaceholder("Scrivi una risposta…").fill("Aggiungo che uso Chrome");
  await page.getByRole("button", { name: "Invia" }).click();
  await expect(page.getByText("Aggiungo che uso Chrome")).toBeVisible();

  // --- Lista: il ticket compare ---
  await page.goto("/assistenza");
  await expect(page.getByText("Problema accesso")).toBeVisible();

  expect(consoleErrors, `console errors: ${consoleErrors.join(" | ")}`).toEqual([]);
});
