// Linter copioni — la precisione redazionale diventa verificabile a macchina (Fase 0.5).
// BLOCCANTE prima di ogni generazione: exit 1 se ci sono ERRORI.
//
// ERRORI (bloccanti):
//   E1  ID non canonico / duplicato / di un altro corso
//   E2  "audit"/"auditor" nelle PRIME 10 PAROLE del testo slide (parola ambigua a freddo:
//       il TTS decide la pronuncia dal contesto precedente — regola nata dal difetto v12)
//   E3  numero/sigla nel testo NON coperto dal glossario (il TTS inventerebbe la lettura)
//   E4  caratteri anomali (simboli, emoji, markup) che il TTS leggerebbe o storpierebbe
//   E5  ANTI-VERBATIM: sequenza di >=8 parole in comune col testo della norma
//       (testonorme/*<corso>*.txt) — protezione copyright verificata a macchina
//   E6  BUDGET: parole del modulo fuori dal budget ±5% (minuti modulo × 60 × 2,35 p/s
//       misurati sul M1 reale) — richiede budget.minutiPerModulo nei copioni
//   E7  COPERTURA: concetto chiave del modulo (produzione/<corso>/copertura.json,
//       checklist derivata dallo skeleton) assente dai copioni del modulo
// AVVISI (non bloccanti):
//   W1  frase oltre 35 parole (prosodia faticosa; la ricetta la spezza comunque a 213 char)
//   W2  frase lunga (>15 parole) senza virgole (respiro assente)
//
// Uso: node scripts/produzione/lint-copioni.mjs <corso> [--modulo mNN]

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirs, readJson, slideIds } from "./lib.mjs";

const PAROLE_AL_SECONDO = 2.35; // misurato: M1 reale, 8.044 parole = 57,0 min (2026-07-03)
const NGRAM_VERBATIM = 8;

const corso = process.argv[2];
const modIx = process.argv.indexOf("--modulo");
const modulo = modIx !== -1 ? process.argv[modIx + 1] : null;
if (!corso) {
  console.error("Uso: node scripts/produzione/lint-copioni.mjs <corso> [--modulo mNN]");
  process.exit(2);
}

const d = dirs(corso);
const copioni = readJson(d.copioni);
const glossario = readJson(d.glossario, { map: {} });

let errori = 0, avvisi = 0;
const err = (id, code, msg) => { console.log(`  ERRORE ${code} [${id}] ${msg}`); errori++; };
const warn = (id, code, msg) => { console.log(`  avviso ${code} [${id}] ${msg}`); avvisi++; };

// E1 — validazione ID (lancia su formato/duplicati/corso sbagliato)
try {
  slideIds(copioni, corso);
} catch (e) {
  err("-", "E1", e.message);
}

