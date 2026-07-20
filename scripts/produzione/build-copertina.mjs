// COPERTINA + CHIUSURA CORSO — genera due slide di cornice per ogni corso (hero scuro,
// stile Evalis, adattato al tema del corso), da inserire nel deck di revisione.
// Copertina = <corso>_m00_s001.html (ordina PRIMA di m01); chiusura = <corso>_zzz_s001.html (DOPO m12).
// NON tocca build-slide.mjs. Uso: node scripts/produzione/build-copertina.mjs [<corso> ...] (default: tutti)
import fs from "node:fs";

const F = { mono: "'IBM Plex Mono',monospace", sans: "'IBM Plex Sans',sans-serif", grot: "'Space Grotesk',sans-serif" };
const TEMI = {
  ambra: { dark: "#231A12", accent: "#EA580C", head: "#F4EDE1", text: "#E6DCCB", muted: "#A0917B", line: "rgba(230,220,203,.16)", glow: "rgba(234,88,12,.20)" },
  navy:  { dark: "#15293C", accent: "#34D3C0", head: "#EAF1F5", text: "#C7D5E0", muted: "#8FA3B4", line: "rgba(220,232,240,.16)", glow: "rgba(52,211,192,.18)" },
};

// tabella corsi: standard, ruolo, materia, ore, moduli, lezioni, tema, edizione
const COURSES = {
  "19011":   { std: "ISO 19011:2026", ruolo: "Auditor di sistemi di gestione", materia: "Linee guida per l'audit dei sistemi di gestione", ore: 16, mod: 9, lez: 221, tema: "ambra", ed: "Edizione 2026" },
  "9001":    { std: "ISO 9001", ruolo: "Auditor / Lead Auditor", materia: "Sistemi di gestione per la Qualità", ore: 24, mod: 12, lez: 331, tema: "navy", ed: "" },
  "14001":   { std: "ISO 14001", ruolo: "Auditor / Lead Auditor", materia: "Sistemi di gestione Ambientale", ore: 24, mod: 12, lez: 331, tema: "ambra", ed: "" },
  "45001":   { std: "ISO 45001", ruolo: "Auditor / Lead Auditor", materia: "Salute e Sicurezza sul Lavoro", ore: 24, mod: 12, lez: 331, tema: "ambra", ed: "" },
  "27001":   { std: "ISO 27001", ruolo: "Auditor / Lead Auditor", materia: "Sicurezza delle Informazioni", ore: 24, mod: 12, lez: 331, tema: "navy", ed: "" },
  "22000":   { std: "ISO 22000", ruolo: "Auditor / Lead Auditor", materia: "Sicurezza Alimentare", ore: 24, mod: 12, lez: 331, tema: "navy", ed: "" },
  "37001":   { std: "ISO 37001", ruolo: "Auditor / Lead Auditor", materia: "Sistemi di gestione Anticorruzione", ore: 24, mod: 12, lez: 331, tema: "ambra", ed: "" },
  "42001":   { std: "ISO 42001", ruolo: "Auditor / Lead Auditor", materia: "Sistemi di gestione per l'Intelligenza Artificiale", ore: 24, mod: 12, lez: 331, tema: "navy", ed: "" },
  "50001":   { std: "ISO 50001", ruolo: "Auditor / Lead Auditor", materia: "Sistemi di gestione dell'Energia", ore: 24, mod: 12, lez: 331, tema: "ambra", ed: "" },
  "39001":   { std: "ISO 39001", ruolo: "Auditor / Lead Auditor", materia: "Sicurezza Stradale (RTS)", ore: 24, mod: 12, lez: 331, tema: "navy", ed: "" },
  "agg14001":{ std: "ISO 14001:2026", ruolo: "Aggiornamento Lead Auditor", materia: "Sistemi di gestione Ambientale · Edizione 2026", ore: 8, mod: 6, lez: 109, tema: "ambra", ed: "Aggiornamento" },
};

const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// stesso marchio "evalis / ACADEMY" del footer delle slide (build-slide footer(), in basso a sinistra)
function wordmark(C) {
  return `<div style="display:flex; flex-direction:column; line-height:1; gap:5px;">
    <div style="font-family:${F.grot}; font-weight:700; font-size:16px; letter-spacing:-.02em; color:${C.accent};">evalis</div>
    <div style="font-family:${F.mono}; font-size:8px; letter-spacing:.34em; color:${C.muted};">ACADEMY</div>
  </div>`;
}
// footer identico allo stile slide: marchio a sinistra + etichetta a destra
function footer(C, label) {
  return `<div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid ${C.line}; padding-top:22px; position:relative; z-index:1;">
    ${wordmark(C)}
    <span style="font-family:${F.mono}; font-size:10px; letter-spacing:.2em; text-transform:uppercase; color:${C.muted};">${esc(label)}</span>
  </div>`;
}

function spec(C, n, l) {
  return `<div style="display:flex; flex-direction:column; gap:8px;">
    <div style="font-family:${F.grot}; font-weight:700; font-size:44px; line-height:.9; letter-spacing:-.02em; color:${C.head};">${esc(n)}</div>
    <div style="font-family:${F.mono}; font-size:11px; letter-spacing:.22em; text-transform:uppercase; color:${C.muted};">${esc(l)}</div>
  </div>`;
}

