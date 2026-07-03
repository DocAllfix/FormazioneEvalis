// Linter copioni — la precisione redazionale diventa verificabile a macchina (Fase 0.5).
// BLOCCANTE prima di ogni generazione: exit 1 se ci sono ERRORI.
//
// ERRORI (bloccanti):
//   E1  ID non canonico / duplicato / di un altro corso
//   E2  "audit"/"auditor" nelle PRIME 10 PAROLE del testo slide (parola ambigua a freddo:
//       il TTS decide la pronuncia dal contesto precedente — regola nata dal difetto v12)
//   E3  numero/sigla nel testo NON coperto dal glossario (il TTS inventerebbe la lettura)
//   E4  caratteri anomali (simboli, emoji, markup) che il TTS leggerebbe o storpierebbe
// AVVISI (non bloccanti):
//   W1  frase oltre 35 parole (prosodia faticosa; la ricetta la spezza comunque a 213 char)
//   W2  frase lunga (>15 parole) senza virgole (respiro assente)
//
// Uso: node scripts/produzione/lint-copioni.mjs <corso> [--modulo mNN]

import { dirs, readJson, slideIds } from "./lib.mjs";

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

for (const s of copioni.slides) {
  if (modulo && !s.id.includes(`_${modulo}_`)) continue;
  const t = conGlossario(s.testo);

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

const n = copioni.slides.filter((s) => !modulo || s.id.includes(`_${modulo}_`)).length;
console.log(`\n${n} slide esaminate · ${errori} ERRORI · ${avvisi} avvisi`);
if (errori) {
  console.log("LINT FALLITO — correggere gli errori prima di generare.");
  process.exit(1);
}
console.log("LINT OK — copioni pronti per la generazione.");
