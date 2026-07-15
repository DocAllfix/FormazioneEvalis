// GATE DI RICEZIONE SLIDE (FASE 5c) — valida le slide HTML del track design PRIMA
// che entrino nel manifest, riproducendo le condizioni ESATTE del player
// (slide-html.tsx: stage 1660px = gutter 380 + section 1280, altezza adattiva).
//
// Controlli per slide:
//   S1 nome file = <id>.html con ID canonico del corso; nessun ID dei copioni mancante
//   S2 radice <section> presente
//   S3 primo `background:` nell'HTML = colore ESADECIMALE (il player lo usa per tingere
//      il gutter dell'avatar: se non è hex la bolla resta su sfondo sbagliato)
//   S4 nessuna risorsa esterna (immagini/css/js remoti; consentiti solo i font Google
//      già usati dal player) — il player è sandbox e offline-safe
//   S5 nessun <script> (le slide sono statiche; W avviso, non blocco)
//   S6 [Playwright] altezza naturale della section a 1280px: >900px = W overflow
//      (testo piccolo a schermo), >1400px = FAIL; screenshot -> thumbnail
//   S7 titolo dei copioni rintracciabile nel testo della slide (W avviso se assente)
//   S8 font-family solo tra IBM Plex Sans/Mono e Space Grotesk (gli altri non si caricano)
//   S9 nessun quiz FUNZIONANTE nell'HTML (il quiz valutato è server-side; W avviso)
// Output: produzione/_staging/slide-gates/<corso>/report.json + contact-sheet.html
//         (miniature cliccabili per la revisione umana C.4)
//
// Uso: node scripts/produzione/gate-slides.mjs <corso> --dir <cartella con <id>.html>
//      node scripts/produzione/gate-slides.mjs --kit <cartella>   (valida un template kit:
//        solo S2-S6, nomi file liberi — per il gate di approvazione dei 2 template)

import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import { dirs, readJson, slideIds, ID_RE } from "./lib.mjs";

const kitIx = process.argv.indexOf("--kit");
const isKit = kitIx !== -1;
const corso = isKit ? null : process.argv[2];
const dirIx = process.argv.indexOf("--dir");
const slidesDir = isKit ? process.argv[kitIx + 1] : dirIx !== -1 ? process.argv[dirIx + 1] : null;
if (!slidesDir) {
  console.error("Uso: node scripts/produzione/gate-slides.mjs <corso> --dir <dir>  |  --kit <dir>");
  process.exit(2);
}

const H_WARN = 900;
const H_FAIL = 1400;
const FONT_OK = /^(https?:)?\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com)\//;

const outDir = path.join(
  process.env.PRODUZIONE_ROOT || "produzione", "_staging", "slide-gates", isKit ? "_kit" : corso,
);
const thumbsDir = path.join(outDir, "thumbs");
fs.mkdirSync(thumbsDir, { recursive: true });

// --- elenco file da validare + completezza (S1)
const files = fs.readdirSync(slidesDir).filter((f) => f.endsWith(".html")).sort();
if (!files.length) {
  console.error(`Nessun .html in ${slidesDir}`);
  process.exit(1);
}
let titoli = new Map();
const errors = [];
if (!isKit) {
  const d = dirs(corso);
  const copioni = readJson(d.copioni);
  const ids = slideIds(copioni, corso);
  titoli = new Map(copioni.slides.map((s) => [s.id, s.titolo]));
  const presenti = new Set(files.map((f) => f.replace(/\.html$/, "")));
  for (const f of files) {
    const id = f.replace(/\.html$/, "");
    if (!ID_RE.test(id) || !id.startsWith(`${corso}_`)) errors.push(`S1 ${f}: nome file non è un ID canonico del corso`);
  }
  const mancanti = ids.filter((id) => !presenti.has(id));
  if (mancanti.length) errors.push(`S1 completezza: ${mancanti.length}/${ids.length} slide MANCANTI (es. ${mancanti.slice(0, 5).join(", ")})`);
}

