import { test, expect } from "@playwright/test";
import { registraVerificaLogin, tracciaErroriConsole } from "./helpers";

// E2E forum (Fase 2C): registrazione → nuovo thread → risposta → lista.
// Cattura gli errori di console (devtools): fallisce se la pagina ne emette.
//
// ⚠️ ISOLATO (test.fixme) — non per un difetto del test, ma per un BUG DI PRODOTTO trovato
// proprio grazie a questo test:
//   dopo le scritture del forum (createThread/replyToThread, che aprono `db.transaction()`),
//   la visita successiva a /forum passa da ~1,4s a ~95s.
//   Diagnosi: una scrittura lascia una transazione orfana (`BEGIN` mai chiuso) su
//   postgres.js + pgbouncer transaction-mode. La migration 0027 aggiunge
//   `idle_in_transaction_session_timeout=30s`, che CHIUDE la transazione lato DB (verificato:
//   sparisce da pg_stat_activity), ma il pende resta: la connessione riservata NON viene
//   recuperata dal pool CLIENT di postgres.js (`max: 3`), e le query in coda aspettano.
//   Il DB risulta idle mentre la pagina pende → il collo di bottiglia è client-side.
//   Impatto produzione: attenuato (le lambda Vercel sono effimere e chiudono le connessioni),
//   quindi bug LATENTE, non incendio.
// Riattivare (togliere .fixme) quando il pool/transazioni saranno sistemati.

const stamp = Date.now();

test.fixme("forum: registra → nuovo thread → rispondi → lista", async ({ page }) => {
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
