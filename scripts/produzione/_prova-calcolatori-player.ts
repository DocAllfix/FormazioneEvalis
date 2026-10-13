// Prova dei calcolatori interattivi NEL PLAYER VERO (anteprima staff del sito): per ogni slide con calcolatore
// apre /anteprima/<id>, trova le caselle dentro l'iframe della slide, clicca e scrive con mouse e tastiera
// reali (la slide è rimpicciolita come per l'allievo), e controlla che il totale si ricalcoli, che
// «Ripristina» torni all'esempio e che il video dell'avatar NON si fermi mentre si interagisce.
// Uso: npx tsx scripts/produzione/_prova-calcolatori-player.ts [--prod] <courseId>
import "dotenv/config";
import { chromium } from "@playwright/test";
const prod = process.argv.includes("--prod");
const courseId = process.argv.slice(2).find((a) => !a.startsWith("--"))!;
if (prod) process.env.DATABASE_URL = process.env.PROD_DATABASE_URL;
const BASE = prod ? "https://www.evalisacademy.it" : (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
const { default: postgres } = await import("postgres");
const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });
const righe = await sql`select s.id, s.title, s.blocks from slide s join lesson l on l.id = s.lesson_id join module m on m.id = l.module_id
  where m.course_id = ${courseId} order by m.position, l.position, s.position`;
await sql.end();
const sim = righe.filter((r) => JSON.stringify(r.blocks).includes("data-sim="));
console.log(`${BASE} · ${sim.length} slide con calcolatore`);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(() => { try { localStorage.setItem("evalis-consenso-cookie", JSON.stringify({ necessari: true, analitici: false, data: Date.now() })); } catch {} });
let ok = 0;
for (const s of sim) {
  const p = await ctx.newPage();
  try {
    await p.goto(`${BASE}/anteprima/${s.id}?token=${process.env.PREVIEW_TOKEN}`, { waitUntil: "domcontentloaded", timeout: 45000 });
    const fr = p.frameLocator('iframe[title="Contenuto slide"]');
    await fr.locator("[data-tot]").waitFor({ state: "attached", timeout: 30000 });
    await p.waitForTimeout(2500);
    const video = p.locator("video").first();
    const avvia = async () => { try { await video.evaluate((v: HTMLVideoElement) => { v.muted = true; return v.play(); }); } catch {} };
    await avvia();
    const t0 = await video.evaluate((v: HTMLVideoElement) => v.currentTime).catch(() => -1);
    const prima = await fr.locator("[data-tot]").textContent();
    const casella = fr.locator('input[data-sim="0"]');
    const box = await casella.boundingBox();
    if (!box) throw new Error("casella non visibile a schermo");
    await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await p.keyboard.press("Control+A"); await p.keyboard.type("777");
    await p.waitForTimeout(400);
    const dopo = await fr.locator("[data-tot]").textContent();
    await fr.locator("[data-reset]").click();
    await p.waitForTimeout(300);
    const ripristino = await fr.locator("[data-tot]").textContent();
    await p.waitForTimeout(1500);
    const t1 = await video.evaluate((v: HTMLVideoElement) => v.currentTime).catch(() => -1);
    const pausa = await video.evaluate((v: HTMLVideoElement) => v.paused).catch(() => true);
    const esito = prima !== dopo && ripristino === prima && (t0 < 0 || t1 > t0) && !pausa;
    if (esito) ok++;
    console.log(`${esito ? "OK " : "KO "} ${s.id} · casella ${Math.round(box.width)}×${Math.round(box.height)}px · totale ${prima} → ${dopo} → ripristino ${ripristino} · video ${t0 < 0 ? "assente" : `${t0.toFixed(1)}s → ${t1.toFixed(1)}s${pausa ? " IN PAUSA" : ""}`}`);
  } catch (e) {
    console.log(`KO  ${s.id} · ${(e as Error).message.slice(0, 160)}`);
  }
  await p.close();
}
await browser.close();
console.log(`calcolatori funzionanti nel player: ${ok}/${sim.length}`);
process.exit(ok === sim.length ? 0 : 1);
