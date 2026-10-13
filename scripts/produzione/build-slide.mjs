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
  return `<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#E7DECD;"><section data-screen-label="${esc(label)}" style="box-sizing:border-box; width:1280px; min-height:720px; background:${bg}; font-family:${F.sans}; display:flex; flex-direction:column; padding:58px 80px;">${inner}</section></body></html>`;
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

// ---- supporto ai layout di DATI e DIAGRAMMI (barre, ciambella, linee, matrice, gantt, piramide,
// ciclo, organigramma). Regola anti-taglio, la stessa che rende misurabili gli altri layout:
// TUTTO il testo sta in HTML a flusso normale (mai dentro un SVG, mai in posizione assoluta, mai in
// un contenitore ad altezza fissa), e ogni cella di testo ha min-width:0 + overflow-wrap:anywhere,
// così l'altezza naturale della section — l'unica cosa che gate, populate e player misurano — è
// sempre quella vera e nessuna etichetta può uscire a destra. L'SVG disegna solo forme senza testo.
const SERIE = {
  ambra: ["#EA580C", "#8A7B66", "#C7A06A", "#3B3226", "#F0A06A", "#A0917B"],
  navy: ["#0E7490", "#8FB0C4", "#15293C", "#6B7E90", "#34D3C0", "#33475B"],
}[temaNome];
// rampa scuro → chiaro per piramidi (i primi tre gradini portano testo chiaro)
const RAMPA = {
  ambra: ["#231A12", "#6B3414", "#EA580C", "#F2AC7A", "#F7D9C1"],
  navy: ["#15293C", "#1F4E6B", "#0E7490", "#86BACB", "#CFE3EA"],
}[temaNome];
const CELLA = "box-sizing:border-box; min-width:0; overflow-wrap:anywhere;";
const numIt = (v) => (typeof v === "number" ? v.toLocaleString("it-IT", { maximumFractionDigits: 1 }) : esc(v));
// numeri dei calcoli (layout calcolo e simulatore): stessi arrotondamenti del materiale del committente
const numDec = (v, d) => (typeof v === "number" ? v.toLocaleString("it-IT", { maximumFractionDigits: d, useGrouping: "always" }) : esc(v));
const numRis = (v) => { const a = Math.abs(v); return numDec(v, a >= 100 ? 0 : a >= 10 ? 1 : a >= 1 ? 2 : 3); };
const numTon = (kg) => { const t = kg / 1000, a = Math.abs(t); return numDec(t, a >= 100 ? 1 : a >= 1 ? 2 : 3); };
const valRiga = (r) => (r.a * r.ef * (r.k == null ? 1 : r.k)) / (r.d == null ? 1 : r.d);
function niceMax(m) {
  if (!(m > 0)) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(m))), f = m / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 4 ? 4 : f <= 5 ? 5 : f <= 8 ? 8 : 10) * p;
}
const titoloIntro = (s, mb = 26) =>
  `<h1 style="font-family:${F.grot}; font-weight:600; font-size:40px; line-height:1.06; letter-spacing:-.015em; margin:0 0 ${s.intro ? "16" : mb}px; color:${C.ink};">${esc(s.titolo)}</h1>` +
  (s.intro ? `<p style="font-size:18px; line-height:1.5; color:${C.muted}; margin:0 0 ${mb}px; max-width:82ch;">${esc(s.intro)}</p>` : "");
const fonteDati = (s) => (s.fonte ? `<div style="font-family:${F.mono}; font-size:11px; letter-spacing:.06em; color:${C.taupe}; margin-top:18px; ${CELLA}">Fonte: ${esc(s.fonte)}</div>` : "");
const pastiglia = (col) => `<span style="display:inline-block; width:12px; height:12px; border-radius:3px; background:${col}; flex:0 0 auto;"></span>`;
const legendaSerie = (nomi) =>
  `<div style="display:flex; flex-wrap:wrap; gap:8px 22px; margin:0 0 16px;">${nomi.map((n, i) =>
    `<span style="display:flex; gap:8px; align-items:center; font-size:14px; color:${C.body}; ${CELLA}">${pastiglia(SERIE[i % SERIE.length])}${esc(n)}</span>`).join("")}</div>`;
