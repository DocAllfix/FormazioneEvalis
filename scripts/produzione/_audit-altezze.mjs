// Audit: misura l'altezza naturale reale (font veri, 1280px) di OGNI slide di OGNI corso
// dai manifest. Segnala chi supera il canvas base 720. Un solo browser, font caricati una volta.
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
const FONTS = "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400&family=IBM+Plex+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap";
const corsi = fs.readdirSync("produzione").filter((c) => fs.existsSync(`produzione/${c}/manifest.json`));
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1400, height: 2000 } })).newPage();
await p.setContent(`<!doctype html><link href="${FONTS}" rel=stylesheet><body style="margin:0"><div id=host></div></body>`, { waitUntil: "networkidle" });
await p.evaluate(() => document.fonts.ready);
let grand = { tot: 0, over720: 0, over760: 0, over800: 0 };
const worst = [];
for (const c of corsi) {
  const m = JSON.parse(fs.readFileSync(`produzione/${c}/manifest.json`, "utf8"));
  let tot = 0, o720 = 0, o760 = 0;
  for (const mod of m.modules) for (const l of mod.lessons) for (const s of l.slides) {
    const sec = (s.html || "").match(/<section[\s\S]*<\/section>/);
    if (!sec) continue;
    tot++;
    const nat = await p.evaluate((h) => {
      const host = document.getElementById("host"); host.innerHTML = h;
      const sec = host.querySelector("section");
      sec.querySelectorAll("*").forEach((e) => { e.style.height = "auto"; e.style.minHeight = "0"; });
      sec.style.height = "auto"; sec.style.minHeight = "0";
      const n = Math.ceil(sec.scrollHeight); host.innerHTML = ""; return n;
    }, sec[0]);
    if (nat > 720) { o720++; grand.over720++; }
    if (nat > 760) { o760++; grand.over760++; }
    if (nat > 800) grand.over800++;
    if (nat > 720) worst.push({ c, title: (s.title || "").slice(0, 40), nat });
    grand.tot++;
  }
  console.log(`${c}: ${tot} slide · >720px: ${o720} · >760px: ${o760}`);
}
worst.sort((a, b) => b.nat - a.nat);
console.log(`\nTOTALE: ${grand.tot} slide · sforano 720: ${grand.over720} · >760: ${grand.over760} · >800: ${grand.over800}`);
console.log("TOP 15 più alte:"); worst.slice(0, 15).forEach((w) => console.log(`  ${w.nat}px · ${w.c} · ${w.title}`));
fs.writeFileSync("produzione/_audit-altezze.json", JSON.stringify(worst, null, 1));
await b.close();
