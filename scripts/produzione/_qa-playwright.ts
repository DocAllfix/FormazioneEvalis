// C.3 (QA pre-live): passata Playwright contro PRODUZIONE. Per OGNI slide dei corsi reali:
// apre /anteprima/<slideId>?token=<PREVIEW_TOKEN>, verifica che la pagina carichi, che il video
// (se la slide ha una clip) parta davvero (currentTime>0), e cattura uno screenshot. Poi assembla
// un CONTACT SHEET HTML per corso (griglia di miniature, i FAIL evidenziati). Non tocca nulla:
// solo legge la lista slide dal DB e naviga la produzione. Pool continuo di N pagine.
//
// Uso: node/tsx scripts/produzione/_qa-playwright.ts [concorrenza=6] [--course <corso>]
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { chromium, type Browser } from "@playwright/test";
import { eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { course, module as moduleT, lesson, slide } from "@/lib/db/schema";

const BASE = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
const TOKEN = process.env.PREVIEW_TOKEN ?? "";
if (!BASE || !TOKEN) { console.error("Servono NEXT_PUBLIC_APP_URL e PREVIEW_TOKEN in .env"); process.exit(2); }
const concIx = process.argv.indexOf("--course");
const onlyCourse = concIx !== -1 ? process.argv[concIx + 1] : null;
const CONC = Number(process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : 6);
const OUT = "produzione/_qa-playwright";

const COURSES: Record<string, string> = {
  "19011": "79d362cc-487d-42c1-9ce7-ca868fe6e909", "9001": "7f149a45-a5d2-4226-a07c-17434c493fa8",
  "45001": "b1578011-3b31-4133-a14f-9cee63e5f100", "27001": "9d167d30-6aa6-4a81-b7e8-ad23f6bcfeb6",
  "14001": "056b845a-629a-4dec-8a3b-86d41b63127f", "22000": "d2503a83-e2ac-4a3c-8888-c9576f09eb1f",
  "37001": "21a0cc1e-6b1a-4606-8ed7-62db5ceb2cb7", "42001": "e09dd111-b589-4bc1-9a6e-950efca42797",
  "50001": "0823b1c0-008c-43db-aea0-0c6c31fb194c", "39001": "8b7b5c4f-f9a8-4731-b71d-e7a8627ae5da",
  agg14001: "c7cd558a-5e53-471b-8cf1-aa81520b6d00",
  fadai01: "22649068-a9cc-4d05-8494-5e181a803b3e",
  fadai02: "ea0b7664-bfe8-4b90-99b7-863c7c627b4b",
  fadesg02: "b3568ab6-b6da-4024-bd50-58618b45720b",
  fadeen02: "7f7ea6ce-328b-45c8-a962-81c5c57dd05c",
  fadpdr125: "ebd7649c-a40f-4ead-9db1-9ebd87fa0032",
  fadpas24000: "e0438660-45a2-4a07-8849-5f09ac54930b",
};

async function slidesOf(courseId: string) {
  const mods = await db.select().from(moduleT).where(eq(moduleT.courseId, courseId)).orderBy(asc(moduleT.position));
  const out: { id: string; title: string; hasClip: boolean; clipUid: string | null }[] = [];
  for (const m of mods) {
    const lessons = await db.select().from(lesson).where(eq(lesson.moduleId, m.id)).orderBy(asc(lesson.position));
    for (const l of lessons) {
      const ss = await db.select().from(slide).where(eq(slide.lessonId, l.id)).orderBy(asc(slide.position));
      for (const s of ss) out.push({ id: s.id, title: s.title, hasClip: !!s.avatarClipUid, clipUid: s.avatarClipUid });
    }
  }
  return out;
}

async function checkSlide(browser: Browser, s: { id: string; hasClip: boolean }, file: string) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  // consenso cookie già dato (stesso valore dei test e2e): senza, il banner copriva il fondo di
  // ogni slide nei fotogrammi del collaudo
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem("evalis-consenso-cookie",
        JSON.stringify({ necessari: true, statistiche: false, quando: new Date().toISOString(), versione: 2 }));
    } catch { /* storage non disponibile */ }
  });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 120)); });
  try {
    const resp = await page.goto(`${BASE}/anteprima/${s.id}?token=${TOKEN}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    if (!resp || resp.status() >= 400) return { ok: false, reason: `HTTP ${resp?.status()}` };
    await page.waitForSelector("[data-preview-ready]", { timeout: 20000 });
    if (s.hasClip) {
      // 1) deve PARTIRE davvero (currentTime avanza)
      const started = await page.waitForFunction(
        () => { const v = document.querySelector("[data-preview-clip]") as HTMLVideoElement | null; return !!v && v.currentTime > 0; },
        { timeout: 25000 },
      ).then(() => true).catch(() => false);
      if (!started) return { ok: false, reason: "clip non parte (currentTime=0)" };
      // 2) deve REGGERE la riproduzione (~2.4s o fino a fine) senza stallare subito
      const played = await page.waitForFunction(
        () => { const v = document.querySelector("[data-preview-clip]") as HTMLVideoElement | null; return !!v && (v.currentTime >= 2.4 || v.ended); },
        { timeout: 15000 },
      ).then(() => true).catch(() => false);
      if (!played) return { ok: false, reason: "clip stalla dopo l'avvio (<2.4s)" };
      // 3) deve avere AUDIO in decodifica: webkitAudioDecodedByteCount sale anche se muted
      //    (prova _probe-audio.ts: 19k→31k→48k su clip sane). <=0 ⇒ traccia audio muta/assente.
      const audioBytes = await page.evaluate(() => {
        const v = document.querySelector("[data-preview-clip]") as (HTMLVideoElement & { webkitAudioDecodedByteCount?: number }) | null;
        return v ? (v.webkitAudioDecodedByteCount ?? -1) : -1;
      });
      if (audioBytes <= 0) return { ok: false, reason: `audio assente (decoded=${audioBytes})` };
      // 4) durata valida + 3 fotogrammi (inizio 10% / metà 50% / fine 90%): l'avatar deve RENDERizzare
      //    per tutta la clip, non solo nei primi 2,4s → becca clip che si oscurano/congelano a metà o
      //    si troncano sul finale. Il frame 50% (NNN.png) va nel contact sheet; _ini/_fin per lo spot-check.
      const dur = await page.evaluate(() => { const v = document.querySelector("[data-preview-clip]") as HTMLVideoElement | null; return v ? v.duration : NaN; });
      if (!Number.isFinite(dur) || dur <= 0) return { ok: false, reason: `durata clip non valida (${dur})` };
      for (const [frac, suf] of [[0.1, "ini"], [0.5, ""], [0.9, "fin"]] as const) {
        await page.evaluate((f) => { const v = document.querySelector("[data-preview-clip]") as HTMLVideoElement | null; if (v && Number.isFinite(v.duration)) { v.pause(); v.currentTime = Math.max(0.05, v.duration * f); } }, frac);
        await page.waitForFunction((f) => { const v = document.querySelector("[data-preview-clip]") as HTMLVideoElement | null; return !!v && !v.seeking && v.readyState >= 2 && Math.abs(v.currentTime - v.duration * f) < 0.6; }, frac, { timeout: 8000 }).catch(() => {});
        await page.waitForTimeout(120);
        await page.screenshot({ path: suf ? file.replace(/\.png$/, `_${suf}.png`) : file });
      }
      return { ok: true, reason: errors.length ? `console: ${errors[0]}` : "" };
    }
    await page.waitForTimeout(200); // slide statica: un solo fotogramma
    await page.screenshot({ path: file });
    return { ok: true, reason: errors.length ? `console: ${errors[0]}` : "" };
  } catch (e) {
    return { ok: false, reason: (e as Error).message.slice(0, 100) };
  } finally {
    await ctx.close();
  }
}

const browser = await chromium.launch();
const targets = onlyCourse ? [onlyCourse] : Object.keys(COURSES);
const globalFails: string[] = [];

for (const corso of targets) {
  // gli UUID qui sopra valgono per un solo database: se il corso non c'è (corso nuovo, oppure
  // stiamo girando sull'altro database) lo si risolve dallo slug, che invece è stabile.
  let courseId = COURSES[corso];
  if (!courseId) {
    const slug = process.env[`SLUG_${corso}`];
    const trovato = slug ? await db.select({ id: course.id }).from(course).where(eq(course.slug, slug)) : [];
    courseId = trovato[0]?.id ?? "";
  }
  if (!courseId) { console.log(`skip ${corso} (courseId sconosciuto: imposta SLUG_${corso} in .env)`); continue; }
  const dir = path.join(OUT, corso);
  fs.mkdirSync(dir, { recursive: true });
  const slides = await slidesOf(courseId);
  console.log(`\n=== ${corso}: ${slides.length} slide ===`);
  const results: { i: number; id: string; ok: boolean; reason: string; file: string; hasClip: boolean; clipUid: string | null; titolo: string }[] = [];
  let idx = 0;
  async function worker() {
    while (idx < slides.length) {
      const i = idx++;
      const s = slides[i];
      const file = path.join(dir, `${String(i).padStart(3, "0")}.png`);
      const r = await checkSlide(browser, s, file);
      results.push({ i, id: s.id, ok: r.ok, reason: r.reason, file: `${corso}/${String(i).padStart(3, "0")}.png`, hasClip: s.hasClip, clipUid: s.clipUid, titolo: s.title });
      if (!r.ok) { globalFails.push(`${corso}#${i} ${s.id}: ${r.reason}`); process.stdout.write("X"); }
      else process.stdout.write(".");
    }
  }
  await Promise.all(Array.from({ length: CONC }, worker));
  results.sort((a, b) => a.i - b.i);
  const fails = results.filter((r) => !r.ok);
  console.log(`\n${corso}: OK ${results.length - fails.length}/${results.length}${fails.length ? ` · FAIL ${fails.length}` : ""}`);

  // contact sheet
  const cells = results.map((r) =>
    `<figure class="${r.ok ? "" : "fail"}"><img loading="lazy" src="${r.file}"><figcaption>${r.i} ${r.hasClip ? "" : "[statica]"} ${r.ok ? "" : "✗ " + r.reason}</figcaption></figure>`,
  ).join("");
  fs.writeFileSync(path.join(OUT, `${corso}.html`),
    `<!doctype html><meta charset=utf-8><title>QA ${corso}</title><style>body{background:#111;color:#eee;font:13px sans-serif}` +
    `.grid{display:grid;grid-template-columns:repeat(auto-fill,300px);gap:10px;padding:12px}figure{margin:0}img{width:300px;border:2px solid #333}` +
    `figcaption{font-size:11px;color:#aaa}.fail img{border-color:#e11}.fail figcaption{color:#f66}</style>` +
    `<h2>QA ${corso} — ${results.length} slide, FAIL ${fails.length}</h2><div class=grid>${cells}</div>`);
  console.log(`contact sheet -> ${OUT}/${corso}.html`);

  // esito per slide, in una forma che il report finale sa riagganciare agli ID canonici:
  // in banca dati la slide ha un UUID, il ponte è la clip (o, per le statiche, il titolo).
  const perUid: Record<string, string> = {};
  const perTitolo: Record<string, string> = {};
  for (const r of results) {
    const esito = r.ok ? "PASS" : `FAIL: ${r.reason}`;
    if (r.clipUid) perUid[r.clipUid] = esito;
    perTitolo[r.titolo.trim().toLowerCase()] = esito;
  }
  fs.writeFileSync(path.join(OUT, `${corso}.json`), JSON.stringify({ perUid, perTitolo }, null, 1), "utf8");
}

await browser.close();
console.log(`\n=== FINE. FAIL totali: ${globalFails.length} ===`);
for (const f of globalFails.slice(0, 50)) console.log("  ✗ " + f);
fs.writeFileSync(path.join(OUT, "_fails.txt"), globalFails.join("\n") + "\n");
process.exit(0);
