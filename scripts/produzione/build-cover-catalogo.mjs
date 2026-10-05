// COPERTINA DI CATALOGO — la miniatura 1586x992 che il catalogo e la landing mostrano per un
// corso (public/covers/<nome>.webp). Riproduce la cornice delle copertine già in uso — fondo
// crema, blob arancioni in alto a sinistra e in basso a destra, disco chiaro al centro, griglia
// di puntini, anello tratteggiato — e cambia SOLO l'icona centrale.
//
// Non sostituisce le copertine esistenti: serve per i corsi nuovi, perché stiano nella stessa
// famiglia visiva senza rifare a mano il fondo.
//
// Uso: node scripts/produzione/build-cover-catalogo.mjs <nome> [<nome> …]   (default: tutti)
import fs from "node:fs";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const W = 1586, H = 992;
const C = {
  cremaA: "#F2E6DD", cremaB: "#F4E8DC", disco: "#F7EDE5", discoOmbra: "#EFE2D6",
  arancio: "#EA650B", arancioCaldo: "#EC7A26", arancioScuro: "#C9540A",
  puntoArancio: "#DE6611", puntoNero: "#2F281B", puntoBeige: "#EBC299",
  oro: "#D9A441", linea: "#E6D8C9",
};

// --- icone: disegnate nel riquadro 0..360 (il centro del disco), tinta piena + rilievo morbido
const ICONE = {
  // ingranaggi + coccarda: la qualità certificata, come la copertina della ISO 9001
  qualita: {
    centro: [166, 196], scala: 1.72,
    disegna: () => `
      ${ingranaggio(124, 146, 94, 10, C.arancio)}
      ${ingranaggio(236, 104, 72, 9, "#EDE0D0")}
      ${coccarda(236, 240, 78)}`,
  },
  // ingranaggio + freccia circolare: corso di aggiornamento, come la copertina della 14001 agg
  aggiornamento: {
    centro: [187, 187], scala: 1.68,
    disegna: () => `
      ${ingranaggio(150, 150, 104, 10, C.arancio)}
      ${frecciaCircolare(252, 252, 80)}`,
  },
  // bilancia in equilibrio + coccarda: la certificazione della parità di genere (UNI/PdR 125)
  parita: {
    centro: [170, 190], scala: 1.62,
    disegna: () => `
      ${bilancia(150, 150, 120)}
      ${coccarda(262, 248, 62)}`,
  },
};

function bilancia(cx, cy, r) {
  const t = C.arancio, sp = r * 0.11;
  const piatto = (x) => `
    <line x1="${x}" y1="${cy - r * 0.62}" x2="${x - r * 0.30}" y2="${cy + r * 0.12}" stroke="${C.arancioScuro}" stroke-width="${sp * 0.38}" stroke-linecap="round"/>
    <line x1="${x}" y1="${cy - r * 0.62}" x2="${x + r * 0.30}" y2="${cy + r * 0.12}" stroke="${C.arancioScuro}" stroke-width="${sp * 0.38}" stroke-linecap="round"/>
    <path d="M${x - r * 0.40},${cy + r * 0.12} A${r * 0.40},${r * 0.26} 0 0 0 ${x + r * 0.40},${cy + r * 0.12} Z" fill="${C.arancioCaldo}"/>`;
  return `<g filter="url(#rilievo)">
    <rect x="${cx - sp / 2}" y="${cy - r * 0.70}" width="${sp}" height="${r * 1.55}" rx="${sp / 2}" fill="${t}"/>
    <path d="M${cx - r * 0.42},${cy + r * 0.98} L${cx + r * 0.42},${cy + r * 0.98} L${cx + r * 0.24},${cy + r * 0.78} L${cx - r * 0.24},${cy + r * 0.78} Z" fill="${C.arancioScuro}"/>
    <rect x="${cx - r * 0.86}" y="${cy - r * 0.68}" width="${r * 1.72}" height="${sp * 0.9}" rx="${sp * 0.45}" fill="${t}"/>
    <circle cx="${cx}" cy="${cy - r * 0.66}" r="${sp * 0.95}" fill="${C.arancioCaldo}" stroke="${t}" stroke-width="${sp * 0.3}"/>
    ${piatto(cx - r * 0.78)}${piatto(cx + r * 0.78)}
  </g>`;
}

