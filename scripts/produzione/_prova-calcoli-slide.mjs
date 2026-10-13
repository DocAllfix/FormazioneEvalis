// Prova in browser delle slide `calcolo` e `simulatore` (build-slide.mjs), nelle condizioni del player:
// la <section> dentro un iframe sandbox="allow-scripts" con lo stesso stage di slide-html.tsx.
//   C1 calcolo: il totale a schermo coincide col totale dichiarato dalla fonte (campo _atteso del JSON)
//   C2 altezza naturale della section entro il limite anti-taglio
//   S1 simulatore: senza toccare nulla mostra i valori dell'esempio
//   S2 cambiando un dato il risultato della riga e il totale si ricalcolano
//   S3 «Ripristina» riporta ai valori dell'esempio
//   S4 l'altezza della slide non cambia mentre si interagisce (il player non deve ridimensionare)
//   S5 la pagina che ospita l'iframe non riceve nulla dallo script della slide oltre alla misura
// Uso: node scripts/produzione/_prova-calcoli-slide.mjs <contenuti.json> <cartella html> [--max 1100]
import { readFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const [jsonPath, dir] = process.argv.slice(2);
const maxIx = process.argv.indexOf("--max");
const MAX = maxIx !== -1 ? Number(process.argv[maxIx + 1]) : 1100;
if (!jsonPath || !dir) { console.error("Uso: _prova-calcoli-slide.mjs <contenuti.json> <cartella html> [--max 1100]"); process.exit(2); }
const slides = JSON.parse(readFileSync(jsonPath, "utf8")).filter((s) => s.layout === "calcolo" || s.layout === "simulatore");

const numDec = (v, d) => v.toLocaleString("it-IT", { maximumFractionDigits: d, useGrouping: "always" });
const numRis = (v) => { const a = Math.abs(v); return numDec(v, a >= 100 ? 0 : a >= 10 ? 1 : a >= 1 ? 2 : 3); };
const FONTS = "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap";
const ospite = (section) => `<!doctype html><html><body style="margin:0"><script>window.__msg=[];addEventListener("message",function(e){window.__msg.push(e.data)});</script>
<iframe id="f" sandbox="allow-scripts" style="width:1660px;height:1200px;border:0" srcdoc="${(`<!doctype html><html><head><meta charset="utf-8"><link href="${FONTS}" rel="stylesheet"><style>html,body{margin:0;padding:0;overflow:hidden}#stage{width:1660px}#stage > section{margin-left:380px;width:1280px!important;box-sizing:border-box!important;overflow:hidden}</style></head><body><div id="stage">${section}</div></body></html>`).replace(/&/g, "&amp;").replace(/"/g, "&quot;")}"></iframe></body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1700, height: 1300 } });
const colpe = [];
let nc = 0, ns = 0, hMax = 0;
for (const s of slides) {
  const full = readFileSync(path.join(dir, `${s.id}.html`), "utf8");
  const section = full.match(/<section\b[\s\S]*<\/section>/i)?.[0];
  if (!section) { colpe.push(`${s.id}: nessuna <section>`); continue; }
  await page.setContent(ospite(section), { waitUntil: "load" });
  const fr = page.frameLocator("#f");
  await fr.locator("section").waitFor();
  await page.waitForTimeout(150);
  const alt = () => fr.locator("section").evaluate((el) => Math.ceil(el.scrollHeight));
  const h = await alt();
  hMax = Math.max(hMax, h);
  if (h > MAX) colpe.push(`${s.id}: altezza ${h}px oltre ${MAX}`);

  if (s.layout === "calcolo") {
    nc++;
    if (typeof s._atteso === "number") {
      const atteso = s.dec != null ? numDec(s._atteso, s.dec) : numRis(s._atteso);
      const testo = await fr.locator("table").innerText();
      // il totale (o l'unico risultato) deve comparire scritto com'è dichiarato
      if (!testo.replace(/\s+/g, " ").includes(atteso)) colpe.push(`${s.id} «${s.titolo}»: a schermo manca il totale dichiarato ${atteso}`);
    }
    continue;
  }
  ns++;
  const tot0 = s.righe.reduce((t, r) => t + r.v * r.ef, 0);
  const leggiTot = () => fr.locator("[data-tot]").innerText();
  if ((await leggiTot()) !== numRis(tot0)) colpe.push(`${s.id}: totale iniziale ${await leggiTot()} ≠ ${numRis(tot0)}`);
  // S2: raddoppia il primo dato non nullo (o metti 1 se sono tutti zero)
  const i = Math.max(0, s.righe.findIndex((r) => r.v > 0));
  const nuovo = s.righe[i].v > 0 ? s.righe[i].v * 2 : 1;
  await fr.locator(`input[data-sim="${i}"]`).fill(String(nuovo));
  const tot1 = tot0 - s.righe[i].v * s.righe[i].ef + nuovo * s.righe[i].ef;
  if ((await leggiTot()) !== numRis(tot1)) colpe.push(`${s.id}: dopo la modifica totale ${await leggiTot()} ≠ ${numRis(tot1)}`);
  if ((await fr.locator(`[data-ris="${i}"]`).innerText()) !== numRis(nuovo * s.righe[i].ef)) colpe.push(`${s.id}: risultato di riga non ricalcolato`);
  // valore non valido → conta zero, nessun NaN a schermo
  await fr.locator(`input[data-sim="${i}"]`).fill("");
  if (/NaN|undefined/.test(await fr.locator("table").innerText())) colpe.push(`${s.id}: NaN a schermo con casella vuota`);
  // un totale enorme: la riga delle tonnellate non deve cambiare l'altezza
  await fr.locator(`input[data-sim="${i}"]`).fill("999999999");
  if ((await alt()) !== h && Math.abs((await alt()) - h) > 2) colpe.push(`${s.id}: l'altezza cambia interagendo (${h} → ${await alt()})`);
  await fr.locator("[data-reset]").click();
  if ((await leggiTot()) !== numRis(tot0)) colpe.push(`${s.id}: Ripristina non riporta al totale iniziale`);
  if ((await alt()) !== h && Math.abs((await alt()) - h) > 2) colpe.push(`${s.id}: altezza diversa dopo il ripristino`);
  const msg = await page.evaluate(() => window.__msg);
  if (msg.length) colpe.push(`${s.id}: la slide ha inviato messaggi alla pagina ospite: ${JSON.stringify(msg).slice(0, 80)}`);
}
await browser.close();
console.log(`calcoli ${nc} · simulatori ${ns} · altezza massima ${hMax}px · difetti ${colpe.length}`);
for (const c of colpe) console.log("  ✗ " + c);
process.exit(colpe.length ? 1 : 0);
