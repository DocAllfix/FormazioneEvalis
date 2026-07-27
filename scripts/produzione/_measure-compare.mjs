// Confronto tra i DUE modi di misurare l'altezza di una slide (font veri, canvas 1280):
//  - VECCHIO (quello del player e del populate): durante la misura forza height:auto e
//    min-height:0 su TUTTI i discendenti → se il layout usa altezze/min-height fisse
//    (righe agenda, blocchi bilanciati) la misura viene PIÙ BASSA del rendering reale
//    → il canvas viene ritagliato a quell'altezza sbagliata → slide tagliata dentro.
//  - NUOVO: NON tocca i figli; sblocca solo l'altezza della <section> e legge lo
//    scrollHeight del layout REALE; poi anello di verifica (se dopo aver fissato H c'è
//    ancora overflow, H cresce finché non ce n'è più) → impossibile sotto-misurare.
// Per ogni slide passata stampa: H_vecchio vs H_nuovo. Se differiscono → ecco il bug.
import { chromium } from "@playwright/test";
import fs from "node:fs";

const FONTS =
  "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap";
const files = process.argv.slice(2);
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1800, height: 2200 } })).newPage();
await p.setContent(
  `<!doctype html><link href="${FONTS}" rel=stylesheet><style>
  body{margin:0}#stage{width:1660px}
  #stage>section{margin-left:380px;width:1280px!important;box-sizing:border-box!important;overflow:hidden}
  </style><body><div id="stage"></div></body>`,
  { waitUntil: "networkidle" },
);
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(300);

for (const f of files) {
  const html = fs.readFileSync(f, "utf8").match(/<section[\s\S]*<\/section>/)[0];
  const r = await p.evaluate((h) => {
    const stage = document.getElementById("stage");
    stage.innerHTML = h;
    const sec = stage.querySelector("section");

    // --- metodo VECCHIO: collassa tutti i figli ---
    const saved = [];
    sec.querySelectorAll("*").forEach((el) => {
      saved.push([el, el.style.height, el.style.minHeight]);
      el.style.height = "auto"; el.style.minHeight = "0";
    });
    sec.style.height = "auto"; sec.style.minHeight = "0";
    const natOld = Math.ceil(sec.scrollHeight);
    saved.forEach(([el, hh, mh]) => { el.style.height = hh; el.style.minHeight = mh; });
    sec.style.minHeight = "";

    // --- metodo NUOVO: figli intatti, solo la section ad altezza naturale ---
    sec.style.height = "";
    let natNew = Math.ceil(sec.scrollHeight);
    // anello di verifica: fissa H e controlla che non resti overflow reale
    let H = Math.max(720, natNew + 6);
    for (let i = 0; i < 4; i++) {
      sec.style.height = H + "px";
      void sec.offsetHeight; // reflow
      if (sec.scrollHeight <= H) break;
      H = sec.scrollHeight + 6;
    }
    sec.style.height = "";
    stage.innerHTML = "";
    return { natOld, natNew, Hfinal: H };
  }, html);
  const HOld = Math.max(720, r.natOld + 6);
  const diff = r.Hfinal - HOld;
  console.log(
    `${f.split(/[\\/]/).pop().padEnd(24)} VECCHIO=${HOld}px  NUOVO=${r.Hfinal}px  ` +
      (diff > 4 ? `→ SOTTOMISURATA di ${diff}px = TAGLIO di ${diff}px  ← BUG` : `→ ok (uguali)`),
  );
}
await b.close();
