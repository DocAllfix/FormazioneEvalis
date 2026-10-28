// Prova in browser delle slide INTERATTIVE `esercizio` e `calcolatore` (build-slide.mjs), nelle condizioni
// del player: la <section> dentro un iframe sandbox="allow-scripts" con lo stesso stage di slide-html.tsx.
// Esercizio, per ogni campo e per ogni bottone:
//   E1 all'avvio campi vuoti ed esiti vuoti
//   E2 «Controlla» a vuoto chiede di rispondere, senza errori
//   E3 ogni opzione di ogni tendina: è «Corretto.» SOLO se è tra le risposte accettate; ogni casella numerica:
//      giusta la soluzione, giusti i bordi della tolleranza, sbagliato appena fuori, sbagliato un testo
//   E4 tutto sbagliato → 0 su N; tutto giusto → N su N
//   E5 «Mostra la soluzione» compila i campi giusti e spiega; «Ricomincia» svuota tutto
// Calcolatore: valori del caso a schermo, ricalcolo su casi scritti A MANO (non con la formula della slide),
// dato vuoto o non valido → «—» e mai NaN, «Ripristina».
// Sempre: l'altezza della slide non cambia mai (il player misura solo all'avvio) e la pagina ospite non
// riceve messaggi dallo script della slide.
// Uso: node scripts/produzione/_prova-interattive.mjs <contenuti.json> <cartella html> [--max 1100]
import { readFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const [jsonPath, dir] = process.argv.slice(2);
const maxIx = process.argv.indexOf("--max");
const MAX = maxIx !== -1 ? Number(process.argv[maxIx + 1]) : 1100;
if (!jsonPath || !dir) { console.error("Uso: _prova-interattive.mjs <contenuti.json> <cartella html> [--max 1100]"); process.exit(2); }
const slides = JSON.parse(readFileSync(jsonPath, "utf8")).filter((s) => s.layout === "esercizio" || s.layout === "calcolatore");

// casi del calcolatore scritti a mano: { dati da impostare, uscite attese }
const CASI = {
  consumi: [
    [{}, { fug: "0,16", fugtot: "7,2", ad: "6", adtot: "270", sacchi: "11" }],
    [{ a: "30", b: "60", c: "9", d: "3" }, { fug: "0,216", fugtot: "9,72", ad: "6", adtot: "270", sacchi: "11" }],
    [{ a: "30", b: "60", c: "9", d: "2", s: "22" }, { fug: "0,144", fugtot: "3,17", ad: "6", adtot: "132", sacchi: "6" }],
    [{ a: "60", b: "60", c: "10", d: "5", s: "36" }, { fug: "0,267", fugtot: "9,6", adtot: "216", sacchi: "9" }],
    [{ s: "30", d: "3" }, { fug: "0,16", fugtot: "4,8", adtot: "180", sacchi: "8" }],
    [{ spatola: "8", doppia: "no" }, { ad: "3,8", adtot: "171", sacchi: "7" }],
    [{ a: "400" }, { fug: "—", fugtot: "—", adtot: "270" }],
    [{ spatola: "6", doppia: "si", s: "25" }, { ad: "4,5", adtot: "112,5", sacchi: "5" }],
    [{ s: "" }, { fugtot: "—", adtot: "—", sacchi: "—" }],
    [{ a: "abc", s: "45" }, { fug: "—", fugtot: "—" }],
  ],
  giunti: [
    [{}, { g1: "2", g2: "3", campi: "12", area: "8" }],
    [{ l1: "6" }, { g1: "1", g2: "3", campi: "8", area: "9" }],
    [{ l1: "9" }, { g1: "2", campi: "12", area: "9" }],
    [{ l1: "7,5" }, { g1: "2", campi: "12", area: "7,5" }],
    [{ l1: "8", l2: "10" }, { g2: "3", campi: "12", area: "6,67" }],
    [{ l2: "13" }, { g2: "4", campi: "15", area: "6,93" }],
    [{ l1: "2", l2: "3" }, { g1: "0", g2: "0", campi: "1", area: "6" }],
    [{ l1: "" }, { g1: "—", campi: "—", area: "—" }],
    [{ l1: "-4" }, { g1: "—", campi: "—" }],
  ],
};

const FONTS = "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap";
const ospite = (section) => `<!doctype html><html><body style="margin:0"><script>window.__msg=[];addEventListener("message",function(e){window.__msg.push(e.data)});</script>
<iframe id="f" sandbox="allow-scripts" style="width:1660px;height:1300px;border:0" srcdoc="${(`<!doctype html><html><head><meta charset="utf-8"><link href="${FONTS}" rel="stylesheet"><style>html,body{margin:0;padding:0;overflow:hidden}#stage{width:1660px}#stage > section{margin-left:380px;width:1280px!important;box-sizing:border-box!important;overflow:hidden}</style></head><body><div id="stage">${section}</div></body></html>`).replace(/&/g, "&amp;").replace(/"/g, "&quot;")}"></iframe></body></html>`;

const fmt = (x) => String(x).replace(".", ",");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1700, height: 1400 } });
const colpe = [];
let prove = 0, hMax = 0;
for (const s of slides) {
  const full = readFileSync(path.join(dir, `${s.id}.html`), "utf8");
  const section = full.match(/<section\b[\s\S]*<\/section>/i)?.[0];
  if (!section) { colpe.push(`${s.id}: nessuna <section>`); continue; }
  await page.setContent(ospite(section), { waitUntil: "load" });
  const fr = page.frameLocator("#f");
  await fr.locator("section").waitFor();
  await page.waitForTimeout(200);
  const alt = () => fr.locator("section").evaluate((el) => Math.ceil(el.scrollHeight));
  const h = await alt();
  hMax = Math.max(hMax, h);
  const ko = (t) => colpe.push(`${s.id}: ${t}`);
  if (h > MAX) ko(`altezza ${h}px oltre ${MAX}`);
  const ferma = async (quando) => { const a = await alt(); if (Math.abs(a - h) > 2) ko(`l'altezza cambia ${quando} (${h} → ${a})`); };
  const nan = async () => { if (/NaN|undefined|null/.test(await fr.locator("section").innerText())) ko("NaN, undefined o null a schermo"); };

  if (s.layout === "esercizio") {
    const campi = fr.locator("[data-campo]");
    const n = await campi.count();
    if (n !== s.campi.length) ko(`campi a schermo ${n} ≠ ${s.campi.length}`);
    const ctl = (i) => campi.nth(i).locator("[data-ctl]");
    const esito = (i) => campi.nth(i).locator("[data-esito]").innerText();
    const btn = (a) => fr.locator(`[data-azione="${a}"]`).click();
    const imposta = async (i, v) => {
      if (s.campi[i].tipo === "scelta") await ctl(i).selectOption(v); else await ctl(i).fill(v);
    };
    // E1
    for (let i = 0; i < n; i++) { if ((await ctl(i).inputValue()) !== "" || (await esito(i)) !== "") ko(`E1 campo ${i + 1} non vuoto all'avvio`); }
    // E2
    await btn("controlla"); prove++;
    for (let i = 0; i < n; i++) { if (!/^(Scegli una risposta|Inserisci un valore)\.$/.test(await esito(i))) ko(`E2 campo ${i + 1}: «${await esito(i)}»`); }
    await ferma("con «Controlla» a vuoto"); await nan();
    // E3: ogni opzione, ogni casella
    for (let i = 0; i < n; i++) {
      const x = s.campi[i];
      const casi = x.tipo === "scelta"
        ? x.opzioni.map((o) => [o, x.giuste.includes(o)])
        : x.min != null
          ? [[fmt(x.min), true], [fmt(x.max), true], [fmt((x.min + x.max) / 2), true], [fmt(x.min - 1), false], [fmt(x.max + 1), false], ["abc", false]]
          : x.intero
            ? [[x.soluzione, true], [fmt(x.atteso + 1), false], [fmt(x.atteso - 1), false], [fmt(x.atteso + 0.5), false], ["abc", false]]
            : x.tollAss != null
              ? [[x.soluzione, true], [fmt(x.atteso + x.tollAss), true], [fmt(x.atteso - x.tollAss), true], [fmt(+(x.atteso + x.tollAss * 1.2).toFixed(4)), false], ["abc", false]]
              : [[x.soluzione, true], [fmt(+(x.atteso * (1 + x.toll)).toFixed(6)), true], [fmt(+(x.atteso * (1 - x.toll)).toFixed(6)), true],
                 [fmt(+(x.atteso * (1 + x.toll * 1.5)).toFixed(6)), false], [fmt(+(x.atteso * 10).toFixed(6)), false], [String(x.atteso).replace(",", "."), true], ["abc", false]];
      for (const [v, atteso] of casi) {
        await imposta(i, v); await btn("controlla"); prove++;
        const e = await esito(i);
        if (atteso && e !== "Corretto.") ko(`E3 campo ${i + 1} «${v}» dovrebbe essere giusto, esito «${e}»`);
        if (!atteso && !e.startsWith("Da rivedere:")) ko(`E3 campo ${i + 1} «${v}» dovrebbe essere sbagliato, esito «${e}»`);
        await ferma(`dopo «${v}» nel campo ${i + 1}`);
      }
    }
    // E4
    for (let i = 0; i < n; i++) {
      const x = s.campi[i];
      await imposta(i, x.tipo === "scelta" ? x.opzioni.find((o) => !x.giuste.includes(o)) : "abc");
    }
    await btn("controlla"); prove++;
    if ((await fr.locator("[data-riepilogo]").innerText()) !== `Risposte corrette: 0 su ${n}`) ko("E4 tutto sbagliato non dà 0 su N");
    await ferma("con tutte le risposte sbagliate"); await nan();
    for (let i = 0; i < n; i++) await imposta(i, s.campi[i].tipo === "scelta" ? s.campi[i].giuste[0] : s.campi[i].soluzione);
    await btn("controlla"); prove++;
    if ((await fr.locator("[data-riepilogo]").innerText()) !== `Risposte corrette: ${n} su ${n}`) ko("E4 tutto giusto non dà N su N");
    // E5
    await btn("ricomincia");
    await btn("soluzione"); prove++;
    for (let i = 0; i < n; i++) {
      const x = s.campi[i];
      if ((await ctl(i).inputValue()) !== (x.tipo === "scelta" ? x.giuste[0] : x.soluzione)) ko(`E5 la soluzione non compila il campo ${i + 1}`);
      if ((await esito(i)) !== x.spiega) ko(`E5 spiegazione del campo ${i + 1} diversa`);
    }
    await btn("controlla");
    if ((await fr.locator("[data-riepilogo]").innerText()) !== `Risposte corrette: ${n} su ${n}`) ko("E5 la soluzione mostrata non risulta tutta giusta");
    await ferma("con la soluzione");
    await btn("ricomincia"); prove++;
    for (let i = 0; i < n; i++) { if ((await ctl(i).inputValue()) !== "" || (await esito(i)) !== "") ko(`E5 «Ricomincia» non svuota il campo ${i + 1}`); }
    if ((await fr.locator("[data-riepilogo]").innerText()) !== "") ko("E5 «Ricomincia» non svuota il riepilogo");
  } else {
    const casi = CASI[s.formula];
    if (!casi) { ko(`nessun caso di prova per la formula ${s.formula}`); continue; }
    const leggi = async (k) => fr.locator(`[data-out="${k}"]`).innerText();
    for (const [dati, attese] of casi) {
      await fr.locator("[data-reset]").click();
      for (const [k, v] of Object.entries(dati)) {
        const el = fr.locator(`[data-in="${k}"]`);
        if ((await el.evaluate((e) => e.tagName)) === "SELECT") await el.selectOption(v); else await el.fill(v);
      }
      prove++;
      for (const [k, v] of Object.entries(attese)) {
        const a = await leggi(k);
        if (a !== v) ko(`caso ${JSON.stringify(dati)}: ${k} = «${a}», atteso «${v}»`);
      }
      await ferma(`con ${JSON.stringify(dati)}`); await nan();
    }
    // numeri enormi: nessuna uscita deve far crescere la slide
    for (const el of await fr.locator("input[data-in]").all()) await el.fill("999999");
    await ferma("con valori enormi"); await nan();
    await fr.locator("[data-reset]").click(); prove++;
    for (const [k, v] of Object.entries(casi[0][1])) { if ((await leggi(k)) !== v) ko(`«Ripristina»: ${k} = «${await leggi(k)}», atteso «${v}»`); }
  }
  const msg = await page.evaluate(() => window.__msg);
  if (msg.length) ko(`la slide ha inviato messaggi alla pagina ospite: ${JSON.stringify(msg).slice(0, 80)}`);
}
await browser.close();
console.log(`slide interattive ${slides.length} · prove ${prove} · altezza massima ${hMax}px · difetti ${colpe.length}`);
for (const c of colpe) console.log("  ✗ " + c);
process.exit(colpe.length ? 1 : 0);
