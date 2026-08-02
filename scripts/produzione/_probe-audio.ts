// Prova: nel nostro stack (Chromium headless + hls.js, video MUTED per autoplay) il conteggio
// byte audio decodificati (webkitAudioDecodedByteCount) sale davvero? Se sì, è un segnale
// affidabile di "traccia audio presente e in decodifica" da usare nella passata QA.
import "dotenv/config";
import { and, isNotNull, asc } from "drizzle-orm";
import { chromium } from "@playwright/test";
import { db } from "@/lib/db";
import { slide } from "@/lib/db/schema";

const BASE = "https://evalis-academy.vercel.app";
const TOKEN = process.env.PREVIEW_TOKEN ?? "";
if (!TOKEN) { console.error("PREVIEW_TOKEN mancante"); process.exit(2); }

const clips = await db.select({ id: slide.id }).from(slide).where(and(isNotNull(slide.avatarClipUid))).orderBy(asc(slide.id)).limit(3);
console.log("clip di prova:", clips.map((c) => c.id).join(", "));

const browser = await chromium.launch();
for (const c of clips) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/anteprima/${c.id}?token=${TOKEN}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector("[data-preview-ready]", { timeout: 20000 });
  await page.waitForFunction(() => { const v = document.querySelector("[data-preview-clip]") as HTMLVideoElement | null; return !!v && v.currentTime > 0; }, { timeout: 25000 }).catch(() => {});
  const samples: string[] = [];
  for (let i = 0; i < 4; i++) {
    await page.waitForTimeout(900);
    const m = await page.evaluate(() => {
      const v = document.querySelector("[data-preview-clip]") as (HTMLVideoElement & { webkitAudioDecodedByteCount?: number }) | null;
      return v ? { t: +v.currentTime.toFixed(2), audio: v.webkitAudioDecodedByteCount ?? -1, muted: v.muted, ready: v.readyState } : null;
    });
    samples.push(JSON.stringify(m));
  }
  console.log(`\n${c.id}`);
  for (const s of samples) console.log("  " + s);
  await ctx.close();
}
await browser.close();
process.exit(0);
