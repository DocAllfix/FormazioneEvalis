// Prova delle slide INTERATTIVE (esercizio, calcolatore) NEL PLAYER VERO (anteprima staff del sito): per ogni
// slide apre /anteprima/<id>, agisce dentro l'iframe della slide con mouse e tastiera reali (la slide è
// rimpicciolita come per l'allievo) e controlla:
//   esercizio  — scrive o sceglie una risposta sbagliata e preme «Controlla» (esito «Da rivedere»), poi
//                «Mostra la soluzione» e «Controlla» (tutte giuste), poi «Ricomincia» (tutto vuoto);
//   calcolatore — scrive un dato nuovo con la tastiera (il risultato cambia) e «Ripristina» (torna al caso);
//   sempre     — il video dell'avatar continua a scorrere mentre si interagisce (nessuna pausa, nessun blocco).
// Uso: npx tsx scripts/produzione/_prova-interattive-player.ts [--prod] <courseId>
import "dotenv/config";
import { chromium, type FrameLocator, type Page } from "@playwright/test";
const prod = process.argv.includes("--prod");
const courseId = process.argv.slice(2).find((a) => !a.startsWith("--"))!;
if (prod) process.env.DATABASE_URL = process.env.PROD_DATABASE_URL;
const BASE = prod ? "https://www.evalisacademy.it" : (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
const { default: postgres } = await import("postgres");
const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });
const righe = await sql`select s.id, s.title, s.blocks from slide s join lesson l on l.id = s.lesson_id join module m on m.id = l.module_id
  where m.course_id = ${courseId} order by m.position, l.position, s.position`;
await sql.end();
const tipo = (b: unknown) => { const j = JSON.stringify(b); return j.includes("data-esercizio") ? "esercizio" : j.includes("data-in=") ? "calcolatore" : null; };
const slides = righe.map((r) => ({ id: String(r.id), tipo: tipo(r.blocks) })).filter((r) => r.tipo);
console.log(`${BASE} · ${slides.length} slide interattive`);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(() => { try { localStorage.setItem("evalis-consenso-cookie", JSON.stringify({ necessari: true, analitici: false, data: Date.now() })); } catch {} });

async function clicca(p: Page, fr: FrameLocator, sel: string) {
  const box = await fr.locator(sel).first().boundingBox();
  if (!box) throw new Error(`${sel} non visibile a schermo`);
  await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

let ok = 0;
for (const s of slides) {
  const p = await ctx.newPage();
  try {
    await p.goto(`${BASE}/anteprima/${s.id}?token=${process.env.PREVIEW_TOKEN}`, { waitUntil: "domcontentloaded", timeout: 45000 });
    const fr = p.frameLocator('iframe[title="Contenuto slide"]');
    await fr.locator(s.tipo === "esercizio" ? "[data-campo]" : "[data-in]").first().waitFor({ state: "attached", timeout: 30000 });
    await p.waitForTimeout(2000);
    const video = p.locator("video").first();
    try { await video.evaluate((v: HTMLVideoElement) => { v.muted = true; return v.play(); }); } catch {}
    const t0 = await video.evaluate((v: HTMLVideoElement) => v.currentTime).catch(() => -1);
    let dettaglio = "";
    if (s.tipo === "esercizio") {
      const n = await fr.locator("[data-campo]").count();
      const primo = fr.locator("[data-campo]").first();
      const ctl = primo.locator("[data-ctl]");
      if ((await ctl.evaluate((e) => e.tagName)) === "SELECT") {
        const giuste: string[] = JSON.parse((await primo.getAttribute("data-giuste")) ?? "[]");
        const opzioni = await ctl.locator("option").evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value).filter(Boolean));
        await clicca(p, fr, '[data-campo] [data-ctl]'); await p.keyboard.press("Escape");
        await ctl.selectOption(opzioni.find((o) => !giuste.includes(o))!);
      } else {
        await clicca(p, fr, '[data-campo] [data-ctl]'); await p.keyboard.type("999,9");
      }
      await clicca(p, fr, '[data-azione="controlla"]');
      const sbagliata = (await primo.locator("[data-esito]").textContent()) ?? "";
      await clicca(p, fr, '[data-azione="soluzione"]'); await clicca(p, fr, '[data-azione="controlla"]');
      const tutte = (await fr.locator("[data-riepilogo]").textContent()) ?? "";
      await clicca(p, fr, '[data-azione="ricomincia"]');
      const vuoto = (await ctl.inputValue()) === "" && (await fr.locator("[data-riepilogo]").textContent()) === "";
      const giusto = sbagliata.startsWith("Da rivedere") && tutte === `Risposte corrette: ${n} su ${n}` && vuoto;
      dettaglio = `${n} campi · sbagliata «${sbagliata.slice(0, 22)}…» · soluzione «${tutte}» · ricomincia ${vuoto ? "ok" : "NO"}`;
      if (!giusto) throw new Error(dettaglio);
    } else {
      const out = fr.locator("[data-out]").first();
      const prima = await out.textContent();
      // 13 cambia il primo risultato di entrambi i calcolatori (7 no: 7 m danno ancora 3 campi, come 8 m)
      await clicca(p, fr, "input[data-in]"); await p.keyboard.press("Control+A"); await p.keyboard.type("13");
      await p.waitForTimeout(300);
      const dopo = await out.textContent();
      await clicca(p, fr, "[data-reset]"); await p.waitForTimeout(300);
      const rip = await out.textContent();
      dettaglio = `risultato ${prima} → ${dopo} → ripristino ${rip}`;
      if (!(prima !== dopo && rip === prima)) throw new Error(dettaglio);
    }
    await p.waitForTimeout(1500);
    const t1 = await video.evaluate((v: HTMLVideoElement) => v.currentTime).catch(() => -1);
    const pausa = await video.evaluate((v: HTMLVideoElement) => v.paused).catch(() => true);
    const scorre = t0 < 0 || (t1 > t0 && !pausa);
    if (scorre) ok++;
    console.log(`${scorre ? "OK " : "KO "} ${s.id} [${s.tipo}] · ${dettaglio} · video ${t0 < 0 ? "assente" : `${t0.toFixed(1)}s → ${t1.toFixed(1)}s${pausa ? " IN PAUSA" : ""}`}`);
  } catch (e) {
    console.log(`KO  ${s.id} [${s.tipo}] · ${(e as Error).message.slice(0, 200)}`);
  }
  await p.close();
}
await browser.close();
console.log(`slide interattive funzionanti nel player: ${ok}/${slides.length}`);
process.exit(ok === slides.length ? 0 : 1);
