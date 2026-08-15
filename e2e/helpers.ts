// Helper condivisi per i test e2e.
//
// Il nodo: l'app ha `requireEmailVerification: true`, quindi la registrazione NON crea sessione
// e mostra "Controlla la tua email". Per esercitare le aree autenticate (dashboard, player,
// azienda) serve un utente VERIFICATO. Riproduciamo il pattern dei test .db (che fanno
// `db.update(user).set({ emailVerified: true })`), ma senza importare `@/lib/auth` — che
// trascinerebbe `next/headers` fuori dal contesto Next. Usiamo una connessione Postgres diretta,
// col DATABASE_URL del dev server (STESSO DB), per marcare l'email verificata.

import "dotenv/config";
import { type Page, type Locator, type ConsoleMessage, expect } from "@playwright/test";
import postgres from "postgres";

const DB = process.env.DATABASE_URL;

// Rumore di console noto e innocuo (non sono errori dell'app):
// - 'upgrade-insecure-requests' ignorato perché la CSP è in report-only (scelta dell'audit, M1).
const RUMORE_CONSOLE = ["upgrade-insecure-requests"];

/** True se il messaggio è rumore noto da ignorare nei controlli di console pulita. */
export function isRumoreConsole(text: string): boolean {
  return RUMORE_CONSOLE.some((r) => text.includes(r));
}

/** Raccoglitore di errori di console REALI (filtra il rumore noto). */
export function tracciaErroriConsole(bucket: string[]) {
  return (msg: ConsoleMessage) => {
    if (msg.type() === "error" && !isRumoreConsole(msg.text())) bucket.push(msg.text());
  };
}

/** Email unica per run: evita collisioni tra test paralleli/ripetuti. */
export function emailUnica(prefisso = "e2e"): string {
  return `${prefisso}+${Date.now()}-${Math.random().toString(36).slice(2, 7)}@evalis.test`;
}

export const PASSWORD_TEST = "Password123!";

/** Marca l'email come verificata nel DB (bypassa il link email, che in test non riceviamo). */
export async function verificaEmailNelDb(email: string): Promise<void> {
  if (!DB) throw new Error("DATABASE_URL mancante: i test e2e autenticati richiedono il DB dev (.env).");
  const sql = postgres(DB, { prepare: false, max: 1 });
  try {
    await sql`UPDATE "user" SET email_verified = true WHERE email = ${email}`;
  } finally {
    await sql.end();
  }
}

/**
 * Azzera il rate limit delle rotte auth. La produzione consente 5 registrazioni/ora per IP
 * (anti signup-bomb): una suite e2e ne fa di più e da un solo IP (localhost/runner) → si
 * bloccherebbe. La protezione vera resta coperta da `rate-limit.db.test.ts`.
 */
export async function resetRateLimitAuth(): Promise<void> {
  if (!DB) return;
  const sql = postgres(DB, { prepare: false, max: 1 });
  try {
    await sql`DELETE FROM rate_limit WHERE "key" LIKE 'auth:%'`;
  } finally {
    await sql.end();
  }
}

/**
 * Il banner cookie (fixed-bottom) copre sia "Crea account" nel form sia il menu account nel
 * footer, ed è animato: chiuderlo cliccando è fragile e può interferire col form React.
 * Lo eliminiamo alla radice pre-impostando il consenso in localStorage PRIMA del primo load,
 * così il banner non compare mai. `versione: 2` = VERSIONE_INFORMATIVA (src/features/consenso/stato.ts).
 */
export async function preImpostaConsensoCookie(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      localStorage.setItem(
        "evalis-consenso-cookie",
        JSON.stringify({ necessari: true, statistiche: false, quando: new Date().toISOString(), versione: 2 }),
      );
    } catch {
      /* storage non disponibile */
    }
  });
}

/**
 * Compila un campo in modo resistente all'IDRATAZIONE: React, idratando dopo il primo `load`,
 * resetta i campi compilati troppo presto (Nome/Email si svuotavano, Password no). `toPass`
 * ricompila e verifica finché il valore regge, cioè finché l'idratazione è completata.
 */
async function fillStabile(campo: Locator, value: string): Promise<void> {
  await expect(async () => {
    await campo.fill(value);
    await expect(campo).toHaveValue(value, { timeout: 1000 });
  }).toPass({ timeout: 10_000 });
}

/** Login via UI. Presuppone utente già esistente e verificato. */
export async function login(page: Page, email: string, password = PASSWORD_TEST): Promise<void> {
  await page.goto("/login");
  await fillStabile(page.getByLabel("Email"), email);
  await fillStabile(page.getByLabel("Password", { exact: true }), password);
  await page.getByRole("button", { name: "Accedi" }).click();
  // "commit": basta che l'URL cambi. Con "load" (default) si pende se la pagina di
  // destinazione ha risorse lente (visto su alcune route in dev).
  await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 20_000, waitUntil: "commit" });
}

/**
 * Al primo accesso l'app mostra l'onboarding ("Come vuoi usare Evalis Academy?").
 * Per i test learner lo saltiamo → dashboard. Idempotente: se non c'è, non fa nulla.
 */
export async function saltaOnboardingSePresente(page: Page): Promise<void> {
  const salta = page.getByRole("button", { name: "Salta" });
  // Il wizard si idrata dopo il redirect: attendiamo il bottone invece di leggerlo subito.
  try {
    await salta.waitFor({ state: "visible", timeout: 8000 });
  } catch {
    return; // onboarding già completato: niente da saltare
  }
  await salta.click();
  await page.waitForURL((u) => u.pathname.includes("/dashboard"), { timeout: 20_000, waitUntil: "commit" });
}

/**
 * Percorso completo per ottenere una sessione autenticata e verificata:
 * registra via UI → conferma la schermata di verifica → verifica l'email nel DB → login.
 * Ritorna le credenziali create.
 */
export async function registraVerificaLogin(
  page: Page,
  nome = "E2E Tester",
): Promise<{ email: string; password: string }> {
  await resetRateLimitAuth(); // evita il blocco 5-registrazioni/ora durante la suite
  await preImpostaConsensoCookie(page); // niente banner cookie a coprire i controlli
  const email = emailUnica();
  await page.goto("/registrati");
  await fillStabile(page.getByLabel("Nome e cognome"), nome);
  await fillStabile(page.getByLabel("Email"), email);
  await fillStabile(page.getByLabel("Password", { exact: true }), PASSWORD_TEST);
  await fillStabile(page.getByLabel("Conferma password"), PASSWORD_TEST);
  const signup = page.waitForResponse((r) => r.url().includes("/api/auth/sign-up/email"));
  await page.getByRole("button", { name: "Crea account" }).click();
  await signup;
  // Conferma che il flusso reale mostra la verifica email (non un redirect diretto).
  await expect(page.getByRole("heading", { name: "Controlla la tua email" })).toBeVisible();
  await verificaEmailNelDb(email);
  await login(page, email, PASSWORD_TEST);
  await saltaOnboardingSePresente(page);
  return { email, password: PASSWORD_TEST };
}
