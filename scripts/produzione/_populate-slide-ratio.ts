// B — Salva nel blocco di OGNI slide il ratio esatto (proporzione), misurato con i font veri,
// così il player parte dalla proporzione corretta dal primo frame (niente transitorio, niente
// spazio vuoto). Additivo e reversibile: aggiunge solo il campo `ratio` al blocco html; il
// codice che non lo legge lo ignora. Idempotente (rilanciabile). Da eseguire AL DEPLOY.
//
// Margine prudenziale: la proporzione è calcolata su (H_reale + MARGINE) → box un filo più alto
// della misura, così eventuali differenze di rendering del browser dell'utente non tagliano mai;
// il postMessage del player affina comunque a runtime.
import "dotenv/config";
import { chromium } from "@playwright/test";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { slide } from "@/lib/db/schema";

const SLIDE_W = 1280, GUTTER = 380, TOTAL_W = SLIDE_W + GUTTER, BASE_H = 720;
const MARGINE = 12; // px di sicurezza sopra l'altezza misurata
const FONTS =
  "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap";

type Block = { type?: string; html?: string; ratio?: number };

const rows = await db.select({ id: slide.id, blocks: slide.blocks }).from(slide);
console.log(`Slide totali: ${rows.length}`);

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1400, height: 2000 } })).newPage();
await page.setContent(`<!doctype html><link href="${FONTS}" rel=stylesheet><body style="margin:0"><div id=host></div></body>`, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);

let updated = 0, skipped = 0;
for (const r of rows) {
  const blocks = (r.blocks ?? []) as Block[];
  const i = blocks.findIndex((b) => b?.type === "html" && b.html);
  if (i < 0) { skipped++; continue; }
  const sec = (blocks[i].html ?? "").match(/<section[\s\S]*<\/section>/);
  if (!sec) { skipped++; continue; }
  // misura NATURALE: figli intatti, stessa semantica della rete di sicurezza nel player
  // (slide-html.tsx): scrollHeight della section così com'è renderizzata coi font veri.
  const nat = await page.evaluate((h) => {
    const host = document.getElementById("host")!; host.innerHTML = h;
    const s = host.querySelector("section")!;
    s.style.height = "auto";
    const n = Math.ceil(s.scrollHeight); host.innerHTML = ""; return n;
  }, sec[0]);
  const H = Math.max(BASE_H, nat + 6) + MARGINE;
  const ratio = Math.round((TOTAL_W / H) * 1000) / 1000;
  if (blocks[i].ratio === ratio) { skipped++; continue; } // idempotente
  const next = blocks.map((b, k) => (k === i ? { ...b, ratio } : b));
  await db.update(slide).set({ blocks: next }).where(eq(slide.id, r.id));
  updated++;
  if (updated % 200 === 0) console.log(`  …${updated} aggiornate`);
}
await browser.close();
console.log(`FATTO. aggiornate=${updated} · invariate/saltate=${skipped}`);
process.exit(0);
