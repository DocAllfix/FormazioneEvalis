// Verifica no-cut del deck impacchettato: a ciascun viewport, ogni slide (dopo fit())
// deve stare INTERA in larghezza dentro la viewport (nessun clip orizzontale).
// Registra anche l'altezza renderizzata max come informazione.
// Uso: node scripts/produzione/_deck-nocut-check.mjs 50001-corso-completo.html
import { chromium } from "playwright";
import { pathToFileURL } from "url";
import path from "path";

const file = process.argv[2];
if (!file) { console.error("passa il path del deck html"); process.exit(1); }
const url = pathToFileURL(path.resolve(file)).href;
const VIEWPORTS = [900, 1200, 1600];

const browser = await chromium.launch();
const problemi = [];
let totalSlides = 0;
let maxH = 0;
for (const w of VIEWPORTS) {
  const page = await browser.newPage({ viewport: { width: w, height: Math.round(w * 0.62) } });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  totalSlides = await page.evaluate(() => document.querySelectorAll(".slide").length);
  for (let idx = 0; idx < totalSlides; idx++) {
    const m = await page.evaluate((n) => {
      show(n); // funzione globale del deck: mostra slide n + fit()
      const st = document.querySelector(".slide.on .stage");
      if (!st) return null;
      const r = st.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), left: Math.round(r.left) };
    }, idx);
    if (!m) { problemi.push(`vw ${w}: slide #${idx} senza .stage`); continue; }
    if (m.h > maxH) maxH = m.h;
    // no-cut orizzontale: lo stage deve stare dentro la viewport (tolleranza 2px)
    if (m.w > w + 2 || m.left < -2) {
      problemi.push(`vw ${w}: slide #${idx} clip orizzontale (w=${m.w}, left=${m.left})`);
    }
  }
  await page.close();
}
await browser.close();
console.log(`slide totali: ${totalSlides} · altezza renderizzata max: ${maxH}px`);
if (problemi.length === 0) console.log("NO-CUT OK: nessun taglio orizzontale ai viewport 900/1200/1600");
else { console.log("PROBLEMI:"); problemi.slice(0, 50).forEach(p => console.log("  - " + p)); console.log("tot:", problemi.length); process.exit(2); }