function shell(inner, C) {
  return `<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#E7DECD;"><section data-screen-label="cover" style="box-sizing:border-box; position:relative; overflow:hidden; width:1280px; min-height:720px; background:${C.dark}; font-family:${F.sans}; display:flex; flex-direction:column; padding:60px 80px;">
<div style="position:absolute; top:-160px; right:-120px; width:520px; height:520px; border-radius:50%; background:radial-gradient(circle, ${C.glow} 0%, rgba(0,0,0,0) 70%); pointer-events:none;"></div>
${inner}</section></body></html>`;
}

function copertina(code, s) {
  const C = TEMI[s.tema];
  const kicker = s.ed === "Aggiornamento" ? "CORSO DI AGGIORNAMENTO" : "CORSO DI CERTIFICAZIONE";
  const inner = `
  <div style="display:flex; justify-content:space-between; align-items:flex-start; position:relative; z-index:1;">
    <div style="font-family:${F.mono}; font-size:12px; letter-spacing:.26em; text-transform:uppercase; color:${C.accent};">${kicker}</div>
    <div style="font-family:${F.mono}; font-size:11px; letter-spacing:.2em; text-transform:uppercase; color:${C.muted};">Percorso e-learning${s.ed ? " · " + esc(s.ed) : ""}</div>
  </div>
  <div style="flex:1; display:flex; flex-direction:column; justify-content:center; padding:30px 0; position:relative; z-index:1;">
    <div style="font-family:${F.mono}; font-size:14px; letter-spacing:.28em; text-transform:uppercase; color:${C.accent}; margin-bottom:20px;">${esc(s.ruolo)}</div>
    <h1 style="font-family:${F.grot}; font-weight:700; font-size:128px; line-height:.92; letter-spacing:-.03em; margin:0; color:${C.head};">${esc(s.std)}</h1>
    <div style="width:96px; height:4px; background:${C.accent}; border-radius:2px; margin:30px 0 26px;"></div>
    <div style="font-family:${F.grot}; font-weight:600; font-size:34px; line-height:1.15; letter-spacing:-.01em; color:${C.text}; max-width:34ch;">${esc(s.materia)}</div>
  </div>
  <div style="display:flex; gap:56px; align-items:flex-end; margin-bottom:26px; position:relative; z-index:1;">
    ${spec(C, s.ore + "h", "Monte ore")}
    ${spec(C, s.mod, "Moduli")}
    ${spec(C, s.lez, "Lezioni")}
    ${spec(C, "100%", "Online")}
  </div>
  ${footer(C, "Auditor & Lead Auditor")}`;
  return shell(inner, C);
}

function chiusura(code, s) {
  const C = TEMI[s.tema];
  const inner = `
  <div style="display:flex; justify-content:space-between; align-items:flex-start; position:relative; z-index:1;">
    <div style="font-family:${F.mono}; font-size:12px; letter-spacing:.26em; text-transform:uppercase; color:${C.accent};">Fine del corso</div>
    <div style="font-family:${F.mono}; font-size:11px; letter-spacing:.2em; text-transform:uppercase; color:${C.muted};">${esc(s.std)}</div>
  </div>
  <div style="flex:1; display:flex; flex-direction:column; justify-content:center; padding:30px 0; position:relative; z-index:1;">
    <div style="font-family:${F.mono}; font-size:14px; letter-spacing:.28em; text-transform:uppercase; color:${C.accent}; margin-bottom:20px;">Hai completato</div>
    <h1 style="font-family:${F.grot}; font-weight:700; font-size:104px; line-height:.94; letter-spacing:-.03em; margin:0; color:${C.head};">${esc(s.std)}</h1>
    <div style="font-family:${F.grot}; font-weight:600; font-size:28px; color:${C.text}; margin-top:20px; max-width:40ch;">${esc(s.materia)}</div>
    <p style="font-family:${F.sans}; font-size:19px; line-height:1.55; color:${C.muted}; margin:26px 0 0; max-width:66ch;">Prosegui con il <b style="color:${C.text}; font-weight:600;">quiz finale</b> per verificare l'apprendimento. Al superamento della soglia riceverai l'<b style="color:${C.text}; font-weight:600;">attestato di frequenza</b>, dopo revisione. Buon lavoro, e ci vediamo alla certificazione.</p>
  </div>
  ${footer(C, "Grazie · Evalis Academy")}`;
  return shell(inner, C);
}

const targets = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const list = targets.length ? targets : Object.keys(COURSES);
for (const code of list) {
  const s = COURSES[code];
  if (!s) { console.error(`✗ corso sconosciuto: ${code}`); continue; }
  const dir = `slide-in/${code}`;
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(`${dir}/${code}_m00_s001.html`, copertina(code, s));
  fs.writeFileSync(`${dir}/${code}_zzz_s001.html`, chiusura(code, s));
  console.log(`✓ ${code} (${s.tema}) — copertina + chiusura`);
}
