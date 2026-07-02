// Carica su Cloudflare Stream le clip VALIDATE di un corso (requireSignedURLs),
// attende il processing e salva { uid, duration } in clip-map.json per ID.
// Generalizzazione di scripts/upload-demo-clips.mjs (stesso pattern, chiave = ID canonico).
// Idempotente: salta gli ID già mappati. Carica SOLO clip con il gemello .ok (gate passato).
//
// Uso:  node scripts/produzione/upload-clips.mjs <corso> [--mock]
//       --mock: niente Cloudflare, uid finti + durata da ffprobe (dry-run della catena)
// Env:  CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_STREAM_API_TOKEN (token DEDICATO produzione).

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { dirs, readJson, writeJson, probeDuration, ID_RE } from "./lib.mjs";

const corso = process.argv[2];
const mock = process.argv.includes("--mock");
if (!corso) {
  console.error("Uso: node scripts/produzione/upload-clips.mjs <corso> [--mock]");
  process.exit(2);
}

const d = dirs(corso);
const map = readJson(d.clipMap, {});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// solo clip validate dal gate del render (.ok presente)
const ids = fs.existsSync(d.clips)
  ? fs.readdirSync(d.clips)
      .filter((f) => f.endsWith(".mp4.ok"))
      .map((f) => f.replace(/\.mp4\.ok$/, ""))
      .filter((id) => ID_RE.test(id))
      .sort()
  : [];
if (ids.length === 0) {
  console.error(`Nessuna clip validata (.ok) in ${d.clips}/ — prima il render con gate.`);
  process.exit(1);
}

let base, auth;
if (!mock) {
  const acct = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_STREAM_API_TOKEN;
  if (!acct || !token) {
    console.error("Mancano CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_STREAM_API_TOKEN in .env");
    process.exit(1);
  }
  base = `https://api.cloudflare.com/client/v4/accounts/${acct}/stream`;
  auth = { Authorization: `Bearer ${token}` };
}

async function uploadOne(id, file) {
  const buf = fs.readFileSync(file);
  const form = new FormData();
  form.append("file", new Blob([buf], { type: "video/mp4" }), `${id}.mp4`);
  const up = await fetch(base, { method: "POST", headers: auth, body: form });
  const upJson = await up.json().catch(() => ({}));
  if (!upJson.success) throw new Error(`upload ${id}: ${JSON.stringify(upJson.errors)}`);
  const uid = upJson.result.uid;

  const patch = await fetch(`${base}/${uid}`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ requireSignedURLs: true, meta: { name: id } }),
  });
  const patchJson = await patch.json().catch(() => ({}));
  if (!patchJson.success) throw new Error(`patch ${id}: ${JSON.stringify(patchJson.errors)}`);

  for (let i = 0; i < 60; i++) {
    const g = await fetch(`${base}/${uid}`, { headers: auth });
    const gJson = await g.json().catch(() => ({}));
    const r = gJson.result ?? {};
    if (r.readyToStream) return { uid, duration: Math.ceil(r.duration || 0) };
    if (r.status?.state === "error") throw new Error(`processing ${id}: ${JSON.stringify(r.status)}`);
    await sleep(3000);
  }
  throw new Error(`timeout processing ${id} (uid ${uid})`);
}

console.log(`${ids.length} clip validate${mock ? " (MOCK: nessun upload reale)" : ""}`);
for (const id of ids) {
  if (map[id]?.uid) {
    console.log(`· ${id}: già mappata (${map[id].uid}), salto`);
    continue;
  }
  const file = path.join(d.clips, `${id}.mp4`);
  process.stdout.write(`↑ ${id} … `);
  const res = mock
    ? { uid: `mock-${id}`, duration: Math.ceil(probeDuration(file)) }
    : await uploadOne(id, file);
  map[id] = res;
  writeJson(d.clipMap, map); // salvataggio incrementale (ripartibile)
  console.log(`ok uid=${res.uid} durata=${res.duration}s`);
}

console.log(`\nOK · ${Object.keys(map).length} clip in ${d.clipMap}`);
