// VERIFICA TOTALE: per OGNI slide nel DB, l'altezza naturale reale (font veri, misura
// come la rete di sicurezza del player) deve stare nel canvas derivato dal ratio salvato:
//   H_naturale + 6 ≤ TOTAL_W / ratio   →  contenuto ≤ canvas  →  mai tagliata.
import "dotenv/config";
import { chromium } from "@playwright/test";
import { db } from "@/lib/db";
import { slide } from "@/lib/db/schema";

const TOTAL_W = 1660;
const FONTS = "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap";
type Block = { type?: string; html?: string; ratio?: number };

const rows = await db.select({ id: slide.id, title: slide.title, blocks: slide.blocks }).from(slide);
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1800, height: 2400 } })).newPage();
await page.setContent(`<!doctype html><link href="${FONTS}" rel=stylesheet><style>body{margin:0}#h{width:${TOTAL_W}px}#h>section{margin-left:380px;width:1280px!important;box-sizing:border-box!important;overflow:hidden}</style><body><div id="h"></div></body>`, { waitUntil: "networkidle" });
// I font DEVONO essere realmente applicati prima di misurare: `document.fonts.ready` da solo
// mente (a documento vuoto nessuna faccia e' richiesta, quindi risolve subito) e si finisce per
// misurare col carattere di RIPIEGO, che e' piu' largo e gonfia l'altezza. Verificato il
// 03/08/2026: stessa slide 758px col ripiego, 732px coi font veri. Il player usa quelli veri.
await page.evaluate(async () => {
  await Promise.all([
    document.fonts.load('700 48px "Space Grotesk"'),
    document.fonts.load('600 32px "Space Grotesk"'),
    document.fonts.load('400 18px "IBM Plex Sans"'),
    document.fonts.load('600 18px "IBM Plex Sans"'),
    document.fonts.load('700 18px "IBM Plex Sans"'),
    document.fonts.load('400 13px "IBM Plex Mono"'),
    document.fonts.load('500 13px "IBM Plex Mono"'),
  ]);
  await document.fonts.ready;
});
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(300);

let ok = 0, senzaRatio = 0, fail = 0, noHtml = 0, maxH = 0;
const failures: string[] = [];
for (const r of rows) {
  const b = ((r.blocks ?? []) as Block[]).find((x) => x?.type === "html" && x.html);
  const sec = b?.html?.match(/<section[\s\S]*<\/section>/);
  if (!sec) { noHtml++; continue; }
  if (!b?.ratio || b.ratio <= 0) { senzaRatio++; failures.push(`SENZA-RATIO ${r.id} ${r.title}`); continue; }
  const nat = await page.evaluate((h) => {
    const host = document.getElementById("h")!; host.innerHTML = h;
    const s = host.querySelector("section")! as HTMLElement;
    s.style.height = "auto";
    const n = Math.ceil(s.scrollHeight); host.innerHTML = ""; return n;
  }, sec[0]);
  if (nat > maxH) maxH = nat;
  const canvasH = TOTAL_W / b.ratio;
  if (nat + 6 <= canvasH + 0.5) ok++;
  else { fail++; failures.push(`TAGLIEREBBE ${r.id} nat=${nat} canvas=${canvasH.toFixed(0)} ${r.title}`); }
}
await browser.close();
console.log(`VERIFICA TOTALE: ${rows.length} slide · OK=${ok} · FAIL=${fail} · senza-ratio=${senzaRatio} · senza-html(quiz/etc)=${noHtml}`);
console.log(`altezza massima reale: ${maxH}px (limite SAFE: 1200px)`);
failures.slice(0, 20).forEach((f) => console.log("  " + f));
process.exit(fail > 0 || senzaRatio > 0 ? 1 : 0);