const AMBIGUE = /\b(audit|auditor)\b/i;
const CHAR_OK = /^[\wàèéìòùÀÈÉÌÒÙ\s.,;:!?'"()«»%–—-]+$/u;

// il glossario si applica PRIMA dei check sui caratteri: "ISO/IEC TS 17012" diventa
// la sua forma parlata, quindi lo slash della sigla non è un carattere anomalo
function conGlossario(t) {
  for (const k of Object.keys(glossario.map).sort((a, b) => b.length - a.length))
    t = t.split(k).join(glossario.map[k]);
  return t;
}

// E5 — indice n-grammi della norma (forma canonica: minuscole, senza accenti/punteggiatura)
const canon = (t) =>
  t.toLowerCase()
    .replace(/[àá]/g, "a").replace(/[èé]/g, "e").replace(/[ìí]/g, "i")
    .replace(/[òó]/g, "o").replace(/[ùú]/g, "u")
    .replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
let normaShingles = null;
// match ESATTO ISO<corso> seguito da non-cifra: "9001" NON deve pescare ISO19011-2026.txt
const normaFile = existsSync("testonorme")
  ? readdirSync("testonorme").find((f) => f.endsWith(".txt") && new RegExp(`^ISO${corso}(\\D|$)`).test(f.replace(/\s+/g, "")))
  : null;
if (normaFile) {
  const parole = canon(readFileSync(`testonorme/${normaFile}`, "utf8"));
  normaShingles = new Set();
  for (let i = 0; i + NGRAM_VERBATIM <= parole.length; i++)
    normaShingles.add(parole.slice(i, i + NGRAM_VERBATIM).join(" "));
  console.log(`E5: confronto anti-verbatim con testonorme/${normaFile} (${parole.length} parole, ${normaShingles.size} sequenze)`);
} else {
  console.log(`E5: NESSUN testo norma trovato per "${corso}" in testonorme/ — check verbatim SALTATO`);
}

const paroleModulo = {}; // per E6

for (const s of copioni.slides) {
  if (modulo && !s.id.includes(`_${modulo}_`)) continue;
  const t = conGlossario(s.testo);
  const mod = (s.id.match(/_(m\d\d)_/) || [])[1];
  if (mod) paroleModulo[mod] = (paroleModulo[mod] || 0) + s.testo.split(/\s+/).filter(Boolean).length;

  // E5 — anti-verbatim (sul testo ORIGINALE, non glossariato: la norma non ha forme parlate)
  if (normaShingles) {
    const parole = canon(s.testo);
    for (let i = 0; i + NGRAM_VERBATIM <= parole.length; i++) {
      const sh = parole.slice(i, i + NGRAM_VERBATIM).join(" ");
      if (normaShingles.has(sh)) {
        err(s.id, "E5", `sequenza verbatim dalla norma: "${sh.slice(0, 70)}…"`);
        i += NGRAM_VERBATIM - 1; // non segnalare la stessa frase N volte
      }
    }
  }

  // E2 — parola ambigua a freddo
  const prime10 = t.split(/\s+/).slice(0, 10).join(" ");
  if (AMBIGUE.test(prime10))
    err(s.id, "E2", `"audit/auditor" nelle prime 10 parole: "${prime10.slice(0, 60)}…"`);

  // E3 — numeri non coperti dal glossario
  for (const m of t.matchAll(/\d[\d.,-]*/g)) {
    const num = m[0].replace(/[.,]$/, "");
    const coperto = Object.keys(glossario.map).some((k) => k.includes(num));
    if (!coperto) err(s.id, "E3", `numero "${num}" senza voce di glossario`);
  }

  // E4 — caratteri anomali
  if (!CHAR_OK.test(t)) {
    const strani = [...new Set([...t].filter((c) => !CHAR_OK.test(c)))].join(" ");
    err(s.id, "E4", `caratteri anomali: ${strani}`);
  }

  // W1/W2 — stile frasi
  for (const fr of t.split(/(?<=[.!?])\s+/)) {
    const parole = fr.split(/\s+/).length;
    if (parole > 35) warn(s.id, "W1", `frase da ${parole} parole: "${fr.slice(0, 50)}…"`);
    else if (parole > 15 && !fr.includes(","))
      warn(s.id, "W2", `frase da ${parole} parole senza virgole: "${fr.slice(0, 50)}…"`);
  }
}

// E6 — budget parole per modulo (a 2,35 p/s misurati)
const minutiPerModulo = copioni.budget?.minutiPerModulo || null;
if (minutiPerModulo) {
  for (const [mod, parole] of Object.entries(paroleModulo)) {
    const minuti = minutiPerModulo[mod];
    if (!minuti) { err(mod, "E6", `modulo senza budget minuti in budget.minutiPerModulo`); continue; }
    const target = minuti * 60 * PAROLE_AL_SECONDO;
    const scarto = (parole - target) / target;
    if (Math.abs(scarto) > 0.05)
      err(mod, "E6", `${parole} parole vs target ${Math.round(target)} (${minuti} min): scarto ${(scarto * 100).toFixed(1)}% (limite ±5%)`);
    else
      console.log(`  E6 ok [${mod}] ${parole} parole ≈ ${(parole / PAROLE_AL_SECONDO / 60).toFixed(1)} min (target ${minuti})`);
  }
} else {
  console.log("E6: budget.minutiPerModulo assente dai copioni — check budget SALTATO");
}

// E7 — copertura concetti chiave (produzione/<corso>/copertura.json: { "mNN": ["concetto", ...] })
const coperturaPath = `produzione/${corso}/copertura.json`;
if (existsSync(coperturaPath)) {
  const copertura = JSON.parse(readFileSync(coperturaPath, "utf8"));
  for (const [mod, concetti] of Object.entries(copertura)) {
    if (modulo && mod !== modulo) continue;
    const testoMod = canon(copioni.slides
      .filter((s) => s.id.includes(`_${mod}_`)).map((s) => s.testo).join(" ")).join(" ");
    for (const c of concetti)
      if (!testoMod.includes(canon(c).join(" ")))
        err(mod, "E7", `concetto chiave assente: "${c}"`);
  }
} else {
  console.log(`E7: ${coperturaPath} assente — check copertura SALTATO`);
}

const n = copioni.slides.filter((s) => !modulo || s.id.includes(`_${modulo}_`)).length;
console.log(`\n${n} slide esaminate · ${errori} ERRORI · ${avvisi} avvisi`);
if (errori) {
  console.log("LINT FALLITO — correggere gli errori prima di generare.");
  process.exit(1);
}
console.log("LINT OK — copioni pronti per la generazione.");
