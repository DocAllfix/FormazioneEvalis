// Screenshot dei punti in cui compare il badge EcoVadis, per guardarli invece di fidarsi
// del fatto che il markup ci sia. Gira contro il server locale gia' avviato.
// Uso: node scripts/produzione/_shot-badge.mjs [baseUrl]
import fs from "node:fs";
import { chromium } from "@playwright/test";

const BASE = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const OUT = "produzione/_qa-badge";
fs.mkdirSync(OUT, { recursive: true });

const PUNTI = [
  { nome: "home-perche-evalis", url: "/", ancora: "Un certificato che vale" },
  { nome: "aziende-conformita", url: "/aziende", ancora: "Costruito per contesti regolamentati" },
  { nome: "footer", url: "/", ancora: null, ultimo: true }, // in fondo: e' l'ULTIMO badge della pagina
];

const browser = await chromium.launch();
for (const p of PUNTI) {
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const resp = await page.goto(BASE + p.url, { waitUntil: "networkidle", timeout: 45000 });
  const badges = page.locator('img[src*="ecovadis"]');
  const img = p.ultimo ? badges.last() : badges.first();
  if (p.ancora) {
    await page.getByText(p.ancora, { exact: false }).first().scrollIntoViewIfNeeded().catch(() => {});
  } else {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  }
  await page.waitForTimeout(900);
  const visibile = await img.isVisible().catch(() => false);
  const box = visibile ? await img.boundingBox() : null;
  await page.screenshot({ path: `${OUT}/${p.nome}.png` });
  console.log(
    `${p.nome.padEnd(20)} HTTP ${resp?.status()} · badge ${visibile ? "VISIBILE" : "NON VISIBILE"}` +
      (box ? ` ${Math.round(box.width)}x${Math.round(box.height)}px` : ""),
  );
  await page.close();
}
await browser.close();
console.log(`\nscreenshot in ${OUT}/`);
