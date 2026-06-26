import { test, expect, type ConsoleMessage } from "@playwright/test";

// E2E assistenza (Fase 2A): registrazione discente → apertura ticket → risposta → lista.
// Raccoglie gli errori di console (devtools): la suite fallisce se la pagina ne emette.

const stamp = Date.now();
const email = `e2e-tic+${stamp}@evalis.test`;
const password = "Password123!";
const name = "E2E Ticket";

function trackConsole(messages: string[]) {
  return (msg: ConsoleMessage) => {
    if (msg.type() === "error") messages.push(msg.text());
  };
}

test("assistenza: registra → apri ticket → rispondi → lista", async ({ page }) => {
  test.setTimeout(120_000); // assorbe i cold-compile delle route in dev
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
