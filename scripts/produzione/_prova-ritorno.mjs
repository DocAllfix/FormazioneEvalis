// Prova del percorso VERO "clic sul prezzo → registrazione → link della mail → prodotto scelto".
// Strumento temporaneo di verifica: legge il link di conferma dal log del server di sviluppo
// (in dev resend.ts lo stampa), invece di marcare l'email come verificata nel DB, così mette alla
// prova anche il passaggio del ritorno DENTRO il link di conferma.
//
// Uso: node scripts/produzione/_prova-ritorno.mjs <log del dev server> corso|pacchetto
import "dotenv/config";
import fs from "node:fs";
import { chromium } from "@playwright/test";
import postgres from "postgres";

const [LOG, CASO = "corso"] = process.argv.slice(2);
const BASE = "http://localhost:3100";
const SLUG = "auditor-lead-auditor-iso-9001-2026-sistemi-di-gestione-per-la-qualita";
const email = `ritorno+${Date.now()}@evalis.test`;
const PASSWORD = "Password123!";

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
await sql`DELETE FROM rate_limit WHERE "key" LIKE 'auth:%'`; // 5 registrazioni/ora per IP
const [corso] = await sql`SELECT id FROM course WHERE slug = ${SLUG}`;

const passi = [];
const ok = (m) => { passi.push(`OK  ${m}`); console.log(`OK  ${m}`); };
const ko = (m) => { console.log(`KO  ${m}`); process.exitCode = 1; };

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
await p.addInitScript(() => {
  try {
    localStorage.setItem("evalis-consenso-cookie", JSON.stringify({ necessari: true, statistiche: false, quando: new Date().toISOString(), versione: 2 }));
  } catch {}
});

// 1. dal prodotto pubblico al modulo di registrazione, con il ritorno nell'URL
let atteso;
if (CASO === "pacchetto") {
  await p.goto(`${BASE}/catalogo`, { waitUntil: "networkidle", timeout: 240000 });
  await p.locator("#pacchetto-qualita").getByRole("link", { name: /acquista/i }).click();
  atteso = "/corsi#pacchetto-qualita";
} else {
  await p.goto(`${BASE}/catalogo/${SLUG}`, { waitUntil: "networkidle", timeout: 240000 });
  await p.getByRole("link", { name: "Acquista il corso" }).click();
  atteso = `/corsi/${corso.id}`;
}
await p.waitForURL(/\/registrati\?next=/, { timeout: 60000 });
const nextNelModulo = new URL(p.url()).searchParams.get("next");
nextNelModulo === atteso ? ok(`registrazione con next=${nextNelModulo}`) : ko(`next nel modulo: ${nextNelModulo}, atteso ${atteso}`);

// 2. registrazione (i campi si riempiono dopo l'idratazione)
async function riempi(etichetta, valore, exact = false) {
  const campo = p.getByLabel(etichetta, { exact });
  for (let i = 0; i < 20; i++) {
    await campo.fill(valore);
    await p.waitForTimeout(300);
    if ((await campo.inputValue()) === valore) return;
  }
  throw new Error(`campo ${etichetta} non stabile`);
}
await riempi("Nome e cognome", "Prova Ritorno");
await riempi("Email", email);
await riempi("Password", PASSWORD, true);
await riempi("Conferma password", PASSWORD);
const richiesta = p.waitForRequest((r) => r.url().includes("/api/auth/sign-up/email"));
await p.getByRole("button", { name: "Crea account" }).click();
const corpo = JSON.parse((await richiesta).postData() ?? "{}");
const callbackAtteso = `/onboarding?next=${encodeURIComponent(atteso)}`;
corpo.callbackURL === callbackAtteso ? ok(`callbackURL=${corpo.callbackURL}`) : ko(`callbackURL ${corpo.callbackURL}, atteso ${callbackAtteso}`);
await p.getByRole("heading", { name: "Controlla la tua email" }).waitFor({ timeout: 30000 });
(await p.getByText("Dal link tornerai direttamente").isVisible()) ? ok("la conferma avvisa che si tornerà al prodotto") : ko("manca l'avviso del ritorno");

// 3. il link della mail, come lo riceverebbe l'utente (dal log del server di sviluppo)
let link = null;
for (let i = 0; i < 60 && !link; i++) {
  const testo = fs.readFileSync(LOG, "utf8");
  const blocco = testo.split(`[verify-email] → ${email}`)[1];
  link = blocco?.match(/link=(\S+)/)?.[1] ?? null;
  if (!link) await p.waitForTimeout(1000);
}
link ? ok("link di conferma trovato") : ko("link di conferma non trovato nel log");

// 4. si apre il link: better-auth verifica, crea la sessione e rimanda al callbackURL
await p.goto(link, { waitUntil: "commit", timeout: 120000 });
await p.waitForURL(/\/onboarding/, { timeout: 120000 });
const suOnboarding = new URL(p.url());
suOnboarding.searchParams.get("next") === atteso
  ? ok(`dopo il link: ${suOnboarding.pathname}?next=${suOnboarding.searchParams.get("next")}`)
  : ko(`dopo il link: ${p.url()}`);

// 5. l'onboarding si salta (il caso più rapido) e si deve atterrare sul prodotto
const salta = p.getByRole("button", { name: "Salta" });
await salta.waitFor({ state: "visible", timeout: 60000 });
await salta.click();
await p.waitForURL((u) => u.pathname.startsWith("/corsi"), { timeout: 120000 });
const arrivo = new URL(p.url());
(arrivo.pathname + arrivo.hash) === atteso ? ok(`atterrato su ${arrivo.pathname}${arrivo.hash}`) : ko(`atterrato su ${p.url()}`);

if (CASO === "pacchetto") {
  const pacchetto = p.locator("#pacchetto-qualita");
  await pacchetto.waitFor({ timeout: 60000 });
  await p.waitForTimeout(1500);
  (await pacchetto.isVisible()) ? ok("il Pacchetto Qualità è in vista") : ko("il pacchetto non è in vista");
  (await pacchetto.getByRole("button", { name: /acquista/i }).isVisible())
    ? ok("il pulsante Acquista del pacchetto è lì, pronto")
    : ko("manca il pulsante Acquista del pacchetto");
  // il tour guidato parte dopo 900 ms: si aspetta oltre, poi deve NON esserci
  await p.waitForTimeout(3000);
  (await p.locator(".driver-popover").count()) === 0
    ? ok("nessun tour guidato sopra il pacchetto")
    : ko("il tour guidato copre il pacchetto");
  await pacchetto.screenshot({ path: "produzione/_qa-playwright/_landing/ritorno-pacchetto.png" });
  // alla visita normale successiva il tour deve comparire (non è stato segnato come visto)
  await p.goto(`${BASE}/corsi`, { waitUntil: "networkidle", timeout: 120000 });
  await p.locator(".driver-popover").waitFor({ state: "visible", timeout: 15000 }).then(
    () => ok("alla visita normale di /corsi il tour compare come prima"),
    () => ko("alla visita normale di /corsi il tour non compare più"),
  );
} else {
  const compra = p.getByRole("button", { name: /acquista il corso/i });
  await compra.waitFor({ timeout: 60000 });
  ok("sulla scheda del corso c'è il pulsante Acquista il corso");
  await p.screenshot({ path: "produzione/_qa-playwright/_landing/ritorno-corso.png" });
}

await b.close();
await sql.end();
console.log(process.exitCode ? "\nPERCORSO ROTTO" : `\nPERCORSO COMPLETO (${passi.length} controlli)`);
