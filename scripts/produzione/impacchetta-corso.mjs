// IMPACCHETTA CORSO — combina le slide singole (<id>.html) di un corso in UN solo HTML
// autonomo, navigabile con le frecce, per mandarlo al CLIENTE in valutazione.
// NON è il formato del sistema (quello usa i file singoli): è solo un deck di revisione.
// Riproduce la composizione del player (gutter 380 + bolla RELATORE a sinistra + slide 1280)
// e, se i copioni ci sono, mostra sotto la NARRAZIONE (ciò che dirà l'avatar).
//
// Uso: node scripts/produzione/impacchetta-corso.mjs <corso> --dir slide-in/<corso> [--out file.html]

import fs from "node:fs";
import path from "node:path";

const corso = process.argv[2];
const dirIx = process.argv.indexOf("--dir");
const dir = dirIx !== -1 ? process.argv[dirIx + 1] : null;
const outIx = process.argv.indexOf("--out");
const out = outIx !== -1 ? process.argv[outIx + 1] : `${corso}-corso-completo.html`;
// --pulito: SOLO le slide (nessuna bolla RELATORE, nessun gutter) — deck di sole slide
const pulito = process.argv.includes("--pulito") || process.argv.includes("--senza-bolla");
if (!corso || !dir) {
  console.error("Uso: node scripts/produzione/impacchetta-corso.mjs <corso> --dir <dir> [--out file.html]");
  process.exit(2);
}

// narrazione dai copioni (facoltativa)
let narr = new Map();
const copPath = `produzione/${corso}/copioni.json`;
if (fs.existsSync(copPath)) {
  const d = JSON.parse(fs.readFileSync(copPath, "utf8"));
  narr = new Map((d.slides || []).map((s) => [s.id, { titolo: s.titolo || "", testo: s.testo || "" }]));
}

const files = fs.readdirSync(dir).filter((f) => f.endsWith(".html")).sort();
if (!files.length) { console.error(`Nessun .html in ${dir}`); process.exit(1); }

const esc = (s) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
const slides = files.map((f) => {
  const id = f.replace(/\.html$/, "");
  const section = fs.readFileSync(path.join(dir, f), "utf8").trim();
  const m = narr.get(id);
  const stage = pulito
    ? `<div class="stage">${section}</div>`
    : `<div class="stage">${section}<div class="bolla">RELATORE</div></div>`;
  return `<div class="slide" data-id="${esc(id)}">
    ${stage}
    <div class="meta"><b>${esc(id)}</b>${m ? " · " + esc(m.titolo) : ""}
      ${m ? `<details><summary>Narrazione (voce avatar)</summary><p>${esc(m.testo)}</p></details>` : ""}
    </div>
  </div>`;
}).join("\n");

// larghezza del palco: 1660 (gutter+slide+bolla) oppure 1280 (solo slide)
const STAGE_W = pulito ? 1280 : 1660;

const FONTS = "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap";
const html = `<!doctype html><html lang="it"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(corso)} — corso completo (revisione)</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${FONTS}" rel="stylesheet">
<style>
 body{margin:0;background:#14100c;color:#eee;font-family:'IBM Plex Sans',system-ui}
 header{position:sticky;top:0;background:#1c1710;padding:10px 16px;display:flex;gap:14px;align-items:center;border-bottom:1px solid #332a1e;z-index:5}
 header b{color:#EA580C}
 button{background:#EA580C;border:0;color:#fff;padding:8px 14px;border-radius:8px;font-weight:600;cursor:pointer}
 button:disabled{opacity:.4;cursor:default}
 #wrap{padding:24px;overflow-x:hidden}
 .slide{display:none;text-align:center}
 .slide.on{display:block}
 /* palco: ${pulito ? "solo la slide" : "composizione player = gutter + section + bolla"} — inline-block dimensionato sul contenuto, rimpicciolito con zoom in fit() (mai clip) */
 .stage{position:relative;display:inline-block;text-align:left;background:#000;border-radius:10px}
${pulito ? "" : ` .stage>section{margin-left:380px!important;width:1280px!important}
 .bolla{position:absolute;left:1.5%;top:4.5%;width:20%;aspect-ratio:16/9;z-index:10;
   background:rgba(20,15,10,.35);border:2px dashed rgba(255,255,255,.55);border-radius:12px;
   display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.8);
   font:600 18px/1 'IBM Plex Sans';letter-spacing:.08em}
`} .meta{max-width:1280px;margin:14px auto 0;color:#c9bda9;font-size:14px;text-align:left}
 details{margin-top:8px}summary{cursor:pointer;color:#EA580C}
 details p{white-space:pre-wrap;line-height:1.5;color:#ddd;background:#1c1710;padding:12px;border-radius:8px}
</style></head><body>
<header>
 <b>${esc(corso)}</b> — corso completo (${files.length} slide) · anteprima di revisione
 <span style="flex:1"></span>
 <button id="prev">‹ Prec</button><span id="cnt"></span><button id="next">Succ ›</button>
</header>
<div id="wrap">${slides}</div>
<script>
 const S=[...document.querySelectorAll('.slide')];let i=0;
 const cnt=document.getElementById('cnt');
 function fit(){const st=S[i].querySelector('.stage');if(!st)return;
   st.style.zoom='';                                   // reset per misurare la larghezza reale
   const natW=Math.max(st.scrollWidth,st.offsetWidth); // contenuto effettivo (include eventuali sbordi)
   const avail=document.documentElement.clientWidth-48;
   st.style.zoom = natW>avail ? (avail/natW) : 1;}
 function show(n){S[i].classList.remove('on');i=Math.max(0,Math.min(S.length-1,n));S[i].classList.add('on');
   cnt.textContent=(i+1)+' / '+S.length;prev.disabled=i===0;next.disabled=i===S.length-1;fit();}
 prev.onclick=()=>show(i-1);next.onclick=()=>show(i+1);
 addEventListener('keydown',e=>{if(e.key==='ArrowRight')show(i+1);if(e.key==='ArrowLeft')show(i-1);});
 addEventListener('resize',fit);
 if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>show(0));
 show(0);
</script></body></html>`;

fs.writeFileSync(out, html);
console.log(`Deck creato: ${out} · ${files.length} slide${narr.size ? " (con narrazione)" : ""}`);
