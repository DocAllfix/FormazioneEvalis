// RICONCILIAZIONE AUTOREVOLE: ricostruisce clip-map.json interrogando Cloudflare Stream.
// Fonte di verità = il video stesso, che porta meta.name = ID della slide (scritto all'upload).
// Rileva DOPPIONI (stesso ID su più uid) e verifica che la durata combaci con l'audio lockato
// (±1s). Non carica nulla: solo legge, verifica, riscrive. --elimina-doppioni cancella gli extra.
//
// Uso: node scripts/produzione/_riconcilia.mjs <corso> [--elimina-doppioni]
import "dotenv/config";
import fs from "node:fs";

const CORSO = process.argv[2];
const ELIMINA = process.argv.includes("--elimina-doppioni");
if (!CORSO) { console.error("Uso: node _riconcilia.mjs <corso> [--elimina-doppioni]"); process.exit(2); }

const acct = process.env.CLOUDFLARE_ACCOUNT_ID, token = process.env.CLOUDFLARE_STREAM_API_TOKEN;
const base = `https://api.cloudflare.com/client/v4/accounts/${acct}/stream`;
const auth = { Authorization: `Bearer ${token}` };

// 1) scarica TUTTI i video dell'account (paginazione a ritroso per data)
let all = [], before = null, page = 0;
while (true) {
  const u = new URL(base);
  u.searchParams.set("per_page", "1000");
  if (before) u.searchParams.set("before", before);
  const j = await (await fetch(u, { headers: auth })).json();
  if (!j.success) { console.error("lista fallita:", JSON.stringify(j.errors)); process.exit(1); }
  const batch = j.result ?? [];
  all = all.concat(batch);
  if (batch.length < 1000) break;
  before = batch[batch.length - 1].created;
  if (++page > 40) break;
}
console.log(`video totali sull'account Stream: ${all.length}`);

// 2) tiene solo quelli di questo corso, raggruppati per meta.name (= ID slide)
const perId = new Map();
for (const v of all) {
  const name = v.meta?.name;
  if (!name || !name.startsWith(`${CORSO}_`)) continue;
  if (!perId.has(name)) perId.set(name, []);
  perId.get(name).push(v);
}
console.log(`video di ${CORSO}: ${[...perId.values()].reduce((a, v) => a + v.length, 0)} su ${perId.size} ID distinti`);

const dup = [...perId.entries()].filter(([, v]) => v.length > 1);
console.log(`ID con DOPPIONI: ${dup.length}`);
for (const [id, v] of dup.slice(0, 10)) console.log(`  ${id}: ${v.length} copie`);

// 3) mappa: per ogni ID tiene il video PRONTO più recente; verifica durata vs audio-map ±1s
const audio = JSON.parse(fs.readFileSync(`produzione/${CORSO}/audio-map.json`, "utf8"));
const map = {}, nonPronti = [], fuori = [];
for (const [id, vids] of perId) {
  const pronti = vids.filter((v) => v.readyToStream);
  if (!pronti.length) { nonPronti.push(id); continue; }
  pronti.sort((a, b) => new Date(b.created) - new Date(a.created));
  const dur = Math.ceil(pronti[0].duration || 0);
  map[id] = { uid: pronti[0].uid, duration: dur };
  const atteso = audio[id]?.duration;
  if (atteso == null) fuori.push(`${id}: non in audio-map`);
  else if (Math.abs(dur - Math.round(atteso)) > 1) fuori.push(`${id}: Stream ${dur}s vs audio ${Math.round(atteso)}s`);
}
console.log(`ID pronti e mappati: ${Object.keys(map).length}`);
if (nonPronti.length) console.log(`ID NON pronti (esclusi): ${nonPronti.length} — ${nonPronti.slice(0, 8).join(", ")}`);
console.log(`DURATE fuori tolleranza (±1s): ${fuori.length}`);
for (const x of fuori.slice(0, 10)) console.log(`  ! ${x}`);

const mapPath = `produzione/${CORSO}/clip-map.json`;
fs.writeFileSync(mapPath, JSON.stringify(map, null, 2) + "\n");
console.log(`clip-map RICOSTRUITA da Cloudflare: ${Object.keys(map).length} voci -> ${mapPath}`);

// 4) elimina i doppioni (tiene quello mappato)
if (ELIMINA && dup.length) {
  let del = 0;
  for (const [id, vids] of dup) {
    const keep = map[id]?.uid;
    for (const v of vids) {
      if (v.uid === keep) continue;
      if ((await fetch(`${base}/${v.uid}`, { method: "DELETE", headers: auth })).ok) del++;
    }
  }
  console.log(`doppioni eliminati da Stream: ${del}`);
}

const attese = Object.keys(audio).filter((k) => !k.startsWith("_")).length;
console.log(`\nRIEPILOGO ${CORSO}: mappate ${Object.keys(map).length}/${attese} · doppioni ${dup.length} · durate anomale ${fuori.length}`);
