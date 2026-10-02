// Anteprima della mail di vendita costruita da una sessione Stripe VERA (di test), salvata da
// _prova-campi-fattura.mjs. Scrive l'HTML e ne fa lo screenshot. Nessun invio.
import { readFileSync, writeFileSync } from "node:fs";
import "dotenv/config";
import { chromium } from "@playwright/test";
import type Stripe from "stripe";
import { datiVendita, mailVendita } from "@/features/billing/notifica-vendita";
const OUT = "produzione/_qa-playwright/_landing";
const s = JSON.parse(readFileSync(`${OUT}/sessione-fattura.json`, "utf8")) as Stripe.Checkout.Session;
const { subject, html } = mailVendita(datiVendita(s, s.created), "Corso di prova fattura");
writeFileSync(`${OUT}/mail-vendita.html`, html);
console.log(`oggetto: ${subject}`);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 700, height: 900 } });
await p.setContent(html);
await p.screenshot({ path: `${OUT}/mail-vendita.png`, fullPage: true });
await b.close();
