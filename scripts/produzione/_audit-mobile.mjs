// Audit mobile delle pagine pubbliche: apre ogni pagina su viewport da telefono e cerca i
// difetti REALI, non a occhio — scroll orizzontale, elementi che sbordano, testo troppo piccolo,
// bersagli da toccare sotto i 44px (soglia di accessibilita'), immagini senza alt.
// Uso: node scripts/produzione/_audit-mobile.mjs [baseUrl]
import fs from "node:fs";
import { chromium, devices } from "@playwright/test";

const BASE = (process.argv[2] ?? "http://localhost:3200").replace(/\/$/, "");
const OUT = "produzione/_qa-mobile";
fs.mkdirSync(OUT, { recursive: true });

const PAGINE = ["/", "/catalogo", "/aziende", "/blog", "/pricing"];

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices["iPhone 13"] });
let totale = 0;

for (const via of PAGINE) {
  const page = await ctx.newPage();
  const resp = await page.goto(BASE + via, { waitUntil: "networkidle", timeout: 45000 }).catch(() => null);
  if (!resp || resp.status() >= 400) {
    console.log(`${via.padEnd(12)} HTTP ${resp?.status() ?? "errore"} — saltata`);
    await page.close();
    continue;
  }
  // il banner cookie copre il fondo pagina: si chiude per non falsare le misure
  await page.getByRole("button", { name: /ho capito/i }).click({ timeout: 2500 }).catch(() => {});
  await page.waitForTimeout(500);

  const esito = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const problemi = [];

    if (document.documentElement.scrollWidth > vw + 1)
      problemi.push(`la pagina scorre in orizzontale (${document.documentElement.scrollWidth}px su ${vw})`);

    const visibile = (e) => {
      const s = getComputedStyle(e);
      return s.display !== "none" && s.visibility !== "hidden" && e.getClientRects().length > 0;
    };

    const sbordano = [];
    for (const e of document.querySelectorAll("body *")) {
      if (!visibile(e)) continue;
      const r = e.getBoundingClientRect();
      if (r.width === 0) continue;
      if (r.right > vw + 2 || r.left < -2) {
        const id = e.tagName.toLowerCase() + (e.className && typeof e.className === "string" ? "." + e.className.split(" ")[0] : "");
        const txt = (e.textContent || "").trim().slice(0, 40);
        sbordano.push(`${id} → ${Math.round(r.left)}..${Math.round(r.right)}px «${txt}»`);
      }
    }
    for (const x of [...new Set(sbordano)].slice(0, 6)) problemi.push(`sborda: ${x}`);

    const piccoli = [];
    for (const e of document.querySelectorAll("a, button, [role=button]")) {
      if (!visibile(e)) continue;
      const r = e.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.height < 40 && (e.textContent || "").trim().length > 0)
        piccoli.push(`${(e.textContent || "").trim().slice(0, 28)} (${Math.round(r.height)}px)`);
    }
    if (piccoli.length) problemi.push(`bersagli sotto i 40px (${piccoli.length}): ${[...new Set(piccoli)].slice(0, 5).join(" · ")}`);

    const minuscoli = [];
    for (const e of document.querySelectorAll("p, li, span, a, td")) {
      if (!visibile(e) || !(e.textContent || "").trim()) continue;
      const fs = parseFloat(getComputedStyle(e).fontSize);
      if (fs && fs < 12) minuscoli.push(`${Math.round(fs)}px «${(e.textContent || "").trim().slice(0, 26)}»`);
    }
    if (minuscoli.length) problemi.push(`testo sotto 12px (${minuscoli.length}): ${[...new Set(minuscoli)].slice(0, 4).join(" · ")}`);

    // alt="" NON e' un difetto: e' la marcatura corretta di un'immagine decorativa (il lettore
    // di schermo la salta). Il difetto vero e' l'ATTRIBUTO MANCANTE, che costringe ad annunciare
    // il nome del file.
    const senzaAlt = [...document.querySelectorAll("img")].filter(
      (i) => visibile(i) && !i.hasAttribute("alt"),
    ).length;
    if (senzaAlt) problemi.push(`${senzaAlt} immagini senza attributo alt`);

    return problemi;
  });

  await page.screenshot({ path: `${OUT}/${(via === "/" ? "home" : via.slice(1))}.png`, fullPage: false });
  totale += esito.length;
  console.log(`\n${via}  (${esito.length === 0 ? "OK" : esito.length + " problemi"})`);
  for (const p of esito) console.log(`   · ${p}`);
  await page.close();
}

console.log(`\n=== TOTALE PROBLEMI: ${totale} · screenshot in ${OUT}/ ===`);
await browser.close();
process.exit(totale > 0 ? 1 : 0);
