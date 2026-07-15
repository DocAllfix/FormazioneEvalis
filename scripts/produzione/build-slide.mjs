// GENERATORE SLIDE — da un JSON di contenuti distillati produce gli <id>.html nello stile
// ESATTO del template Evalis (le stesse strutture/CSS di m01-m03 già validate). Separa il
// lavoro creativo (distillazione dei copioni, che faccio io) dall'assemblaggio HTML (meccanico
// e sempre corretto). Ogni slide è un <section> 1280×min-720, self-contained, file = <id>.html.
//
// Uso: node scripts/produzione/build-slide.mjs <contenuti.json> --out slide-in/<corso> [--tema ambra|navy]
// Il JSON è un array di slide, ognuna: { id, layout, ... } (vedi i layout sotto).
// --tema ambra (default, caldo) | navy ("blu petrolio", freddo) — cambia SOLO la palette.

import fs from "node:fs";
import path from "node:path";

const F = { mono: "'IBM Plex Mono',monospace", sans: "'IBM Plex Sans',sans-serif", grot: "'Space Grotesk',sans-serif" };

// PALETTE per ruolo. accent = accento su fondo CHIARO; accentDark = stesso ruolo su fondo SCURO
// (in ambra coincidono: l'arancione regge su entrambi; in navy il petrolio ha due tinte).
const TEMI = {
  ambra: {
    cream: "#F8F4EC", dark: "#231A12", ink: "#241C13", body: "#3B3226",
    accent: "#EA580C", accentDark: "#EA580C",
    taupe: "#8A7B66", taupe2: "#A0917B", muted: "#7A6C58", card: "#FFFDF9", line: "#E6DCCB",
    onDarkText: "#E6DCCB", onDarkMuted: "#A0917B", onDarkLine: "rgba(230,220,203,.18)",
    headOnDark: "#F4EDE1", refOnDark: "#8A7860",
  },
  navy: {
    cream: "#EEF2F5", dark: "#15293C", ink: "#142A3E", body: "#33475B",
    accent: "#0E7490", accentDark: "#34D3C0",
    taupe: "#8496A6", taupe2: "#8FA3B4", muted: "#6B7E90", card: "#FFFFFF", line: "#DCE4EA",
    onDarkText: "#C7D5E0", onDarkMuted: "#8FA3B4", onDarkLine: "rgba(220,232,240,.16)",
    headOnDark: "#EAF1F5", refOnDark: "#6E829A",
  },
};
const temaIx = process.argv.indexOf("--tema");
const temaNome = temaIx !== -1 ? process.argv[temaIx + 1] : "ambra";
const C = TEMI[temaNome];
if (!C) { console.error(`Tema sconosciuto "${temaNome}". Usa: ambra | navy`); process.exit(2); }

const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function header(kicker, ref, dark) {
  const rc = dark ? C.refOnDark : C.taupe;
  const kc = dark ? C.accentDark : C.accent;
  return `<div style="display:flex; justify-content:space-between; align-items:flex-start;"><span style="font-family:${F.mono}; font-size:11px; letter-spacing:.24em; text-transform:uppercase; color:${kc};">${esc(kicker)}</span>${ref ? `<span style="font-family:${F.mono}; font-size:11px; letter-spacing:.22em; text-transform:uppercase; color:${rc};">${esc(ref)}</span>` : ""}</div>`;
}
function footer(label, dark) {
  const ac = dark ? C.accentDark : C.accent;
  return `<div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid ${dark ? C.onDarkLine : C.line}; padding-top:22px;"><div style="display:flex; flex-direction:column; line-height:1; gap:5px;"><div style="font-family:${F.grot}; font-weight:700; font-size:16px; letter-spacing:-.02em; color:${ac};">evalis</div><div style="font-family:${F.mono}; font-size:8px; letter-spacing:.34em; color:${C.taupe2};">ACADEMY</div></div><span style="font-family:${F.mono}; font-size:10px; letter-spacing:.2em; text-transform:uppercase; color:${C.taupe2};">${esc(label)}</span></div>`;
}
function shell(inner, bg, label) {
  return `<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#E7DECD;"><section data-screen-label="${esc(label)}" style="width:1280px; min-height:720px; background:${bg}; font-family:${F.sans}; display:flex; flex-direction:column; padding:58px 80px;">${inner}</section></body></html>`;
}
const mid = (inner) => `<div style="flex:1; display:flex; flex-direction:column; justify-content:center; padding:40px 0;">${inner}</div>`;

