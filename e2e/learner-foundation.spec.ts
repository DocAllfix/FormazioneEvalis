import { test, expect, type ConsoleMessage } from "@playwright/test";

// Utente unico per ogni run (evita conflitti di email).
const stamp = Date.now();
const email = `e2e+${stamp}@evalis.test`;
const password = "Password123!";
const name = "E2E Tester";

// Raccoglie errori di console (devtools) per ogni pagina.
function trackConsole(messages: string[]) {
  return (msg: ConsoleMessage) => {
    if (msg.type() === "error") messages.push(msg.text());
  };
}

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
  page.on("console", trackConsole(consoleErrors));

  // --- Registrazione (better-auth) ---
  await page.goto("/registrati");
  await page.getByLabel("Nome e cognome").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Conferma password").fill(password);
  const signupResp = page.waitForResponse((r) =>
    r.url().includes("/api/auth/sign-up/email"),
  );
  await page.getByRole("button", { name: "Crea account" }).click();
  await signupResp; // sign-up completato (cookie sessione impostato)
  await page.waitForURL((url) => !url.pathname.includes("/registrati"), {
    timeout: 20_000,
  }); // redirect client (router.push) avvenuto

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
  await expect(page.getByText(email)).toBeVisible();
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
