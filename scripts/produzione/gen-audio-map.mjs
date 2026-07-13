// Ponte era-Azure -> toolkit avatar: genera produzione/<corso>/audio-map.json
// dai registri Azure _log/audio-mNN.json (fonte autorevole delle durate reali).
// Formato: { "<id>": { "duration": <s>, "sha": "<wav_sha>" }, "_meta": {...} }
// Blindature: ogni slide dei copioni DEVE avere una riga di registro (audio lockato),
// nessun ID orfano nei registri, ID canonici. Senza questo file make-shards /
// render-avatar / build-course rifiutano di lavorare (by design: render SOLO dopo lock).
//
// Uso: node scripts/produzione/gen-audio-map.mjs <corso> | --all

import fs from "node:fs";
import path from "node:path";
import { dirs, readJson, writeJson, slideIds } from "./lib.mjs";

const CORSI = ["19011", "9001", "45001", "27001", "14001", "22000", "37001", "42001",
  "50001", "39001", "agg14001"];

function genera(corso) {
  const d = dirs(corso);
  const copioni = readJson(d.copioni);
  const ids = slideIds(copioni, corso);

  const logDir = path.join(d.base, "_log");
  const registri = fs.readdirSync(logDir).filter((f) => /^audio-m\d{2}\.json$/.test(f)).sort();
  if (!registri.length) throw new Error(`${corso}: nessun registro audio in ${logDir}`);

  const map = {};
  let standard;
  for (const f of registri) {
    const reg = readJson(path.join(logDir, f));
    standard ??= reg.standard;
    for (const [sid, v] of Object.entries(reg.slide ?? {})) {
      if (map[sid]) throw new Error(`${corso}: ${sid} presente in due registri`);
      if (!(v.durata_s > 0)) throw new Error(`${corso}: ${sid} senza durata_s valida nel registro`);
      map[sid] = { duration: v.durata_s, sha: v.wav_sha };
    }
  }

  const mancanti = ids.filter((id) => !map[id]);
  if (mancanti.length)
    throw new Error(`${corso}: ${mancanti.length} slide dei copioni SENZA audio nei registri: ${mancanti.slice(0, 5).join(", ")}…`);
  const orfani = Object.keys(map).filter((id) => !ids.includes(id));
  if (orfani.length)
    throw new Error(`${corso}: ${orfani.length} ID nei registri ma NON nei copioni: ${orfani.slice(0, 5).join(", ")}…`);

  const totaleS = ids.reduce((a, id) => a + map[id].duration, 0);
  const out = Object.fromEntries(ids.map((id) => [id, map[id]])); // ordine dei copioni
  out._meta = {
    fonte: "_log/audio-mNN.json (registri Azure)",
    standard,
    slide: ids.length,
    totale_s: Math.round(totaleS * 10) / 10,
    generato: new Date().toISOString().slice(0, 10),
  };
  writeJson(d.audioMap, out);
  console.log(`OK ${corso}: ${ids.length} slide, ${(totaleS / 60).toFixed(1)} min, standard "${standard}" -> ${d.audioMap}`);
  return ids.length;
}

const arg = process.argv[2];
if (!arg) {
  console.error("Uso: node scripts/produzione/gen-audio-map.mjs <corso> | --all");
  process.exit(2);
}
let tot = 0;
for (const corso of arg === "--all" ? CORSI : [arg]) tot += genera(corso);
console.log(`\nTOTALE: ${tot} slide mappate`);
