// Scatti e controlli visivi delle pagine del blog, desktop e telefono.
//
//   npx next start -p 3210
//   node scripts/produzione/_scatti-blog.mjs <cartella-di-uscita>
//
// Controlla: scorrimento orizzontale (il difetto piu comune su telefono), immagini che non
// hanno caricato, risposte >=400 e errori JavaScript. Scorre la pagina PRIMA di scattare:
// ScrollReveal mostra al passaggio nel viewport, e senza scorrere meta pagina resta a
// opacita zero — lo scatto sembrerebbe vuoto per un difetto della misura, non della pagina.
import { chromium, devices } from "playwright";

const BASE = process.argv[3] ?? "http://localhost:3210";
const OUT = process.argv[2];
const pagine = [
  ["elenco", "/blog"],
  ["articolo", "/blog/guida-esame-iso-9001"],
  ["autore", "/blog/autore/bruno-santini"],
];

const b = await chromium.launch();
for (const [nome, vista] of [["desktop", { viewport: { width: 1440, height: 1000 } }], ["mobile", devices["iPhone 13"]]]) {
  const ctx = await b.newContext(vista);
  const p = await ctx.newPage();
  const rotte = [];
  p.on("response", (r) => { if (r.status() >= 400) rotte.push(`${r.status()} ${r.url()}`); });
  const errori = [];
  p.on("pageerror", (e) => errori.push(String(e)));

  for (const [etichetta, percorso] of pagine) {
    await p.goto(BASE + percorso, { waitUntil: "domcontentloaded", timeout: 60000 });
    // ScrollReveal mostra al passaggio nel viewport: senza scorrere, meta' pagina resta a
    // opacita' zero e lo scatto sembra vuoto. E' un artefatto della misura, non un difetto.
    await p.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 400) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 60));
      }
      window.scrollTo(0, 0);
    });
    await p.waitForTimeout(3000);
    await p.screenshot({ path: `${OUT}/${etichetta}-${nome}.png`, fullPage: true });
    // scorrimento orizzontale: il difetto piu' comune su telefono
    const largo = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    // immagini che non hanno caricato davvero
    const rotteImg = await p.evaluate(() =>
      [...document.querySelectorAll("img")].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.currentSrc || i.src));
    console.log(`${nome.padEnd(8)} ${etichetta.padEnd(9)} scroll-orizzontale=${largo ? "SI (male)" : "no"} immagini-rotte=${rotteImg.length}${rotteImg.length ? " → " + rotteImg.join(", ") : ""}`);
  }
  if (rotte.length) console.log(`  ${nome}: risposte >=400 → ${[...new Set(rotte)].join("; ")}`);
  if (errori.length) console.log(`  ${nome}: errori JS → ${errori.join("; ")}`);
  await ctx.close();
}
await b.close();
