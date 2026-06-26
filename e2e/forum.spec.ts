import { test, expect, type ConsoleMessage } from "@playwright/test";

// E2E forum (Fase 2C): registrazione → nuovo thread → risposta → lista.
// Cattura gli errori di console (devtools): fallisce se la pagina ne emette.

const stamp = Date.now();
const email = `e2e-forum+${stamp}@evalis.test`;
const password = "Password123!";
const name = "E2E Forum";

function trackConsole(messages: string[]) {
  return (msg: ConsoleMessage) => {
    if (msg.type() === "error") messages.push(msg.text());
  };
}

test("forum: registra → nuovo thread → rispondi → lista", async ({ page }) => {
  test.setTimeout(120_000);
  const consoleErrors: string[] = [];
  page.on("console", trackConsole(consoleErrors));

  // --- Registrazione ---
  await page.goto("/registrati");
  await page.getByLabel("Nome e cognome").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Conferma password").fill(password);
  const signupResp = page.waitForResponse((r) => r.url().includes("/api/auth/sign-up/email"));
  await page.getByRole("button", { name: "Crea account" }).click();
  await signupResp;
  await page.waitForURL((url) => !url.pathname.includes("/registrati"), { timeout: 20_000 });

  // --- Forum ---
  await page.goto("/forum");
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
  await page.goto("/forum");
  await expect(page.getByText(title)).toBeVisible();

  expect(consoleErrors, `console errors: ${consoleErrors.join(" | ")}`).toEqual([]);
});
