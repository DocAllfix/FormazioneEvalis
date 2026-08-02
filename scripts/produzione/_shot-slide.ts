// Screenshot di una slide in produzione, cercata per CHIAVE (es. fadeen02_m08_s050).
// Serve a guardare con gli occhi il risultato di una riparazione, non solo i log.
import "dotenv/config";
import { chromium } from "@playwright/test";
import { eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { module as moduleT, lesson, slide } from "@/lib/db/schema";

const [courseId, chiave, out] = process.argv.slice(2);
const BASE = (process.env.QA_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
const TOKEN = process.env.PREVIEW_TOKEN ?? "";

let trovata: string | null = null;
const mods = await db.select().from(moduleT).where(eq(moduleT.courseId, courseId)).orderBy(asc(moduleT.position));
for (const m of mods) {
  const ls = await db.select().from(lesson).where(eq(lesson.moduleId, m.id)).orderBy(asc(lesson.position));
  for (const l of ls) {
    const ss = await db.select().from(slide).where(eq(slide.lessonId, l.id)).orderBy(asc(slide.position));
    for (const s of ss) {
      const html = ((s.blocks ?? []) as { type?: string; html?: string }[]).find((b) => b.type === "html")?.html ?? "";
      if (html.includes(chiave)) { trovata = s.id; break; }
    }
    if (trovata) break;
  }
  if (trovata) break;
}
if (!trovata) { console.error(`chiave ${chiave} non trovata nel corso`); process.exit(1); }

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const resp = await page.goto(`${BASE}/anteprima/${trovata}?token=${TOKEN}`, { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForSelector("[data-preview-ready]", { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(1500);
await page.screenshot({ path: out });
console.log(`${chiave} → slide ${trovata} · HTTP ${resp?.status()} · screenshot ${out}`);
await browser.close();
process.exit(0);
