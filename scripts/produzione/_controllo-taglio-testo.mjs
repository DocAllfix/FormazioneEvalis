// Controllo anti-taglio "fine" delle slide, complementare a gate-slides.mjs (S6 misura solo
// l'altezza naturale della section e lo sforamento orizzontale della section intera).
// Qui, per OGNI slide e nelle stesse condizioni del player (section larga 1280, font veri):
//   T1 ogni riga di testo (range sui nodi di testo) sta DENTRO il rettangolo della section;
//   T2 nessun elemento che taglia il contenuto (overflow ≠ visible) ha contenuto più grande
//      del proprio box: sarebbe testo nascosto che nessuna misura di altezza vede;
//   T3 nessun SVG esce dalla section.
// Uso: node scripts/produzione/_controllo-taglio-testo.mjs <cartella con *.html> [--max 0]
// Esce con codice 1 se c'è anche un solo difetto.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const dir = process.argv[2];
if (!dir) { console.error("Uso: _controllo-taglio-testo.mjs <cartella html>"); process.exit(2); }
const file = readdirSync(dir).filter((f) => f.endsWith(".html")).sort();
const FONT = "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1660, height: 1400 } });
let difettose = 0;
for (const f of file) {
  const html = readFileSync(path.join(dir, f), "utf8");
  // stessa testa del player: i tre font caricati da Google, nessun altro stile
  await page.setContent(html.replace("<head>", `<head><link rel="stylesheet" href="${FONT}">`), { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const difetti = await page.evaluate(() => {
    const out = [];
    const sec = document.querySelector("section");
    if (!sec) return ["nessuna section"];
    const S = sec.getBoundingClientRect();
    const TOL = 1;
    // T1: ogni riga di ogni nodo di testo dentro la section
    const walker = document.createTreeWalker(sec, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent.trim()) continue;
      const r = document.createRange();
      r.selectNodeContents(n);
      for (const q of r.getClientRects()) {
        if (q.width === 0 && q.height === 0) continue;
        if (q.left < S.left - TOL || q.right > S.right + TOL || q.top < S.top - TOL || q.bottom > S.bottom + TOL) {
          out.push(`T1 testo fuori dalla slide: «${n.textContent.trim().slice(0, 50)}»`);
          break;
        }
      }
      if (out.length > 5) break;
    }
    // T2: contenitori che tagliano il proprio contenuto
    for (const el of sec.querySelectorAll("*")) {
      const cs = getComputedStyle(el);
      const taglia = cs.overflowX !== "visible" || cs.overflowY !== "visible";
      if (!taglia || el.tagName === "svg") continue;
      if (el.scrollWidth > el.clientWidth + TOL || el.scrollHeight > el.clientHeight + TOL)
        out.push(`T2 contenuto nascosto in <${el.tagName.toLowerCase()}> (${el.scrollWidth}×${el.scrollHeight} in ${el.clientWidth}×${el.clientHeight})`);
    }
    // T3: SVG dentro la section
    for (const sv of sec.querySelectorAll("svg")) {
      const q = sv.getBoundingClientRect();
      if (q.left < S.left - TOL || q.right > S.right + TOL) out.push("T3 SVG fuori dalla slide");
    }
    return out;
  });
  if (difetti.length) { difettose++; console.log(`✗ ${f}\n   ${difetti.join("\n   ")}`); }
}
await browser.close();
console.log(`\n${file.length} slide · difettose ${difettose}`);
process.exit(difettose ? 1 : 0);