// --- wrapper identico al player (slide-html.tsx) per misura + screenshot
function stageHtml(inner, bg) {
  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>html,body{margin:0;padding:0;background:${bg};overflow:hidden}
#stage{width:1660px}#stage>section{margin-left:380px;width:1280px!important}</style></head>
<body><div id="stage">${inner}</div></body></html>`;
}

const report = { corso: isKit ? "(kit)" : corso, slide: {}, generato: new Date().toISOString() };
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1660, height: 1000 } });

let nWarn = 0;
for (const f of files) {
  const id = f.replace(/\.html$/, "");
  const html = fs.readFileSync(path.join(slidesDir, f), "utf8");
  const probs = [];
  const warns = [];

  if (!/<section[\s>]/.test(html)) probs.push("S2: manca la radice <section>");
  const bgMatch = html.match(/background:\s*([^;"']+)/);
  const bg = bgMatch?.[1]?.trim() ?? "";
  if (!/^#[0-9a-fA-F]{3,8}$/.test(bg))
    probs.push(`S3: primo background "${bg || "assente"}" non è un colore hex (il gutter avatar non si tinge)`);

  for (const m of html.matchAll(/(?:src|href)\s*=\s*["'](https?:\/\/[^"']+)["']/g)) {
    if (!FONT_OK.test(m[1])) probs.push(`S4: risorsa esterna non consentita: ${m[1].slice(0, 80)}`);
  }
  if (/<script[\s>]/i.test(html)) warns.push("S5: contiene <script> (slide statiche preferite)");

  // S8: font-family solo tra i 3 caricati dal player nell'iframe (altri non si caricano)
  const FONT_ALLOW = /^(ibm plex sans|ibm plex mono|space grotesk|sans-serif|monospace|serif|inherit|initial|ui-monospace|-apple-system|blinkmacsystemfont|system-ui)$/i;
  for (const m of html.matchAll(/font-family\s*:\s*([^;"'}]+)/gi)) {
    const bad = m[1].split(",").map((s) => s.trim().replace(/^['"]|['"]$/g, "")).filter((fam) => fam && !FONT_ALLOW.test(fam));
    if (bad.length) { warns.push(`S8: font non caricato dal player: "${bad[0]}" (usa IBM Plex Sans/Mono o Space Grotesk)`); break; }
  }
  // S9: niente quiz FUNZIONANTE nell'HTML — il quiz valutato è server-side (compliance)
  if (/data-quiz|data-result|data-correct|correctoption|iscorrect/i.test(html))
    warns.push("S9: sembra un quiz funzionante nell'HTML — il quiz valutato è lato piattaforma, non nelle slide");

  // S6: misura e screenshot nelle condizioni del player
  let height = null;
  try {
    await page.setContent(stageHtml(html, /^#/.test(bg) ? bg : "#F4F3EF"), { waitUntil: "networkidle" });
    height = await page.evaluate(() => {
      const sec = document.querySelector("#stage>section");
      if (!sec) return null;
      sec.style.height = "auto";
      const nat = Math.ceil(sec.scrollHeight);
      // come il player (slide-html.tsx): canvas = max(720, naturale) — e l'elemento
      // resta visibile anche per le slide "a canvas" (figli tutti absolute, nat≈0)
      sec.style.height = Math.max(720, nat + 6) + "px";
      return Math.max(720, nat);
    });
    if (height == null) probs.push("S6: section non misurabile");
    else if (height > H_FAIL) probs.push(`S6: altezza ${height}px > ${H_FAIL}px (contenuto fuori misura)`);
    else if (height > H_WARN) warns.push(`S6: altezza ${height}px > ${H_WARN}px (testo piccolo a schermo)`);
    const sec = page.locator("#stage>section");
    // animations:disabled — le animazioni CSS infinite manderebbero in timeout lo screenshot
    await sec.screenshot({ path: path.join(thumbsDir, `${id}.png`), scale: "css",
      animations: "disabled", timeout: 15000 });
  } catch (e) {
    probs.push(`S6: render fallito (${String(e).slice(0, 120)})`);
  }

  if (!isKit && titoli.has(id)) {
    const norm = (s) => s.toLowerCase().replace(/[^a-zà-ù0-9 ]/gi, " ").replace(/\s+/g, " ").trim();
    const testo = norm(html.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "));
    const paroleTitolo = norm(titoli.get(id)).split(" ").filter((w) => w.length > 3);
    const trovate = paroleTitolo.filter((w) => testo.includes(w)).length;
    if (paroleTitolo.length && trovate / paroleTitolo.length < 0.5)
      warns.push(`S7: titolo copione poco rintracciabile ("${titoli.get(id)}")`);
  }

  report.slide[id] = { esito: probs.length ? "FAIL" : warns.length ? "WARN" : "PASS", height, probs, warns };
  nWarn += warns.length ? 1 : 0;
  if (probs.length) errors.push(`${id}: ${probs.join(" · ")}`);
  process.stdout.write(probs.length ? "F" : warns.length ? "w" : ".");
}
await browser.close();
console.log("");

// --- contact sheet per la revisione umana (C.4)
const cards = Object.entries(report.slide).map(([id, r]) => `
  <figure class="${r.esito}"><a href="thumbs/${id}.png" target="_blank"><img loading="lazy" src="thumbs/${id}.png" alt="${id}"></a>
  <figcaption>${id} · ${r.esito}${r.height ? ` · ${r.height}px` : ""}${r.warns.length ? `<br><small>${r.warns.join("; ")}</small>` : ""}</figcaption></figure>`).join("");
fs.writeFileSync(path.join(outDir, "contact-sheet.html"), `<!doctype html><meta charset="utf-8">
<title>Contact sheet ${report.corso}</title>
<style>body{font-family:system-ui;background:#111;color:#eee;margin:16px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}
figure{margin:0;border:2px solid #333;border-radius:8px;overflow:hidden}
figure.FAIL{border-color:#e11}figure.WARN{border-color:#ea0}
img{width:100%;display:block}figcaption{padding:6px 8px;font-size:12px}</style>
<h1>${report.corso} — ${files.length} slide</h1><div class="grid">${cards}</div>`);

fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 1));
const nFail = Object.values(report.slide).filter((r) => r.esito === "FAIL").length;
console.log(`\n${files.length} slide · PASS ${files.length - nFail - nWarn} · WARN ${nWarn} · FAIL ${nFail}`);
console.log(`report: ${path.join(outDir, "report.json")}\ncontact sheet: ${path.join(outDir, "contact-sheet.html")}`);
if (errors.length) {
  console.error(`\nERRORI BLOCCANTI (${errors.length}):`);
  for (const e of errors.slice(0, 20)) console.error(`  ✗ ${e}`);
}
process.exit(errors.length ? 1 : 0);
