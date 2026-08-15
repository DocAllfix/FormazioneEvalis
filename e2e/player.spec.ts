import { test, expect } from "@playwright/test";
import { registraVerificaLogin, seminaCorsoEIscrivi, tracciaErroriConsole } from "./helpers";

// E2E FRUIZIONE CORSI — il cuore del prodotto.
// Copre la catena che nessun test automatico toccava dal browser: utente verificato → corso
// assegnato → apertura del player → render della slide → il corso compare tra i propri percorsi.
//
// Il video: le slide sono seminate con `avatar_clip_uid = NULL`, così `getSignedClipUrl`
// degrada al manifest HLS di prova (vedi src/lib/env.ts) e il test non dipende da Cloudflare.

test("player: corso assegnato → apri il player → la slide è visibile", async ({ page }) => {
  test.setTimeout(120_000);
  const consoleErrors: string[] = [];
  page.on("console", tracciaErroriConsole(consoleErrors));

  const { email } = await registraVerificaLogin(page, "E2E Player");
  const { enrollmentId } = await seminaCorsoEIscrivi(email);

  // --- Il corso compare tra i percorsi del discente ---
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "I miei percorsi" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Corso E2E/)).toBeVisible({ timeout: 30_000 });

  // --- Apertura del player ---
  await page.goto(`/corso/${enrollmentId}`, { waitUntil: "domcontentloaded" });
  // il titolo della prima slide arriva dal DB attraverso getCourseForPlayer → il render è reale
  await expect(page.getByText("Prima slide E2E").first()).toBeVisible({ timeout: 60_000 });

  expect(consoleErrors, `console errors: ${consoleErrors.join(" | ")}`).toEqual([]);
});

test("player: enrollment di un altro utente → niente accesso (IDOR)", async ({ page }) => {
  test.setTimeout(120_000);

  // Utente A: crea il proprio corso e ne ottiene l'enrollment.
  const { email: emailA } = await registraVerificaLogin(page, "E2E Player A");
  const { enrollmentId: enrollmentA } = await seminaCorsoEIscrivi(emailA);

  // Utente B (nuovo contesto pulito): tenta di aprire il corso di A cambiando l'id nell'URL.
  await page.context().clearCookies();
  await registraVerificaLogin(page, "E2E Player B");
  await page.goto(`/corso/${enrollmentA}`, { waitUntil: "domcontentloaded" });

  // Non deve vedere il contenuto di A: la pagina non mostra la slide del suo corso.
  await expect(page.getByText("Prima slide E2E")).toHaveCount(0);
});
