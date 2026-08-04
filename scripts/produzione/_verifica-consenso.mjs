// Verifica che il consenso comandi DAVVERO il caricamento di Google Analytics.
//
//   npx next start -p 3210
//   node scripts/produzione/_verifica-consenso.mjs http://localhost:3210
//
// Non guarda lo stato interno del componente: guarda le RICHIESTE DI RETE che partono dal
// browser. E' l'unica misura che conta — «GA4 configurato per non tracciare» e «GA4 mai
// scaricato» sono due cose diverse, e solo la seconda regge davanti a un'ispezione.

import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3210";
const GOOGLE = /googletagmanager\.com|google-analytics\.com|analytics\.google\.com|doubleclick\.net/i;

let fallite = 0;
function esito(ok, nome, dettaglio = "") {
  if (!ok) fallite++;
  console.log(`  ${ok ? "OK   " : "ROSSO"} ${nome}${dettaglio ? " — " + dettaglio : ""}`);
}

const browser = await chromium.launch();

// --- 1. Nessuna scelta espressa: il banner c'e' e Google non viene contattato -------------
{
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  const versoGoogle = [];
  p.on("request", (r) => { if (GOOGLE.test(r.url())) versoGoogle.push(r.url()); });

  await p.goto(BASE + "/blog", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(4000);

  const banner = await p.getByRole("dialog", { name: /preferenze sui cookie/i }).isVisible().catch(() => false);
  esito(banner, "il banner compare al primo accesso");
  esito(versoGoogle.length === 0, "senza scelta, ZERO richieste verso Google", versoGoogle.join(", "));

  const stato = await p.evaluate(() => {
    const d = window.dataLayer || [];
    const ultimo = [...d].reverse().find((a) => a && a[0] === "consent");
    return ultimo ? JSON.stringify(ultimo[2]) : "nessuno";
  });
  esito(/denied/.test(stato) && !/granted/.test(stato), "Consent Mode parte tutto negato", stato);

  const bottoni = await p.locator("div[role=dialog] button").allInnerTexts();
  esito(bottoni.some((b) => /^rifiuta$/i.test(b.trim())), "esiste un bottone 'Rifiuta'", bottoni.join(" | "));
  esito(bottoni.some((b) => /^accetta$/i.test(b.trim())), "esiste un bottone 'Accetta'");
  await ctx.close();
}

// --- 2. Rifiuto: il banner sparisce e Google resta fuori ----------------------------------
{
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  const versoGoogle = [];
  p.on("request", (r) => { if (GOOGLE.test(r.url())) versoGoogle.push(r.url()); });

  await p.goto(BASE + "/blog", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(2500);
  await p.getByRole("button", { name: "Rifiuta", exact: true }).click();
  await p.waitForTimeout(3000);

  esito(versoGoogle.length === 0, "dopo il RIFIUTO, ZERO richieste verso Google", versoGoogle.join(", "));

  // la scelta deve sopravvivere al ricaricamento, altrimenti si richiede a ogni visita
  await p.reload({ waitUntil: "domcontentloaded" });
  await p.waitForTimeout(3000);
  const riapparso = await p.locator("div[role=dialog]").isVisible().catch(() => false);
  esito(!riapparso, "la scelta sopravvive al ricaricamento");
  esito(versoGoogle.length === 0, "e anche dopo il ricaricamento nessuna richiesta");
  await ctx.close();
}

// --- 3. Accettazione: solo ORA Google viene caricato --------------------------------------
{
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  const versoGoogle = [];
  p.on("request", (r) => { if (GOOGLE.test(r.url())) versoGoogle.push(r.url()); });

  await p.goto(BASE + "/blog", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(2500);
  const primaDellAccettazione = versoGoogle.length;
  await p.getByRole("button", { name: "Accetta", exact: true }).click();
  await p.waitForTimeout(5000);

  esito(primaDellAccettazione === 0, "prima del clic, nessuna richiesta");
  esito(versoGoogle.length > 0, "dopo l'ACCETTAZIONE, GA4 viene caricato", `${versoGoogle.length} richieste`);

  const stato = await p.evaluate(() => {
    const d = window.dataLayer || [];
    const ultimo = [...d].reverse().find((a) => a && a[0] === "consent" && a[1] === "update");
    return ultimo ? JSON.stringify(ultimo[2]) : "nessun update";
  });
  esito(/"analytics_storage":"granted"/.test(stato), "statistiche concesse", stato);
  esito(/"ad_storage":"denied"/.test(stato), "pubblicita' NEGATA anche dopo l'accettazione");
  await ctx.close();
}

// --- 4. Revoca dal footer -----------------------------------------------------------------
{
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await p.goto(BASE + "/blog", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(2500);
  await p.getByRole("button", { name: "Accetta", exact: true }).click();
  await p.waitForTimeout(1500);

  const link = p.getByRole("button", { name: /preferenze cookie/i }).first();
  await link.scrollIntoViewIfNeeded();
  await link.click();
  await p.waitForTimeout(1500);

  const riaperto = await p.locator("div[role=dialog]").isVisible().catch(() => false);
  esito(riaperto, "il link nel footer riapre il banner (consenso revocabile)");

  const stato = await p.evaluate(() => {
    const d = window.dataLayer || [];
    const ultimo = [...d].reverse().find((a) => a && a[0] === "consent" && a[1] === "update");
    return ultimo ? JSON.stringify(ultimo[2]) : "nessun update";
  });
  esito(/"analytics_storage":"denied"/.test(stato), "la revoca riporta il consenso a negato", stato);
  await ctx.close();
}

await browser.close();
console.log(fallite === 0 ? "\nTUTTO VERDE" : `\n${fallite} CONTROLLI ROSSI`);
process.exit(fallite === 0 ? 0 : 1);
