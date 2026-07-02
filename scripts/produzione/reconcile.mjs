// Riconciliazione monte-ore (fase AUDIO-PRIMA, passo e): confronta le durate REALI
// (audio-map.json) col target e indica le slide da allungare. NON modifica nulla.
//
// Uso:  node scripts/produzione/reconcile.mjs <corso> --target-min 60 [--modulo m01]
// Exit: 0 se somma >= target, 1 se sotto (con lista slide più corte da estendere).

import { dirs, readJson } from "./lib.mjs";

const corso = process.argv[2];
const targetIx = process.argv.indexOf("--target-min");
const moduloIx = process.argv.indexOf("--modulo");
if (!corso || targetIx === -1) {
  console.error("Uso: node scripts/produzione/reconcile.mjs <corso> --target-min <minuti> [--modulo mNN]");
  process.exit(2);
}
const targetMin = Number(process.argv[targetIx + 1]);
const modulo = moduloIx !== -1 ? process.argv[moduloIx + 1] : null;

const d = dirs(corso);
const audioMap = readJson(d.audioMap);
const copioni = readJson(d.copioni);

const ids = copioni.slides
  .map((s) => s.id)
  .filter((id) => !modulo || id.includes(`_${modulo}_`));
const missing = ids.filter((id) => !audioMap[id]);
if (missing.length) {
  console.error(`ERRORE: audio mancante per ${missing.length} slide: ${missing.join(", ")}`);
  process.exit(1);
}

const rows = ids.map((id) => ({ id, sec: audioMap[id].duration, words: audioMap[id].words }));
const totalSec = rows.reduce((a, r) => a + r.sec, 0);
const targetSec = targetMin * 60;
const wps = rows.reduce((a, r) => a + r.words, 0) / totalSec;

for (const r of rows) console.log(`  ${r.id}  ${r.sec.toFixed(1).padStart(7)}s  (${r.words} parole)`);
console.log(`\nTotale: ${(totalSec / 60).toFixed(1)} min · target: ${targetMin} min · velocità reale: ${wps.toFixed(2)} parole/s`);

if (totalSec >= targetSec) {
  console.log(`OK · margine +${((totalSec - targetSec) / 60).toFixed(1)} min → si può fare il LOCK dell'audio.`);
  process.exit(0);
}

const deficitSec = targetSec - totalSec;
const shortest = [...rows].sort((a, b) => a.sec - b.sec).slice(0, Math.max(3, Math.ceil(rows.length / 4)));
console.log(`\nSOTTO TARGET di ${(deficitSec / 60).toFixed(1)} min (~${Math.ceil(deficitSec * wps)} parole da aggiungere).`);
console.log(`Slide più corte da allungare (poi rigenerare SOLO queste con gen-audio --only --force):`);
for (const r of shortest) console.log(`  - ${r.id} (${r.sec.toFixed(0)}s)`);
process.exit(1);
