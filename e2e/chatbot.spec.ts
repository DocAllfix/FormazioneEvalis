import { test, expect, type ConsoleMessage } from "@playwright/test";

// E2E chatbot (Fase 2B): registrazione → apri widget → invia → risposta in STREAMING →
// "Apri un ticket" trasferisce la trascrizione all'assistenza (2A). Cattura errori console.

const stamp = Date.now();
const email = `e2e-bot+${stamp}@evalis.test`;
const password = "Password123!";
const name = "E2E Bot";

function trackConsole(messages: string[]) {
  return (msg: ConsoleMessage) => {
    if (msg.type() === "error") messages.push(msg.text());
  };
}

test("chatbot: registra → chiedi → risposta streaming → apri ticket dalla chat", async ({ page }) => {
  test.setTimeout(120_000);
  const consoleErrors: string[] = [];
  page.on("console", trackConsole(consoleErrors));

  // registrazione
  await page.goto("/registrati");
  await page.getByLabel("Nome e cognome").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Conferma password").fill(password);
  const signupResp = page.waitForResponse((r) => r.url().includes("/api/auth/sign-up/email"));
  await page.getByRole("button", { name: "Crea account" }).click();
  await signupResp;
  await page.waitForURL((url) => !url.pathname.includes("/registrati"), { timeout: 20_000 });

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
