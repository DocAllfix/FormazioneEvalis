// Merge di una bozza modulo (uscita dell'agente) dentro copioni.json — SOLO dopo che
// la bozza ha passato lint su file e revisione di merito.
// Guardie: ID canonici del modulo giusto, numerazione s001..sNNN completa, niente
// duplicati con l'esistente, checkpoint presente. Idempotente: rifiuta il doppio merge.
//
// Uso: node scripts/produzione/merge-bozza.mjs <corso> <mNN>

import { readFileSync, writeFileSync } from "node:fs";

const corso = process.argv[2];
const mod = process.argv[3];
if (!corso || !/^m\d\d$/.test(mod ?? "")) {
  console.error("Uso: merge-bozza.mjs <corso> <mNN>"); process.exit(2);
}

const bozza = JSON.parse(readFileSync(`produzione/${corso}/_bozze/${mod}.json`, "utf8"));
const path = `produzione/${corso}/copioni.json`;
const c = JSON.parse(readFileSync(path, "utf8"));

if (bozza.note) console.log(`NOTA DELL'AUTORE: ${bozza.note}`);
if (bozza.modulo !== mod) { console.error(`bozza dichiara ${bozza.modulo}, atteso ${mod}`); process.exit(1); }

const esistenti = new Set(c.slides.map((s) => s.id));
const attesi = bozza.slides.length;
const re = new RegExp(`^${corso}_${mod}_s(\\d{3})$`);
const visti = new Set();
for (const s of bozza.slides) {
  const m = s.id.match(re);
  if (!m) { console.error(`ID fuori formato: ${s.id}`); process.exit(1); }
  if (visti.has(s.id)) { console.error(`ID duplicato nella bozza: ${s.id}`); process.exit(1); }
  visti.add(s.id);
  if (esistenti.has(s.id)) { console.error(`ID già presente in copioni.json: ${s.id} (doppio merge?)`); process.exit(1); }
  if (!s.testo?.trim() || !s.titolo?.trim()) { console.error(`slide vuota: ${s.id}`); process.exit(1); }
}
for (let i = 1; i <= attesi; i++) {
  const id = `${corso}_${mod}_s${String(i).padStart(3, "0")}`;
  if (!visti.has(id)) { console.error(`numerazione bucata: manca ${id}`); process.exit(1); }
}
if (!bozza.checkpoint?.banca?.length) { console.error("checkpoint mancante nella bozza"); process.exit(1); }

c.slides.push(...bozza.slides);
c.checkpoint = c.checkpoint || {};
c.checkpoint[mod] = bozza.checkpoint;
writeFileSync(path, JSON.stringify(c, null, 2) + "\n", "utf8");
const parole = bozza.slides.reduce((a, s) => a + s.testo.split(/\s+/).filter(Boolean).length, 0);
console.log(`merge ok: ${mod} → ${attesi} slide, ${parole} parole (~${(parole / 2.35 / 60).toFixed(1)} min), banca ${bozza.checkpoint.banca.length} domande`);
console.log("ORA: node scripts/produzione/lint-copioni.mjs " + corso + " --modulo " + mod);