function ingranaggio(cx, cy, r, denti, tinta) {
  const rTesta = r, rPiede = r * 0.80, rForo = r * 0.40;
  const passo = (Math.PI * 2) / denti;
  const mezzoTesta = passo * 0.26, mezzoPiede = passo * 0.46;
  const p = (ang, raggio) => `${(cx + Math.cos(ang) * raggio).toFixed(2)},${(cy + Math.sin(ang) * raggio).toFixed(2)}`;
  let d = "";
  for (let i = 0; i < denti; i++) {
    const a = i * passo - Math.PI / 2;
    if (!i) d += `M${p(a - mezzoPiede, rPiede)} `;
    d += `L${p(a - mezzoTesta, rTesta)} A${rTesta},${rTesta} 0 0 1 ${p(a + mezzoTesta, rTesta)} `;
    d += `L${p(a + mezzoPiede, rPiede)} A${rPiede},${rPiede} 0 0 1 ${p(a + passo - mezzoPiede, rPiede)} `;
  }
  return `<g filter="url(#rilievo)">
    <path d="${d}Z" fill="${tinta}" stroke="${tinta}" stroke-width="${r * 0.10}" stroke-linejoin="round"/>
    <circle cx="${cx}" cy="${cy}" r="${rForo}" fill="${C.disco}"/>
  </g>`;
}

