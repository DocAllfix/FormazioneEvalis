// Genera la BOZZA di copertura.json (gate E7) dai blocchi dello skeleton:
// per ogni modulo, i concetti chiave = i titoli dei blocchi argomenti (ripuliti).
// La bozza va POI curata a mano (concetti troppo generici tolti, termini tecnici aggiunti).
//
// Uso: node scripts/produzione/gen-copertura.mjs <corso> [--merge]
//   --merge: integra i moduli mancanti senza toccare quelli già curati

import { existsSync, readFileSync, writeFileSync } from "node:fs";

const corso = process.argv[2];
const merge = process.argv.includes("--merge");
if (!corso) { console.error("Uso: gen-copertura.mjs <corso> [--merge]"); process.exit(2); }

const md = readFileSync(`produzione/${corso}/struttura.md`, "utf8");
const out = {};
for (const sec of md.split(/### /).slice(1)) {
  const [head, ...righe] = sec.split("\n");
  const m = head.match(/^(M(\d+))/);
  if (!m) continue;
  const mod = `m${m[2].padStart(2, "0")}`;
  const concetti = [];
  for (const r of righe) {
    const b = r.trim().match(/^\d+\.\s+(.*?)\s*(?:\(\d+(?:\s*slide)?\))?\s*$/);
    if (!b) continue;
    // primo segmento del titolo del blocco, senza QUALSIASI parentesi/riferimento
    let c = b[1].split(/[:—]/)[0].replace(/\([^)]*\)/g, "").trim();
    c = c.replace(/\s+/g, " ").replace(/[,;]\s*$/, "");
    if (c.length >= 6 && !/^(sintesi|benvenut|bentornat|riepilogo|ripasso)/i.test(c)) concetti.push(c);
  }
  if (concetti.length) out[mod] = concetti;
}

const path = `produzione/${corso}/copertura.json`;
let finale = out;
if (merge && existsSync(path)) {
  const cur = JSON.parse(readFileSync(path, "utf8"));
  finale = { ...out, ...cur }; // i moduli già curati vincono
}
writeFileSync(path, JSON.stringify(finale, null, 1) + "\n", "utf8");
console.log(`${path}: ${Object.keys(finale).length} moduli, ` +
  Object.entries(finale).map(([m, c]) => `${m}:${c.length}`).join(" "));
