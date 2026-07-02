// Sharding statico per il fan-out sulle GPU: divide gli ID ANCORA DA RENDERIZZARE
// in N liste (una per GPU), nessuno stato condiviso. Idempotente e ripartibile:
// "fatto" = esiste clips/<id>.mp4.ok (validato) oppure l'ID è già in clip-map.json.
//
// Uso: node scripts/produzione/make-shards.mjs <corso> --gpus 4

import fs from "node:fs";
import path from "node:path";
import { dirs, readJson, slideIds } from "./lib.mjs";

const corso = process.argv[2];
const gpusIx = process.argv.indexOf("--gpus");
if (!corso) {
  console.error("Uso: node scripts/produzione/make-shards.mjs <corso> --gpus <N>");
  process.exit(2);
}
const gpus = gpusIx !== -1 ? Number(process.argv[gpusIx + 1]) : 1;

const d = dirs(corso);
const copioni = readJson(d.copioni);
const audioMap = readJson(d.audioMap);
const clipMap = readJson(d.clipMap, {});

const all = slideIds(copioni, corso);
const noAudio = all.filter((id) => !audioMap[id]);
if (noAudio.length) {
  console.error(`ERRORE: ${noAudio.length} slide senza audio (l'avatar si rende SOLO dopo il lock audio): ${noAudio.join(", ")}`);
  process.exit(1);
}

const pending = all.filter(
  (id) => !clipMap[id]?.uid && !fs.existsSync(path.join(d.clips, `${id}.mp4.ok`)),
);
console.log(`Slide totali: ${all.length} · già fatte: ${all.length - pending.length} · da renderizzare: ${pending.length}`);

fs.mkdirSync(d.shards, { recursive: true });
for (const f of fs.readdirSync(d.shards)) fs.unlinkSync(path.join(d.shards, f));

for (let g = 0; g < gpus; g++) {
  const ids = pending.filter((_, i) => i % gpus === g);
  const file = path.join(d.shards, `gpu-${g}.txt`);
  fs.writeFileSync(file, ids.join("\n") + (ids.length ? "\n" : ""));
  console.log(`  ${file}: ${ids.length} clip`);
}
console.log(`\nOK · su ogni pod: python scripts/produzione/render-avatar.py ${corso} --shard ${d.shards}/gpu-N.txt --base <video-base>`);
