import { test, expect } from "@playwright/test";
import { registraVerificaLogin, tracciaErroriConsole } from "./helpers";

// E2E chatbot (Fase 2B): registrazione → apri widget → invia → risposta in STREAMING →
// "Apri un ticket" trasferisce la trascrizione all'assistenza (2A). Cattura errori console.

test("chatbot: registra → chiedi → risposta streaming → apri ticket dalla chat", async ({ page }) => {
  test.setTimeout(120_000);
  const consoleErrors: string[] = [];
  page.on("console", tracciaErroriConsole(consoleErrors));

  // Registrazione con verifica email → utente autenticato sulla dashboard.
  await registraVerificaLogin(page, "E2E Bot");

  await page.goto("/dashboard");

  // apri widget
  await page.getByRole("button", { name: "Assistente" }).click();
  await expect(page.getByText("Assistente Evalis")).toBeVisible();

  // invia un suggerimento → risposta in streaming
  await page.getByRole("button", { name: "Come verifico un certificato?" }).click();
  const bot = page.getByTestId("bot-msg").last();
  await expect(bot).toBeVisible({ timeout: 30_000 });
  // la risposta deve riempirsi (streaming) con testo non banale
  await expect.poll(async () => (await bot.textContent())?.trim().length ?? 0, { timeout: 40_000 }).toBeGreaterThan(20);

  // apri un ticket dalla chat → handoff alla trascrizione
  await page.getByRole("button", { name: /Apri un ticket/i }).click();
  await expect(page).toHaveURL(/\/assistenza\/[0-9a-f-]+/, { timeout: 60_000 });
  await expect(page.getByText("Trascrizione chat:")).toBeVisible({ timeout: 30_000 });

  expect(consoleErrors, `console errors: ${consoleErrors.join(" | ")}`).toEqual([]);
});
