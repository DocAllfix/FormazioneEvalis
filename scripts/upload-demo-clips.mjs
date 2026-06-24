// Carica le clip avatar della demo (mp4corsotest/) su Cloudflare Stream con
// requireSignedURLs, attende il processing e salva uid+durata in
// democorso/clip-map.json. Idempotente: salta le clip già mappate.
//
// Uso: node scripts/upload-demo-clips.mjs
//
// Richiede in .env: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_STREAM_API_TOKEN.

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";

const acct = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_STREAM_API_TOKEN;
if (!acct || !token) {
  console.error("Mancano CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_STREAM_API_TOKEN in .env");
  process.exit(1);
}

const base = `https://api.cloudflare.com/client/v4/accounts/${acct}/stream`;
const auth = { Authorization: `Bearer ${token}` };
const CLIP_DIR = "mp4corsotest";
const MAP_PATH = "democorso/clip-map.json";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Raccoglie ricorsivamente i file e li indicizza per chiave sNN (gestisce s01.mp4.mp4).
function collectClips(dir) {
  const out = {};
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) Object.assign(out, collectClips(full));
    else {
      const m = entry.name.match(/^(s\d{2})/i);
      if (m && /\.mp4(\.mp4)?$/i.test(entry.name)) out[m[1].toLowerCase()] = full;
    }
  }
  return out;
}

async function uploadOne(key, file) {
  const buf = fs.readFileSync(file);
  const form = new FormData();
  form.append("file", new Blob([buf], { type: "video/mp4" }), `${key}.mp4`);
  const up = await fetch(base, { method: "POST", headers: auth, body: form });
  const upJson = await up.json().catch(() => ({}));
  if (!upJson.success) throw new Error(`upload ${key}: ${JSON.stringify(upJson.errors)}`);
  const uid = upJson.result.uid;

  // richiedi URL firmati
  const patch = await fetch(`${base}/${uid}`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ requireSignedURLs: true, meta: { name: `demo-${key}` } }),
  });
  const patchJson = await patch.json().catch(() => ({}));
  if (!patchJson.success) throw new Error(`patch ${key}: ${JSON.stringify(patchJson.errors)}`);

  // attendi il processing → duration
  for (let i = 0; i < 40; i++) {
    const g = await fetch(`${base}/${uid}`, { headers: auth });
    const gJson = await g.json().catch(() => ({}));
    const r = gJson.result ?? {};
    if (r.readyToStream) return { uid, duration: Math.ceil(r.duration || 0) };
    if (r.status?.state === "error") throw new Error(`processing ${key}: ${JSON.stringify(r.status)}`);
    await sleep(3000);
  }
  throw new Error(`timeout processing ${key} (uid ${uid})`);
}

const clips = collectClips(CLIP_DIR);
const keys = Object.keys(clips).sort();
if (keys.length === 0) {
  console.error(`Nessuna clip trovata in ${CLIP_DIR}/`);
  process.exit(1);
}

const map = fs.existsSync(MAP_PATH) ? JSON.parse(fs.readFileSync(MAP_PATH, "utf8")) : {};
console.log(`Trovate ${keys.length} clip: ${keys.join(", ")}`);

for (const key of keys) {
  if (map[key]?.uid) {
    console.log(`· ${key}: già mappata (${map[key].uid}), salto`);
    continue;
  }
  process.stdout.write(`↑ ${key} (${path.basename(clips[key])}) … `);
  const res = await uploadOne(key, clips[key]);
  map[key] = res;
  fs.writeFileSync(MAP_PATH, JSON.stringify(map, null, 2) + "\n");
  console.log(`ok uid=${res.uid} durata=${res.duration}s`);
}

console.log(`\nOK · ${Object.keys(map).length} clip in ${MAP_PATH}`);
process.exit(0);
