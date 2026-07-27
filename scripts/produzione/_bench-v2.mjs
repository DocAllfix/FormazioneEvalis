// BANCO DI PROVA del modello v2 (canvas fisso + zoom del genitore + rete di sicurezza).
// Replica ESATTAMENTE slide-step v2 e bombarda con scenari ostili. PASS numerico:
//   contenuto (sec.scrollHeight) ≤ canvas (iframe H)  → niente taglio interno
//   canvas*scale ≤ box (per costruzione)              → canvas intero nel box
//   box ≤ area (fit-to-screen min())                  → box intero nello schermo
// Scenari: normal | nofonts (Google Fonts bloccati) | wrongratio (DB errato) | noscript (script interno morto)
import { chromium } from "@playwright/test";
import fs from "node:fs";

const SLIDE_W = 1280, GUTTER = 380, TOTAL_W = 1660, BASE_H = 720, MARG = 12;
const FONTS = "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap";

function srcDocOf(slideHtml, bg, withScript) {
  const script = withScript
    ? `<script>(function(){var TOTAL=${TOTAL_W},BASE=${BASE_H},MARG=${MARG};var sec=document.querySelector('#stage > section');var last=0;function report(){if(!sec)return;var nat=Math.ceil(sec.scrollHeight);var H=Math.max(BASE,nat+6)+MARG;if(Math.abs(H-last)<4)return;last=H;parent.postMessage({__slideRatio:true,ratio:TOTAL/H},'*');}window.addEventListener('resize',report);if(document.fonts&&document.fonts.ready)document.fonts.ready.then(report);setTimeout(report,100);setTimeout(report,500);setTimeout(report,1500);setTimeout(report,3000);report();})();</script>`
    : "";
  return `<!doctype html><html><head><meta charset="utf-8"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="${FONTS}" rel="stylesheet"><style>html,body{margin:0;padding:0;background:${bg};overflow:hidden;}#stage{width:${TOTAL_W}px;}#stage > section{margin-left:${GUTTER}px;width:${SLIDE_W}px!important;box-sizing:border-box!important;overflow:hidden;}</style></head><body><div id="stage">${slideHtml}</div>${script}</body></html>`;
}

const [file, scenario, areaW, areaH, storedRatioArg, shot] = process.argv.slice(2);
const slideHtml = fs.readFileSync(file, "utf8").match(/<section[\s\S]*<\/section>/)[0];
const bg = slideHtml.match(/background:\s*(#[0-9a-fA-F]{3,8})/)?.[1] ?? "#F4F3EF";
const AW = Number(areaW), AH = Number(areaH);
const storedRatio = Number(storedRatioArg);
const withScript = scenario !== "noscript";

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: AW + 40, height: AH + 40 } });
const p = await ctx.newPage();
if (scenario === "nofonts") await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());

const parentHtml = `<!doctype html><body style="margin:0;background:#1a1a1a">
<div id="area" style="width:${AW}px;height:${AH}px;display:flex;align-items:center;justify-content:center;padding:4px 8px;box-sizing:border-box">
  <div id="box" style="position:relative"><div id="wrap" style="position:absolute;inset:0;overflow:hidden;border-radius:16px;border:1px solid #555;background:${bg}"></div></div>
</div>
<script>
  var TOTAL=${TOTAL_W}, BASE=${BASE_H};
  var ratio=${storedRatio};
  var area=document.getElementById('area'), box=document.getElementById('box'), wrap=document.getElementById('wrap');
  var iframe=document.createElement('iframe');
  iframe.style.cssText='border:0;transform-origin:top left;position:absolute;left:0;top:0;background:${bg}';
  wrap.appendChild(iframe);
  function layout(){
    var aw=area.clientWidth-16, ah=area.clientHeight-8;
    var boxW=Math.floor(Math.min(aw, ah*ratio));
    box.style.width=boxW+'px'; box.style.aspectRatio=String(ratio);
    var H=Math.max(BASE, Math.round(TOTAL/ratio));
    iframe.style.width=TOTAL+'px'; iframe.style.height=H+'px';
    iframe.style.transform='scale('+(boxW/TOTAL)+')';
    window.__state={ratio:ratio, boxW:boxW, boxH:Math.round(boxW/ratio), canvasH:H, scale:boxW/TOTAL};
  }
  window.addEventListener('message',function(e){ if(e.data&&e.data.__slideRatio){ var r=e.data.ratio; if(r>0&&Math.abs(r-ratio)>0.005){ ratio=r; layout(); } } });
  window.addEventListener('resize',layout);
  layout();
</script></body>`;
await p.setContent(parentHtml, { waitUntil: "domcontentloaded" });
await p.evaluate((sd) => { document.querySelector("iframe").srcdoc = sd; }, srcDocOf(slideHtml, bg, withScript));
await p.waitForTimeout(scenario === "nofonts" ? 4500 : 3800);

const res = await p.evaluate(() => {
  const st = window.__state;
  const f = document.querySelector("iframe");
  const doc = f.contentDocument;
  const sec = doc && doc.querySelector("section");
  const contentH = sec ? Math.ceil(sec.scrollHeight) : -1;
  const area = document.getElementById("area").getBoundingClientRect();
  const box = document.getElementById("box").getBoundingClientRect();
  return {
    ...st, contentH,
    boxInArea: box.width <= area.width + 1 && box.height <= area.height + 1,
    contentInCanvas: contentH > 0 && contentH <= st.canvasH + 1,
  };
});
const pass = res.boxInArea && res.contentInCanvas;
console.log(
  `${file.split(/[\\/]/).pop().padEnd(22)} ${scenario.padEnd(10)} area=${AW}x${AH} ratio=${res.ratio.toFixed(3)} canvas=${res.canvasH} contenuto=${res.contentH} box=${res.boxW}x${res.boxH} → ${pass ? "PASS" : "FAIL (contenutoInCanvas=" + res.contentInCanvas + " boxInArea=" + res.boxInArea + ")"}`,
);
if (shot) await p.screenshot({ path: shot });
await b.close();
process.exit(pass ? 0 : 1);