// numerino monospace accento — dark sceglie la tinta su fondo scuro
const num = (n, dark) => `<span style="font-family:${F.mono}; font-size:12px; color:${dark ? C.accentDark : C.accent}; min-width:26px;">${esc(n)}</span>`;

// riga elenco: { h?, d } — h grassetto opzionale + descrizione
function rigaPunto(n, p, dark) {
  const tcol = dark ? C.onDarkText : C.body;
  const inner = p.h
    ? `<span style="font-size:17px; line-height:1.4; color:${dark ? C.headOnDark : C.ink};"><b style="font-weight:600;">${esc(p.h)}</b> — <span style="color:${tcol};">${esc(p.d || "")}</span></span>`
    : `<span style="font-size:17px; color:${tcol}; line-height:1.4;">${esc(p.d || p)}</span>`;
  return `<div style="display:flex; gap:20px; align-items:baseline; padding:11px 0; border-top:1px solid ${dark ? C.onDarkLine : C.line};">${num(n, dark)}${inner}</div>`;
}

const LAYOUTS = {
  // copertina scura: kicker (Modulo NN) + label corso, titolo grande, sottotitolo, agenda opz.
  apertura(s) {
    const label = s.corsoLabel || "Corso di certificazione auditor";
    const agenda = (s.agenda || []).map((a, i) =>
      `<div style="display:flex; gap:16px; align-items:baseline; padding:10px 0; border-top:1px solid ${C.onDarkLine};">${num(String(i + 1).padStart(2, "0"), true)}<span style="font-size:16px; color:${C.onDarkText}; line-height:1.4;">${esc(a)}</span></div>`).join("");
    const agendaGrid = agenda ? `<div style="display:grid; grid-template-columns:1fr 1fr; gap:0 56px; margin-top:26px;">${agenda}</div>` : "";
    const inner =
      header(label, s.kicker || "", true) +
      mid(
        `<div style="font-family:${F.mono}; font-size:11px; letter-spacing:.2em; text-transform:uppercase; color:${C.onDarkMuted}; margin-bottom:18px;">${esc(s.eyebrow || "")}</div>` +
        `<h1 style="font-family:${F.grot}; font-weight:600; font-size:${s.big ? "108px" : "64px"}; line-height:.98; letter-spacing:-.02em; margin:0; color:${C.accentDark};">${esc(s.titolo)}</h1>` +
        (s.sottotitolo ? `<div style="font-family:${F.grot}; font-weight:600; font-size:34px; color:${C.headOnDark}; margin-top:10px; letter-spacing:-.01em;">${esc(s.sottotitolo)}</div>` : "") +
        (s.testo ? `<p style="font-size:19px; line-height:1.5; color:${C.onDarkMuted}; margin:22px 0 0; max-width:80ch;">${esc(s.testo)}</p>` : "") +
        agendaGrid,
      ) +
      footer(s.footer, true);
    return shell(inner, C.dark, s.label);
  },

  // chiusura modulo: kicker riepilogo, "Fine modulo", titolo, recap 2-col, box prossimo
  chiusura(s) {
    const rec = (s.punti || []).map((p, i) => rigaPunto(String(i + 1).padStart(2, "0"), p, false)).join("");
    const grid = `<div style="display:grid; grid-template-columns:1fr 1fr; gap:0 56px;">${rec}</div>`;
    const box = s.prossimo
      ? `<div style="display:flex; gap:26px; align-items:center; background:${C.dark}; border-radius:14px; padding:22px 28px; margin-top:26px;"><span style="font-family:${F.mono}; font-size:11px; letter-spacing:.2em; text-transform:uppercase; color:${C.accentDark}; white-space:nowrap;">Prossimo →</span><div><div style="font-family:${F.grot}; font-weight:700; font-size:20px; color:${C.headOnDark};">Modulo ${esc(s.prossimo.modulo)} — ${esc(s.prossimo.titolo)}</div>${s.prossimo.testo ? `<div style="font-size:14px; color:${C.onDarkMuted}; margin-top:4px;">${esc(s.prossimo.testo)}</div>` : ""}</div></div>`
      : "";
    const inner =
      header(s.kicker || `Riepilogo · Modulo ${s.modNum || ""}`, "Fine modulo", false) +
      mid(`<h1 style="font-family:${F.grot}; font-weight:600; font-size:44px; line-height:1.04; letter-spacing:-.015em; margin:0 0 26px; color:${C.ink};">${esc(s.titolo)}</h1>${grid}${box}`) +
      footer(s.footer, false);
    return shell(inner, C.cream, s.label);
  },

  // elenco punti (cream): titolo + intro opz + punti (1 o 2 colonne)
  punti(s) {
    const cols = s.colonne || (s.punti.length > 4 ? 2 : 1);
    const items = s.punti.map((p, i) => rigaPunto(s.numerati === false ? "·" : String(i + 1).padStart(2, "0"), p, false)).join("");
    const list = cols === 2
      ? `<div style="display:grid; grid-template-columns:1fr 1fr; gap:0 56px;">${items}</div>`
      : `<div>${items}</div>`;
    const inner =
      header(s.kicker || "", s.ref || "", false) +
      mid(
        `<h1 style="font-family:${F.grot}; font-weight:600; font-size:40px; line-height:1.06; letter-spacing:-.015em; margin:0 0 ${s.intro ? "16" : "24"}px; color:${C.ink};">${esc(s.titolo)}</h1>` +
        (s.intro ? `<p style="font-size:18px; line-height:1.5; color:${C.muted}; margin:0 0 24px; max-width:82ch;">${esc(s.intro)}</p>` : "") +
        list,
      ) +
      footer(s.footer, false);
    return shell(inner, C.cream, s.label);
  },

  // card 3-col (cream): titolo + card { h, d }
  cards(s) {
    const n = s.cards.length;
    const colStyle = n <= 3 ? `repeat(${n},1fr)` : "repeat(3,1fr)";
    const pad = n > 6 ? "22px" : "26px";
    const cards = s.cards.map((c, i) =>
      `<div style="background:${C.card}; border:1px solid ${C.line}; border-radius:12px; padding:${pad};"><div style="font-family:${F.mono}; font-size:13px; color:${C.accent}; margin-bottom:14px;">${String(i + 1).padStart(2, "0")}</div><div style="font-family:${F.grot}; font-weight:600; font-size:${n > 6 ? "19" : "20"}px; color:${C.ink}; margin-bottom:8px; line-height:1.2;">${esc(c.h)}</div><div style="font-size:${n > 6 ? "14" : "15"}px; color:${C.muted}; line-height:1.5;">${esc(c.d || "")}</div></div>`).join("");
    const inner =
      header(s.kicker || "", s.ref || "", false) +
      mid(`<h1 style="font-family:${F.grot}; font-weight:600; font-size:40px; line-height:1.06; letter-spacing:-.015em; margin:0 0 26px; color:${C.ink};">${esc(s.titolo)}</h1><div style="display:grid; grid-template-columns:${colStyle}; gap:16px;">${cards}</div>`) +
      footer(s.footer, false);
    return shell(inner, C.cream, s.label);
  },

  // definizione (scura): termine grande + definizione (bordo sx) + punti a supporto
  definizione(s) {
    const pts = (s.punti || []).map((p, i) => rigaPunto(String(i + 1).padStart(2, "0"), p, true)).join("");
    const inner =
      header(s.kicker || "Definizione", s.ref || "", true) +
      mid(
        (s.eyebrow ? `<div style="font-family:${F.mono}; font-size:13px; letter-spacing:.2em; text-transform:uppercase; color:${C.accentDark}; margin-bottom:14px;">${esc(s.eyebrow)}</div>` : "") +
        `<h1 style="font-family:${F.grot}; font-weight:700; font-size:52px; line-height:1; letter-spacing:-.02em; margin:0 0 22px; color:${C.headOnDark};">${esc(s.titolo)}</h1>` +
        `<div style="border-left:3px solid ${C.accentDark}; padding-left:26px; max-width:70ch; margin:6px 0 ${pts ? "30" : "0"}px;"><p style="font-size:23px; line-height:1.4; font-weight:500; color:${C.headOnDark}; margin:0;">${esc(s.definizione)}</p></div>` +
        (pts ? `<div>${pts}</div>` : ""),
      ) +
      footer(s.footer, true);
    return shell(inner, C.dark, s.label);
  },

  // flusso (cream): titolo + step orizzontali collegati da frecce (sequenze, cicli, processi)
  flusso(s) {
    const n = s.passi.length;
    const parts = s.passi.map((p, i) => {
      const box = `<div style="flex:1; background:${C.card}; border:1px solid ${C.line}; border-radius:12px; padding:22px;"><div style="font-family:${F.mono}; font-size:13px; color:${C.accent}; margin-bottom:12px;">${String(i + 1).padStart(2, "0")}</div><div style="font-family:${F.grot}; font-weight:600; font-size:19px; color:${C.ink}; margin-bottom:6px; line-height:1.2;">${esc(p.h)}</div><div style="font-size:14px; color:${C.muted}; line-height:1.5;">${esc(p.d || "")}</div></div>`;
      const arrow = i < n - 1 ? `<div style="align-self:center; color:${C.accent}; font-size:22px; padding:0 2px; flex:0 0 auto;">→</div>` : "";
      return box + arrow;
    }).join("");
    const inner =
      header(s.kicker || "", s.ref || "", false) +
      mid(
        `<h1 style="font-family:${F.grot}; font-weight:600; font-size:40px; line-height:1.06; letter-spacing:-.015em; margin:0 0 ${s.intro ? "16" : "28"}px; color:${C.ink};">${esc(s.titolo)}</h1>` +
        (s.intro ? `<p style="font-size:18px; line-height:1.5; color:${C.muted}; margin:0 0 26px; max-width:82ch;">${esc(s.intro)}</p>` : "") +
        `<div style="display:flex; align-items:stretch; gap:8px;">${parts}</div>`,
      ) +
      footer(s.footer, false);
    return shell(inner, C.cream, s.label);
  },

  // confronto (cream): titolo + due colonne affiancate (A vs B) con divisore
  confronto(s) {
    const colonna = (c) => {
      const pts = (c.punti || []).map((p) =>
        `<div style="display:flex; gap:14px; align-items:baseline; padding:10px 0; border-top:1px solid ${C.line};"><span style="color:${C.accent}; font-size:13px;">◆</span><span style="font-size:16px; color:${C.body}; line-height:1.45;">${esc(p.d || p)}</span></div>`).join("");
      return `<div><div style="font-family:${F.grot}; font-weight:600; font-size:24px; color:${C.ink}; margin-bottom:6px;">${esc(c.h)}</div>${c.sub ? `<div style="font-size:14px; color:${C.accent}; font-family:${F.mono}; text-transform:uppercase; letter-spacing:.12em; margin-bottom:10px;">${esc(c.sub)}</div>` : ""}<div>${pts}</div></div>`;
    };
    const inner =
      header(s.kicker || "", s.ref || "", false) +
      mid(
        `<h1 style="font-family:${F.grot}; font-weight:600; font-size:40px; line-height:1.06; letter-spacing:-.015em; margin:0 0 ${s.intro ? "16" : "28"}px; color:${C.ink};">${esc(s.titolo)}</h1>` +
        (s.intro ? `<p style="font-size:18px; line-height:1.5; color:${C.muted}; margin:0 0 26px; max-width:82ch;">${esc(s.intro)}</p>` : "") +
        `<div style="display:grid; grid-template-columns:1fr 1fr; gap:56px;">${colonna(s.a)}${colonna(s.b)}</div>`,
      ) +
      footer(s.footer, false);
    return shell(inner, C.cream, s.label);
  },

  // evidenza (scura di default): una frase-manifesto grande + contesto opzionale
  evidenza(s) {
    const dark = s.dark !== false;
    const inner =
      header(s.kicker || "", s.ref || "", dark) +
      mid(
        (s.eyebrow ? `<div style="font-family:${F.mono}; font-size:13px; letter-spacing:.2em; text-transform:uppercase; color:${dark ? C.accentDark : C.accent}; margin-bottom:20px;">${esc(s.eyebrow)}</div>` : "") +
        `<div style="font-family:${F.grot}; font-weight:600; font-size:46px; line-height:1.18; letter-spacing:-.015em; color:${dark ? C.headOnDark : C.ink}; max-width:26ch;">${esc(s.titolo)}</div>` +
        (s.testo ? `<p style="font-size:19px; line-height:1.55; color:${dark ? C.onDarkMuted : C.muted}; margin:26px 0 0; max-width:76ch;">${esc(s.testo)}</p>` : ""),
      ) +
      footer(s.footer, dark);
    return shell(inner, dark ? C.dark : C.cream, s.label);
  },

  // numeri (cream): callout con numeroni (per le slide che "contano" qualcosa)
  numeri(s) {
    const items = s.numeri.map((x) =>
      `<div style="flex:1;"><div style="font-family:${F.grot}; font-weight:700; font-size:70px; line-height:1; color:${C.accent}; letter-spacing:-.02em;">${esc(x.n)}</div><div style="font-family:${F.grot}; font-weight:600; font-size:20px; color:${C.ink}; margin-top:8px; line-height:1.2;">${esc(x.h)}</div><div style="font-size:14px; color:${C.muted}; margin-top:6px; line-height:1.5;">${esc(x.d || "")}</div></div>`).join("");
    const inner =
      header(s.kicker || "", s.ref || "", false) +
      mid(
        `<h1 style="font-family:${F.grot}; font-weight:600; font-size:40px; line-height:1.06; letter-spacing:-.015em; margin:0 0 ${s.intro ? "16" : "34"}px; color:${C.ink};">${esc(s.titolo)}</h1>` +
        (s.intro ? `<p style="font-size:18px; line-height:1.5; color:${C.muted}; margin:0 0 34px; max-width:82ch;">${esc(s.intro)}</p>` : "") +
        `<div style="display:flex; gap:48px;">${items}</div>`,
      ) +
      footer(s.footer, false);
    return shell(inner, C.cream, s.label);
  },

  // split (cream): asimmetrico — a sinistra un'affermazione guida, a destra l'elenco
  split(s) {
    const items = (s.punti || []).map((p, i) => rigaPunto(s.numerati === false ? "·" : String(i + 1).padStart(2, "0"), p, false)).join("");
    const inner =
      header(s.kicker || "", s.ref || "", false) +
      mid(
        `<div style="display:grid; grid-template-columns:2fr 3fr; gap:56px; align-items:start;"><div><h1 style="font-family:${F.grot}; font-weight:600; font-size:38px; line-height:1.08; letter-spacing:-.015em; margin:0; color:${C.ink};">${esc(s.titolo)}</h1>${s.lead ? `<p style="font-size:17px; line-height:1.5; color:${C.muted}; margin:18px 0 0;">${esc(s.lead)}</p>` : ""}</div><div>${items}</div></div>`,
      ) +
      footer(s.footer, false);
    return shell(inner, C.cream, s.label);
  },

  // timeline (cream): linea del tempo orizzontale (storia, evoluzione)
  timeline(s) {
    const n = s.tappe.length;
    const cells = s.tappe.map((t, i) =>
      `<div style="flex:1; padding-right:${i < n - 1 ? "20px" : "0"};"><div style="font-family:${F.grot}; font-weight:700; font-size:26px; color:${C.accent}; letter-spacing:-.01em;">${esc(t.t)}</div><div style="height:14px; display:flex; align-items:center; margin:10px 0;"><span style="width:11px; height:11px; border-radius:50%; background:${C.accent}; flex:0 0 auto;"></span><span style="flex:1; height:2px; background:${i < n - 1 ? C.line : "transparent"};"></span></div><div style="font-family:${F.grot}; font-weight:600; font-size:17px; color:${C.ink}; line-height:1.2; margin-bottom:6px;">${esc(t.h)}</div><div style="font-size:14px; color:${C.muted}; line-height:1.5;">${esc(t.d || "")}</div></div>`).join("");
    const inner =
      header(s.kicker || "", s.ref || "", false) +
      mid(
        `<h1 style="font-family:${F.grot}; font-weight:600; font-size:40px; line-height:1.06; letter-spacing:-.015em; margin:0 0 ${s.intro ? "16" : "34"}px; color:${C.ink};">${esc(s.titolo)}</h1>` +
        (s.intro ? `<p style="font-size:18px; line-height:1.5; color:${C.muted}; margin:0 0 30px; max-width:82ch;">${esc(s.intro)}</p>` : "") +
        `<div style="display:flex;">${cells}</div>`,
      ) +
      footer(s.footer, false);
    return shell(inner, C.cream, s.label);
  },

  // tabella (cream): titolo + tabella (cols + righe)
  tabella(s) {
    const th = s.cols.map((c) => `<th style="text-align:left; font-family:${F.mono}; font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:${C.accent}; padding:0 18px 12px; border-bottom:2px solid ${C.line};">${esc(c)}</th>`).join("");
    const rows = s.righe.map((r) =>
      `<tr>${r.map((cell, ci) => `<td style="padding:13px 18px; border-bottom:1px solid ${C.line}; font-size:${ci === 0 ? "16" : "15"}px; color:${ci === 0 ? C.ink : C.body}; ${ci === 0 ? "font-weight:600;" : ""} vertical-align:top; line-height:1.4;">${esc(cell)}</td>`).join("")}</tr>`).join("");
    const inner =
      header(s.kicker || "", s.ref || "", false) +
      mid(`<h1 style="font-family:${F.grot}; font-weight:600; font-size:40px; line-height:1.06; letter-spacing:-.015em; margin:0 0 26px; color:${C.ink};">${esc(s.titolo)}</h1><table style="width:100%; border-collapse:collapse;"><thead><tr>${th}</tr></thead><tbody>${rows}</tbody></table>`) +
      footer(s.footer, false);
    return shell(inner, C.cream, s.label);
  },
};

// --- main ---
const jsonPath = process.argv[2];
const outIx = process.argv.indexOf("--out");
const outDir = outIx !== -1 ? process.argv[outIx + 1] : null;
if (!jsonPath || !outDir) {
  console.error("Uso: node scripts/produzione/build-slide.mjs <contenuti.json> --out <dir> [--tema ambra|navy]");
  process.exit(2);
}
const slides = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
fs.mkdirSync(outDir, { recursive: true });
let ok = 0;
for (const s of slides) {
  const fn = LAYOUTS[s.layout];
  if (!fn) { console.error(`✗ ${s.id}: layout sconosciuto "${s.layout}"`); process.exit(1); }
  if (!s.footer) s.footer = `Modulo ${(s.id.match(/_m(\d\d)_/) || [])[1] || ""} · ${s.titolo}`;
  if (!s.label) s.label = s.id;
  fs.writeFileSync(path.join(outDir, `${s.id}.html`), fn(s));
  ok++;
}
console.log(`Generate ${ok} slide in ${outDir} (tema ${temaNome})`);