const pagina = (s, corpo) => shell(header(s.kicker || "", s.ref || "", false) + mid(titoloIntro(s) + corpo + fonteDati(s)) + footer(s.footer, false), C.cream, s.label);

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

  // barre orizzontali (cream): una o più serie, opzionale obiettivo per voce (valore vs obiettivo).
  // Indicatori eterogenei (%, ore, indici): ogni voce può avere la SUA scala (max) e la sua unità (u).
  // { titolo, intro?, unita?, serie?: [nomi], voci: [{ l, v: n | [n...], obiettivo?, meglioBasso?, max?, u? }], max?, fonte? }
  barre(s) {
    const multi = Array.isArray(s.serie) && s.serie.length > 1;
    const vals = s.voci.flatMap((x) => [].concat(x.v, x.obiettivo ?? []));
    const maxComune = s.max || niceMax(Math.max(...vals));
    const hBar = multi ? 14 : 22;
    const righe = s.voci.map((x) => {
      const u = x.u ?? s.unita ?? "";
      // la scala non può mai stare sotto i valori: un grafico non deve poter mentire
      const max = Math.max(x.max || maxComune, ...[].concat(x.v, x.obiettivo ?? []));
      const vs = [].concat(x.v);
      const barre = vs.map((v, i) =>
        `<div style="height:${hBar}px; width:${Math.max(0.4, Math.min(100, (100 * v) / max)).toFixed(1)}%; background:${multi ? SERIE[i % SERIE.length] : C.accent}; border-radius:0 4px 4px 0;"></div>`).join("");
      // l'obiettivo è un segno verticale DENTRO la traccia: nessun testo, non cambia l'altezza
      const segno = x.obiettivo != null
        ? `<div style="position:absolute; top:-5px; bottom:-5px; left:${Math.min(100, (100 * x.obiettivo) / max).toFixed(1)}%; width:3px; margin-left:-1px; background:${C.ink}; border-radius:2px;"></div>` : "";
      let valore = vs.map((v) => `${numIt(v)}${esc(u)}`).join("<br>");
      if (x.obiettivo != null) {
        const ok = x.meglioBasso ? vs[0] <= x.obiettivo : vs[0] >= x.obiettivo;
        valore += `<span style="color:${C.muted}; font-weight:400;"> / ob. ${numIt(x.obiettivo)}${esc(u)}</span><br><span style="font-family:${F.mono}; font-size:11px; letter-spacing:.06em; text-transform:uppercase; color:${ok ? C.accent : C.ink};">${ok ? "in linea" : "da migliorare"}</span>`;
      }
      return `<div style="display:grid; grid-template-columns:minmax(0,30%) minmax(0,1fr) minmax(0,170px); gap:18px; align-items:center; padding:9px 0; border-top:1px solid ${C.line};">` +
        `<div style="font-size:15px; line-height:1.35; color:${C.body}; text-align:right; ${CELLA}">${esc(x.l)}</div>` +
        `<div style="position:relative; display:flex; flex-direction:column; gap:3px; background:${C.card}; border-radius:4px;">${barre}${segno}</div>` +
        `<div style="font-family:${F.grot}; font-weight:600; font-size:15px; line-height:1.35; color:${C.ink}; font-variant-numeric:tabular-nums; ${CELLA}">${valore}</div></div>`;
    }).join("");
    return pagina(s, (multi ? legendaSerie(s.serie) : "") + `<div>${righe}</div>`);
  },

  // ciambella (cream): composizione di un totale. SVG solo spicchi; totale e legenda in HTML.
  // { titolo, intro?, unita?, totale?: { n, eti }, voci: [{ l, v }], fonte? }
  ciambella(s) {
    const u = s.unita || "";
    const tot = s.voci.reduce((a, x) => a + x.v, 0);
    const r = 90, circ = 2 * Math.PI * r, gap = s.voci.length > 1 ? 3 : 0;
    let off = 0;
    const spicchi = s.voci.map((x, i) => {
      const len = (circ * x.v) / tot, tratto = Math.max(0.5, len - gap);
      const c = `<circle cx="120" cy="120" r="${r}" fill="none" stroke="${SERIE[i % SERIE.length]}" stroke-width="44" stroke-dasharray="${tratto.toFixed(2)} ${(circ - tratto).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 120 120)"/>`;
      off += len;
      return c;
    }).join("");
    const legenda = s.voci.map((x, i) =>
      `<div style="display:grid; grid-template-columns:auto minmax(0,1fr) auto auto; gap:14px; align-items:center; padding:11px 0; border-top:1px solid ${C.line};">${pastiglia(SERIE[i % SERIE.length])}` +
      `<span style="font-size:16px; line-height:1.35; color:${C.body}; ${CELLA}">${esc(x.l)}</span>` +
      `<span style="font-family:${F.grot}; font-weight:600; font-size:16px; color:${C.ink}; font-variant-numeric:tabular-nums;">${numIt(x.v)}${esc(u)}</span>` +
      `<span style="font-family:${F.mono}; font-size:13px; color:${C.muted}; min-width:58px; text-align:right; font-variant-numeric:tabular-nums;">${numIt(Math.round((1000 * x.v) / tot) / 10)}%</span></div>`).join("");
    const totale = s.totale
      ? `<div style="display:flex; gap:14px; align-items:baseline; margin-bottom:10px;"><span style="font-family:${F.grot}; font-weight:700; font-size:48px; line-height:1; color:${C.accent};">${esc(s.totale.n)}</span><span style="font-size:16px; color:${C.muted}; ${CELLA}">${esc(s.totale.eti || "")}</span></div>` : "";
    return pagina(s,
      `<div style="display:grid; grid-template-columns:240px minmax(0,1fr); gap:56px; align-items:center;">` +
      `<svg width="240" height="240" viewBox="0 0 240 240" aria-hidden="true" style="display:block;">${spicchi}</svg>` +
      `<div style="min-width:0;">${totale}${legenda}</div></div>`);
  },

  // linee (cream): andamento nel tempo, 1-4 serie. SVG solo linee e punti (larghezza fissa 1120 =
  // larghezza utile della section, quindi nessuna deformazione); assi ed etichette in HTML.
  // { titolo, intro?, unita?, periodi: [..], serie: [{ nome, v: [..] }], min?, max?, fonte? }
  linee(s) {
    const u = s.unita || "";
    const n = s.periodi.length, W = 1040, H = 260;
    const tutti = s.serie.flatMap((x) => x.v);
    // scala mai più stretta dei dati (un massimo dichiarato troppo basso taglierebbe la linea)
    const min = Math.min(s.min ?? 0, ...tutti), max = Math.max(s.max || 0, niceMax(Math.max(...tutti)));
    const X = (i) => ((i + 0.5) * W) / n; // stesso centro delle colonne HTML delle etichette
    const Y = (v) => H - ((v - min) / (max - min)) * H;
    const griglia = [0, 1, 2, 3, 4].map((t) => `<line x1="0" x2="${W}" y1="${(H * t) / 4}" y2="${(H * t) / 4}" stroke="${C.line}" stroke-width="1"/>`).join("");
    const tracce = s.serie.map((x, si) => {
      const col = SERIE[si % SERIE.length];
      return `<polyline points="${x.v.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ")}" fill="none" stroke="${col}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>` +
        x.v.map((v, i) => `<circle cx="${X(i).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="5" fill="${col}" stroke="${C.cream}" stroke-width="2"/>`).join("");
    }).join("");
    const tick = [4, 3, 2, 1, 0].map((t) => `<span style="font-family:${F.mono}; font-size:12px; line-height:1; color:${C.muted};">${numIt(min + ((max - min) * t) / 4)}</span>`).join("");
    const etichette = s.periodi.map((p) => `<span style="font-family:${F.mono}; font-size:12px; color:${C.muted}; text-align:center; ${CELLA}">${esc(p)}</span>`).join("");
    const legenda = `<div style="display:flex; flex-wrap:wrap; gap:8px 26px; margin:0 0 16px;">${s.serie.map((x, i) =>
      `<span style="display:flex; gap:8px; align-items:center; font-size:14px; color:${C.body}; ${CELLA}">${pastiglia(SERIE[i % SERIE.length])}${esc(x.nome)} <b style="font-family:${F.grot}; color:${C.ink};">${numIt(x.v[x.v.length - 1])}${esc(u)}</b></span>`).join("")}</div>`;
    return pagina(s, legenda +
      `<div style="display:grid; grid-template-columns:56px ${W}px; gap:0 24px;">` +
      `<div style="display:flex; flex-direction:column; justify-content:space-between; align-items:flex-end; height:${H + 12}px; margin:-6px 0;">${tick}</div>` +
      // <title>: tutti i valori in chiaro per chi legge il testo della slide (giudice di contestualità,
      // lettori di schermo); non occupa spazio e non si vede
      `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" style="display:block; overflow:visible;"><title>${s.serie.map((x) => `${esc(x.nome)}: ${x.v.map((v, i) => `${esc(s.periodi[i])} ${numIt(v)}${esc(u)}`).join(", ")}`).join("; ")}</title>${griglia}${tracce}</svg>` +
      `<div></div><div style="display:grid; grid-template-columns:repeat(${n},minmax(0,1fr)); margin-top:10px;">${etichette}</div></div>`);
  },

  // matrice di rischio 5×5 (cream): probabilità (colonne) × gravità (righe), codici nelle celle,
  // elenco a destra. { titolo, intro?, assi?: { x, y }, punti: [{ id, l, p, g }], fonte? }
  matrice(s) {
    const TINTE = ["#DCEFD8", "#FBEFC4", "#F8D3BC", "#F1BDBA"];
    const livello = (sc) => (sc <= 4 ? 0 : sc <= 9 ? 1 : sc <= 14 ? 2 : 3);
    const chip = (id) => `<span style="font-family:${F.mono}; font-size:12px; font-weight:500; color:#fff; background:${C.dark}; border-radius:10px; padding:2px 8px;">${esc(id)}</span>`;
    let celle = "";
    for (let g = 5; g >= 1; g--) {
      celle += `<div style="font-family:${F.mono}; font-size:12px; color:${C.muted}; display:flex; align-items:center; justify-content:center;">${g}</div>`;
      for (let p = 1; p <= 5; p++) {
        const qui = s.punti.filter((x) => x.p === p && x.g === g);
        celle += `<div style="min-height:52px; background:${TINTE[livello(p * g)]}; border-radius:6px; padding:5px 6px; display:flex; flex-direction:column; gap:4px; ${CELLA}">` +
          `<span style="font-family:${F.mono}; font-size:10px; color:rgba(36,28,19,.55); text-align:right;">${p * g}</span>` +
          `<div style="display:flex; flex-wrap:wrap; gap:4px;">${qui.map((x) => chip(x.id)).join("")}</div></div>`;
      }
    }
    celle += `<div></div>` + [1, 2, 3, 4, 5].map((p) => `<div style="font-family:${F.mono}; font-size:12px; color:${C.muted}; text-align:center;">${p}</div>`).join("");
    const assi = s.assi || { x: "Probabilità", y: "Gravità" };
    const chiave = ["Basso 1-4", "Medio 5-9", "Alto 10-14", "Critico 15-25"].map((t, i) =>
      `<span style="display:flex; gap:6px; align-items:center; font-size:12px; color:${C.body};">${pastiglia(TINTE[i])}${t}</span>`).join("");
    const elenco = s.punti.map((x) =>
      `<div style="display:grid; grid-template-columns:auto minmax(0,1fr) auto; gap:12px; align-items:baseline; padding:8px 0; border-top:1px solid ${C.line};">${chip(x.id)}` +
      `<span style="font-size:14px; line-height:1.35; color:${C.body}; ${CELLA}">${esc(x.l)}</span>` +
      `<span style="font-family:${F.mono}; font-size:12px; color:${C.muted}; white-space:nowrap;">${x.p}×${x.g}=${x.p * x.g}</span></div>`).join("");
    return pagina(s,
      `<div style="display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:44px; align-items:start;">` +
      `<div style="min-width:0;"><div style="display:grid; grid-template-columns:24px repeat(5,minmax(0,1fr)); gap:4px;">${celle}</div>` +
      `<div style="font-size:12px; color:${C.muted}; text-align:center; margin-top:8px; ${CELLA}">→ ${esc(assi.x)} (colonne) · ↑ ${esc(assi.y)} (righe)</div>` +
      `<div style="display:flex; flex-wrap:wrap; gap:6px 16px; margin-top:10px;">${chiave}</div></div>` +
      `<div style="min-width:0;">${elenco}</div></div>`);
  },

  // gantt (cream): attività × periodi; la barra occupa le colonne da..a della stessa riga di griglia.
  // { titolo, intro?, periodi: [..], attivita: [{ t, da, a, k? }] (da/a = 1-based), legenda?: [nomi per k], fonte? }
  gantt(s) {
    const n = s.periodi.length;
    let celle = `<div style="grid-row:1; grid-column:1;"></div>` + s.periodi.map((p, i) =>
      `<div style="grid-row:1; grid-column:${i + 2}; font-family:${F.mono}; font-size:11px; color:${C.muted}; text-align:center; padding-bottom:6px; border-bottom:2px solid ${C.line}; ${CELLA}">${esc(p)}</div>`).join("");
    s.attivita.forEach((x, r) => {
      const riga = r + 2;
      // il periodo scritto sotto l'attività: le barre non hanno testo, così chi legge (e il giudice
      // di contestualità, che legge solo il testo) vede comunque da quando a quando va l'attività
      const quando = x.da === x.a ? esc(s.periodi[x.da - 1]) : `${esc(s.periodi[x.da - 1])} → ${esc(s.periodi[x.a - 1])}`;
      celle += `<div style="grid-row:${riga}; grid-column:1; font-size:14px; line-height:1.3; color:${C.body}; padding:7px 14px 7px 0; border-bottom:1px solid ${C.line}; display:flex; justify-content:space-between; align-items:baseline; gap:10px; ${CELLA}"><span style="${CELLA}">${esc(x.t)}</span><span style="font-family:${F.mono}; font-size:11px; color:${C.muted}; white-space:nowrap; flex:0 0 auto;">${quando}</span></div>`;
      for (let c = 0; c < n; c++) celle += `<div style="grid-row:${riga}; grid-column:${c + 2}; border-bottom:1px solid ${C.line}; border-left:1px solid ${C.line};"></div>`;
      celle += `<div style="grid-row:${riga}; grid-column:${x.da + 1} / ${x.a + 2}; align-self:center; height:16px; margin:0 3px; border-radius:4px; background:${SERIE[((x.k || 1) - 1) % SERIE.length]};"></div>`;
    });
    const legenda = s.legenda ? `<div style="margin-top:16px;">${legendaSerie(s.legenda)}</div>` : "";
    return pagina(s, `<div style="display:grid; grid-template-columns:minmax(0,330px) repeat(${n},minmax(0,1fr)); align-items:stretch;">${celle}</div>${legenda}`);
  },

  // piramide (cream): livelli dall'alto (stretto) al basso (largo), testo dentro ogni livello.
  // { titolo, intro?, livelli: [{ h, d? }], nota? }
  piramide(s) {
    const n = s.livelli.length;
    const liv = s.livelli.map((x, i) => {
      const w = n > 1 ? 46 + (54 * i) / (n - 1) : 100;
      const ci = Math.min(RAMPA.length - 1, Math.round((i * (RAMPA.length - 1)) / Math.max(1, n - 1)));
      const chiaro = ci < 3;
      return `<div style="width:${w.toFixed(0)}%; background:${RAMPA[ci]}; border-radius:8px; padding:12px 20px; text-align:center; ${CELLA}">` +
        `<div style="font-family:${F.grot}; font-weight:600; font-size:18px; line-height:1.25; color:${chiaro ? "#FFFFFF" : C.ink};">${esc(x.h)}</div>` +
        (x.d ? `<div style="font-size:14px; line-height:1.4; margin-top:3px; color:${chiaro ? "rgba(255,255,255,.88)" : C.body};">${esc(x.d)}</div>` : "") + `</div>`;
    }).join("");
    const nota = s.nota ? `<p style="font-size:15px; line-height:1.5; color:${C.muted}; margin:18px 0 0; max-width:90ch;">${esc(s.nota)}</p>` : "";
    return pagina(s, `<div style="display:flex; flex-direction:column; align-items:center; gap:6px;">${liv}</div>${nota}`);
  },

  // ciclo / raggiera (cream). ciclo:true = fasi in sequenza che ripartono (PDCA): riga di fasi con
  // frecce e un ritorno disegnato solo con bordi. ciclo:false = elementi attorno a un centro: il
  // centro in testa, gli elementi in griglia. { titolo, intro?, centro?, ciclo?, nodi: [{ h, d? }], nota? }
  ciclo(s) {
    const n = s.nodi.length;
    const box = (x, i) => `<div style="flex:1; min-width:0; background:${C.card}; border:1px solid ${C.line}; border-radius:12px; padding:18px; ${CELLA}">` +
      (s.ciclo ? `<div style="font-family:${F.mono}; font-size:13px; color:${C.accent}; margin-bottom:10px;">${String(i + 1).padStart(2, "0")}</div>` : "") +
      `<div style="font-family:${F.grot}; font-weight:600; font-size:18px; color:${C.ink}; line-height:1.2; margin-bottom:6px;">${esc(x.h)}</div>` +
      (x.d ? `<div style="font-size:14px; color:${C.muted}; line-height:1.45;">${esc(x.d)}</div>` : "") + `</div>`;
    const centro = s.centro
      ? `<div style="display:flex; justify-content:center; margin-bottom:${s.ciclo ? 18 : 0}px;"><div style="background:${C.dark}; color:${C.headOnDark}; font-family:${F.grot}; font-weight:600; font-size:19px; line-height:1.25; text-align:center; border-radius:999px; padding:14px 30px; max-width:70%; ${CELLA}">${esc(s.centro)}</div></div>` : "";
    let corpo;
    if (s.ciclo) {
      const riga = s.nodi.map((x, i) => box(x, i) + (i < n - 1 ? `<div style="align-self:center; color:${C.accent}; font-size:22px; flex:0 0 auto;">→</div>` : "")).join("");
      // ritorno: U rovesciata fatta di soli bordi, sotto la riga (dall'ultima fase alla prima)
      const passo = 100 / (2 * n);
      const ritorno = `<div style="margin:0 ${passo.toFixed(2)}%; height:22px; border:2px solid ${C.accent}; border-top:none; border-radius:0 0 14px 14px;"></div>` +
        `<div style="font-family:${F.mono}; font-size:11px; letter-spacing:.16em; text-transform:uppercase; color:${C.accent}; text-align:center; margin-top:8px;">${esc(s.ritorno || "il ciclo riparte")}</div>`;
      corpo = centro + `<div style="display:flex; align-items:stretch; gap:8px;">${riga}</div>` + ritorno;
    } else {
      const col = n <= 4 ? n : 3;
      const raggi = `<div style="margin:0 ${(100 / (2 * col)).toFixed(2)}%; height:20px; border:2px solid ${C.line}; border-bottom:none; border-radius:12px 12px 0 0;"></div>`;
      const stelo = `<div style="width:2px; height:16px; background:${C.line}; margin:0 auto;"></div>`;
      corpo = centro + (s.centro ? stelo + raggi : "") +
        `<div style="display:grid; grid-template-columns:repeat(${col},minmax(0,1fr)); gap:14px;">${s.nodi.map((x, i) => box(x, i)).join("")}</div>`;
    }
    const nota = s.nota ? `<p style="font-size:15px; line-height:1.5; color:${C.muted}; margin:18px 0 0; max-width:90ch;">${esc(s.nota)}</p>` : "";
    return pagina(s, corpo + nota);
  },

  // organigramma (cream): radice, raccordo fatto di soli bordi, rami affiancati con voci opzionali.
  // { titolo, intro?, radice: { h, d? }, rami: [{ h, d?, voci?: [..] }], nota? }
  organigramma(s) {
    const n = s.rami.length;
    const radice = `<div style="display:flex; justify-content:center;"><div style="background:${C.dark}; border-radius:12px; padding:16px 28px; text-align:center; max-width:60%; ${CELLA}">` +
      `<div style="font-family:${F.grot}; font-weight:600; font-size:20px; line-height:1.2; color:${C.headOnDark};">${esc(s.radice.h)}</div>` +
      (s.radice.d ? `<div style="font-size:14px; color:${C.onDarkMuted}; margin-top:4px;">${esc(s.radice.d)}</div>` : "") + `</div></div>`;
    const stelo = `<div style="width:2px; height:18px; background:${C.taupe2}; margin:0 auto;"></div>`;
    const raccordo = n > 1 ? `<div style="margin:0 ${(100 / (2 * n)).toFixed(2)}%; height:16px; border:2px solid ${C.taupe2}; border-bottom:none;"></div>` : stelo;
    const rami = s.rami.map((x) =>
      `<div style="min-width:0; background:${C.card}; border:1px solid ${C.line}; border-top:3px solid ${C.accent}; border-radius:10px; padding:14px; ${CELLA}">` +
      `<div style="font-family:${F.grot}; font-weight:600; font-size:16px; line-height:1.25; color:${C.ink}; text-align:center;">${esc(x.h)}</div>` +
      (x.d ? `<div style="font-size:13px; color:${C.muted}; text-align:center; margin-top:3px; line-height:1.35;">${esc(x.d)}</div>` : "") +
      (x.voci?.length ? `<div style="margin-top:10px;">${x.voci.map((v) => `<div style="display:flex; gap:8px; align-items:baseline; font-size:13px; line-height:1.4; color:${C.body}; padding:3px 0;"><span style="color:${C.accent};">·</span><span style="${CELLA}">${esc(v)}</span></div>`).join("")}</div>` : "") +
      `</div>`).join("");
    const nota = s.nota ? `<p style="font-size:15px; line-height:1.5; color:${C.muted}; margin:18px 0 0; max-width:90ch;">${esc(s.nota)}</p>` : "";
    return pagina(s, radice + stelo + raccordo + `<div style="display:grid; grid-template-columns:repeat(${n},minmax(0,1fr)); gap:12px;">${rami}</div>` + nota);
  },

  // calcolo svolto (cream): dato × fattore [× secondo fattore] [÷ divisore] = risultato, riga per riga.
  // I RISULTATI LI CALCOLA IL GENERATORE dai fattori (mai trascritti): una tabella non deve poter mentire.
  // { titolo, intro?, etichette?: { r, a, ef, k?, d? }, unita?, dec?, totale?: eti | false,
  //   righe: [{ l, n?, a, au, ef, efu, k?, ku?, d?, du? }], piede?, fonte? }
  calcolo(s) {
    const ru = s.unita ?? "kg CO2e", e = s.etichette ?? {};
    const hasK = s.righe.some((r) => r.k != null), hasD = s.righe.some((r) => r.d != null);
    const fr = (v) => (s.dec != null ? numDec(v, s.dec) : numRis(v));
    const tot = s.righe.reduce((t, r) => t + valRiga(r), 0);
    const th = (t, dx) => `<th style="text-align:${dx ? "right" : "left"}; font-family:${F.mono}; font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:${C.accent}; padding:0 12px 10px; border-bottom:2px solid ${C.line}; ${CELLA}">${esc(t)}</th>`;
    const td = (v, u) => `<td style="padding:10px 12px; border-bottom:1px solid ${C.line}; text-align:right; font-size:15px; color:${C.body}; font-variant-numeric:tabular-nums; vertical-align:top; ${CELLA}">${v}${u ? ` <span style="font-size:12px; color:${C.muted};">${esc(u)}</span>` : ""}</td>`;
    const righe = s.righe.map((r) =>
      `<tr><td style="padding:10px 12px; border-bottom:1px solid ${C.line}; font-size:15px; font-weight:600; color:${C.ink}; line-height:1.35; vertical-align:top; ${CELLA}">${esc(r.l)}${r.n ? `<div style="font-weight:400; font-size:12.5px; color:${C.muted}; margin-top:2px;">${esc(r.n)}</div>` : ""}</td>` +
      td(numDec(r.a, 6), r.au) + td(numDec(r.ef, 4), r.efu) +
      (hasK ? td(r.k == null ? "—" : numDec(r.k, 4), r.k == null ? "" : r.ku) : "") +
      (hasD ? td(r.d == null ? "—" : numDec(r.d, 4), r.d == null ? "" : r.du) : "") +
      `<td style="padding:10px 12px; border-bottom:1px solid ${C.line}; text-align:right; font-family:${F.grot}; font-weight:600; font-size:16px; color:${C.ink}; font-variant-numeric:tabular-nums; vertical-align:top; ${CELLA}">${fr(valRiga(r))} <span style="font-family:${F.sans}; font-weight:400; font-size:12px; color:${C.muted};">${esc(ru)}</span></td></tr>`).join("");
    const colonne = 3 + (hasK ? 1 : 0) + (hasD ? 1 : 0);
    const piedeTab = s.totale !== false && (s.righe.length > 1 || s.totale)
      ? `<tfoot><tr><td colspan="${colonne}" style="padding:12px; font-family:${F.mono}; font-size:12px; letter-spacing:.1em; text-transform:uppercase; color:${C.accent}; ${CELLA}">${esc(s.totale || "Totale")}</td><td style="padding:12px; text-align:right; font-family:${F.grot}; font-weight:700; font-size:19px; color:${C.ink}; font-variant-numeric:tabular-nums; ${CELLA}">${fr(tot)} <span style="font-family:${F.sans}; font-weight:400; font-size:12px; color:${C.muted};">${esc(ru)}</span></td></tr></tfoot>` : "";
    const tonn = ru === "kg CO2e" && tot >= 1000
      ? `<div style="margin-top:14px; font-size:16px; color:${C.body}; ${CELLA}">${numRis(tot)} kg CO2e ÷ 1.000 = <strong style="font-family:${F.grot}; color:${C.accent};">${numTon(tot)} t CO2e</strong></div>` : "";
    const formula = `<div style="font-size:15px; color:${C.body}; margin:0 0 16px; ${CELLA}"><span style="font-family:${F.mono}; font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:${C.accent};">${esc(e.r || "Emissioni")}</span> = <strong>${esc(e.a || "Dato di attività")}</strong> × <strong>${esc(e.ef || "Fattore di emissione")}</strong>${hasK ? ` × <strong>${esc(e.k || "Secondo fattore")}</strong>` : ""}${hasD ? ` ÷ <strong>${esc(e.d || "Divisore")}</strong>` : ""}</div>`;
    const tabella = `<table style="width:100%; border-collapse:collapse; table-layout:auto;"><thead><tr>${th("Voce")}${th(e.a || "Dato di attività", 1)}${th("× " + (e.ef || "Fattore di emissione"), 1)}${hasK ? th("× " + (e.k || "Secondo fattore"), 1) : ""}${hasD ? th("÷ " + (e.d || "Divisore"), 1) : ""}${th("= " + (e.r || "Emissioni"), 1)}</tr></thead><tbody>${righe}</tbody>${piedeTab}</table>`;
    const piede = s.piede ? `<p style="font-size:15px; line-height:1.5; color:${C.muted}; margin:14px 0 0; max-width:95ch;">${esc(s.piede)}</p>` : "";
    return pagina(s, formula + tabella + tonn + piede);
  },

  // calcolatore interattivo «Prova tu» (cream): l'allievo cambia i dati di attività e il totale si ricalcola.
  // La slide nasce GIÀ COMPILATA coi valori dell'esempio (senza script è una tabella completa: è ciò che
  // vedono gate, giudice e fotogrammi di collaudo). Lo script sta DENTRO la <section> (l'ingest tiene solo
  // quella) e gira nell'iframe isolato del player: non vede la piattaforma né il tracciamento del tempo.
  // { titolo, intro?, unita?, righe: [{ l, v, u, ef, efu }], piede?, fonte? }
  simulatore(s) {
    const ru = s.unita ?? "kg CO2e";
    const tot = s.righe.reduce((t, r) => t + r.v * r.ef, 0);
    const th = (t, dx) => `<th style="text-align:${dx ? "right" : "left"}; font-family:${F.mono}; font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:${C.accent}; padding:0 12px 10px; border-bottom:2px solid ${C.line}; ${CELLA}">${esc(t)}</th>`;
    const unita = (u) => `<span style="font-size:12px; color:${C.muted};">${esc(u)}</span>`;
    const righe = s.righe.map((r, i) =>
      `<tr><td style="padding:9px 12px; border-bottom:1px solid ${C.line}; font-size:15px; font-weight:600; color:${C.ink}; line-height:1.35; ${CELLA}">${esc(r.l)}</td>` +
      `<td style="padding:9px 12px; border-bottom:1px solid ${C.line}; text-align:right; white-space:nowrap;"><input data-sim="${i}" data-ef="${r.ef}" data-v="${r.v}" type="number" inputmode="decimal" min="0" step="any" value="${r.v}" aria-label="${esc(r.l)}" style="box-sizing:border-box; width:150px; padding:8px 10px; font-family:${F.grot}; font-weight:600; font-size:16px; text-align:right; color:${C.ink}; background:${C.card}; border:2px solid ${C.accent}; border-radius:8px;"> ${unita(r.u)}</td>` +
      `<td style="padding:9px 12px; border-bottom:1px solid ${C.line}; text-align:right; font-size:15px; color:${C.body}; font-variant-numeric:tabular-nums; ${CELLA}">${numDec(r.ef, 4)} ${unita(r.efu)}</td>` +
      `<td style="padding:9px 12px; border-bottom:1px solid ${C.line}; text-align:right; font-family:${F.grot}; font-weight:600; font-size:16px; color:${C.ink}; font-variant-numeric:tabular-nums; ${CELLA}"><span data-ris="${i}">${numRis(r.v * r.ef)}</span> ${unita(ru)}</td></tr>`).join("");
    const guida = `<div style="display:flex; gap:10px; align-items:baseline; margin:0 0 16px; font-size:15px; color:${C.body}; ${CELLA}"><span style="font-family:${F.mono}; font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:${C.card}; background:${C.accent}; padding:4px 9px; border-radius:5px; flex:0 0 auto;">Prova tu</span><span>Modifica i dati di attività nelle caselle e osserva come cambia il risultato.</span></div>`;
    const tabella = `<table style="width:100%; border-collapse:collapse;"><thead><tr>${th("Voce")}${th("Dato di attività", 1)}${th("× Fattore di emissione", 1)}${th("= Emissioni", 1)}</tr></thead><tbody>${righe}</tbody>` +
      `<tfoot><tr><td colspan="3" style="padding:12px; font-family:${F.mono}; font-size:12px; letter-spacing:.1em; text-transform:uppercase; color:${C.accent};">Totale</td><td style="padding:12px; text-align:right; font-family:${F.grot}; font-weight:700; font-size:19px; color:${C.ink}; font-variant-numeric:tabular-nums; ${CELLA}"><span data-tot>${numRis(tot)}</span> ${unita(ru)}</td></tr></tfoot></table>`;
    // riga delle tonnellate ad altezza FISSA: compare e scompare senza muovere la slide
    const stileTon = `font-family:${F.grot}; color:${C.accent};`;
    const tonn = ru === "kg CO2e"
      ? `<div data-ton data-stile="${stileTon}" style="margin-top:12px; min-height:24px; font-size:16px; color:${C.body};">${tot >= 1000 ? `${numRis(tot)} kg CO2e ÷ 1.000 = <strong style="${stileTon}">${numTon(tot)} t CO2e</strong>` : ""}</div>` : "";
    const ripristina = `<div style="margin-top:12px;"><button data-reset type="button" style="font-family:${F.sans}; font-size:14px; font-weight:600; color:${C.accent}; background:transparent; border:1px solid ${C.accent}; border-radius:8px; padding:7px 14px; cursor:pointer;">Ripristina i valori dell’esempio</button></div>`;
    const piede = s.piede ? `<p style="font-size:15px; line-height:1.5; color:${C.muted}; margin:12px 0 0; max-width:95ch;">${esc(s.piede)}</p>` : "";
    // stessi arrotondamenti di numRis/numTon, riscritti per il browser (lo script non vede questo file)
    const script = "<script>(function(){var S=document.currentScript.closest('section');if(!S)return;" +
      "function nf(v,d){return v.toLocaleString('it-IT',{maximumFractionDigits:d,useGrouping:'always'});}" +
      "function rs(v){var a=Math.abs(v);return nf(v,a>=100?0:a>=10?1:a>=1?2:3);}" +
      "function tn(k){var t=k/1000,a=Math.abs(t);return nf(t,a>=100?1:a>=1?2:3);}" +
      "var ins=S.querySelectorAll('input[data-sim]'),T=S.querySelector('[data-tot]'),N=S.querySelector('[data-ton]');" +
      "function upd(){var tot=0;ins.forEach(function(el){var v=parseFloat(String(el.value).replace(',','.'));if(!(v>=0))v=0;" +
      "var r=v*Number(el.getAttribute('data-ef'));tot+=r;S.querySelector('[data-ris=\"'+el.getAttribute('data-sim')+'\"]').textContent=rs(r);});" +
      "T.textContent=rs(tot);if(N){N.textContent='';if(tot>=1000){N.appendChild(document.createTextNode(rs(tot)+' kg CO2e ÷ 1.000 = '));" +
      "var b=document.createElement('strong');b.setAttribute('style',N.getAttribute('data-stile'));b.textContent=tn(tot)+' t CO2e';N.appendChild(b);}}}" +
      "ins.forEach(function(el){el.addEventListener('input',upd);});" +
      "S.querySelector('[data-reset]').addEventListener('click',function(){ins.forEach(function(el){el.value=el.getAttribute('data-v');});upd();});})();</script>";
    // lo script va DENTRO la section: si inserisce prima della sua chiusura
    const html = pagina(s, guida + tabella + tonn + ripristina + piede);
    const ix = html.lastIndexOf("</section>");
    return html.slice(0, ix) + script + html.slice(ix);
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