function coccarda(cx, cy, r) {
  const bolle = 12, passo = (Math.PI * 2) / bolle, rb = r * Math.sin(passo / 2) * 1.05;
  const p = (ang, raggio) => `${(cx + Math.cos(ang) * raggio).toFixed(2)},${(cy + Math.sin(ang) * raggio).toFixed(2)}`;
  let smerlo = `M${p(-Math.PI / 2, r)} `;
  for (let i = 1; i <= bolle; i++) smerlo += `A${rb},${rb} 0 0 1 ${p(-Math.PI / 2 + i * passo, r)} `;
  return `<g filter="url(#rilievo)">
    <path d="M${cx - r * 0.46},${cy + r * 0.55} L${cx - r * 0.54},${cy + r * 1.62} L${cx - r * 0.18},${cy + r * 1.30} L${cx + r * 0.04},${cy + r * 1.64} L${cx + r * 0.02},${cy + r * 0.55} Z" fill="${C.arancioCaldo}"/>
    <path d="M${cx + r * 0.0},${cy + r * 0.55} L${cx + r * 0.04},${cy + r * 1.64} L${cx + r * 0.28},${cy + r * 1.28} L${cx + r * 0.62},${cy + r * 1.58} L${cx + r * 0.50},${cy + r * 0.55} Z" fill="${C.arancioScuro}"/>
    <path d="${smerlo}Z" fill="#F3E8DB"/>
    <circle cx="${cx}" cy="${cy}" r="${r * 0.70}" fill="none" stroke="${C.arancio}" stroke-width="${r * 0.12}"/>
    <path d="M${cx - r * 0.33},${cy + r * 0.01} l${r * 0.23},${r * 0.26} l${r * 0.47},${r * -0.53}"
      fill="none" stroke="${C.arancioCaldo}" stroke-width="${r * 0.17}" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;
}

function frecciaCircolare(cx, cy, r) {
  const sp = r * 0.30;
  // ruotata: l'apertura dell'arco finisce dietro l'ingranaggio e la punta resta ben visibile
  return `<g filter="url(#rilievo)" transform="rotate(150,${cx},${cy})">
    <path d="M${cx},${cy - r} A${r},${r} 0 1 1 ${(cx - r * 0.707).toFixed(2)},${(cy + r * 0.707).toFixed(2)}"
      fill="none" stroke="${C.arancioCaldo}" stroke-width="${sp}" stroke-linecap="butt"/>
    <path d="M${(cx + sp * 1.45).toFixed(2)},${(cy - r).toFixed(2)} L${(cx - sp * 0.18).toFixed(2)},${(cy - r - sp * 1.05).toFixed(2)} L${(cx - sp * 0.18).toFixed(2)},${(cy - r + sp * 1.05).toFixed(2)} Z"
      fill="${C.arancioCaldo}"/>
  </g>`;
}

function svg(icona, posa) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="fondo" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0" stop-color="${C.cremaA}"/><stop offset="1" stop-color="${C.cremaB}"/>
    </linearGradient>
    <linearGradient id="blobAlto" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${C.arancio}"/><stop offset="1" stop-color="${C.arancioCaldo}"/>
    </linearGradient>
    <linearGradient id="blobBasso" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${C.arancioCaldo}"/><stop offset="1" stop-color="${C.arancio}"/>
    </linearGradient>
    <filter id="rilievo" x="-25%" y="-25%" width="150%" height="150%">
      <feDropShadow dx="0" dy="7" stdDeviation="9" flood-color="#8A6A4A" flood-opacity=".22"/>
    </filter>
    <filter id="morbido" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="26"/>
    </filter>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#fondo)"/>

  <!-- blob arancione in alto a sinistra, con la sfumatura morbida verso il fondo -->
  <path d="M0,0 L268,0 C262,86 236,150 186,196 C130,248 58,262 0,250 Z" fill="url(#blobAlto)"/>
  <path d="M0,0 L300,0 C292,96 262,166 206,216 C144,272 64,288 0,276 Z" fill="url(#blobAlto)" opacity=".28" filter="url(#morbido)"/>

  <!-- onda arancione in basso a destra -->
  <path d="M1586,560 C1420,600 1330,712 1256,812 C1196,894 1126,952 1040,992 L1586,992 Z" fill="url(#blobBasso)"/>

  <!-- linea sottile che accompagna l'onda -->
  <path d="M1586,470 C1380,530 1268,660 1196,800 C1156,878 1098,946 1022,992"
    fill="none" stroke="${C.linea}" stroke-width="2.5" opacity=".9"/>

  <!-- anello tratteggiato a destra -->
  <circle cx="1560" cy="430" r="250" fill="none" stroke="${C.puntoBeige}" stroke-width="3"
    stroke-dasharray="7 15" opacity=".85"/>

  <!-- griglia di puntini a sinistra -->
  <g fill="${C.puntoBeige}" opacity=".95">
    ${Array.from({ length: 8 }, (_, r) => Array.from({ length: 5 }, (_, c) =>
      `<circle cx="${36 + c * 32}" cy="${534 + r * 32}" r="4"/>`).join("")).join("")}
  </g>
  <circle cx="378" cy="578" r="11" fill="${C.puntoArancio}"/>
  <circle cx="387" cy="634" r="7" fill="${C.puntoNero}"/>
  <circle cx="1234" cy="610" r="13" fill="${C.puntoBeige}"/>

  <!-- disco centrale + filo dorato sul bordo in basso a destra -->
  <circle cx="794" cy="476" r="388" fill="${C.discoOmbra}" opacity=".85"/>
  <circle cx="790" cy="468" r="388" fill="${C.disco}"/>
  <path d="M1178,468 A388,388 0 0 1 688,845" fill="none" stroke="${C.oro}" stroke-width="3" opacity=".7"/>

  <!-- icona, centrata e scalata per riempire il disco come nelle altre copertine -->
  <g transform="${posa}">${icona}</g>
</svg>`;
}

const CORSI = {
  "9001v26": ICONE.qualita,
  agg9001: ICONE.aggiornamento,
  fadpdr125: ICONE.parita,
};

const DISCO = { x: 790, y: 478 };

const voluti = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const nomi = voluti.length ? voluti : Object.keys(CORSI);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
fs.mkdirSync("public/covers", { recursive: true });

for (const nome of nomi) {
  const icona = CORSI[nome];
  if (!icona) { console.log(`skip ${nome}: nessuna icona definita`); continue; }
  const [cx, cy] = icona.centro, k = icona.scala;
  const posa = `translate(${(DISCO.x - cx * k).toFixed(1)},${(DISCO.y - cy * k).toFixed(1)}) scale(${k})`;
  const markup = svg(icona.disegna(), posa);
  await page.setContent(`<style>html,body{margin:0;padding:0}</style>${markup}`, { waitUntil: "load" });
  const png = await page.screenshot({ type: "png", clip: { x: 0, y: 0, width: W, height: H } });
  const out = `public/covers/${nome}.webp`;
  await sharp(png).webp({ quality: 88 }).toFile(out);
  console.log(`${out} · ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
}
await browser.close();
process.exit(0);
