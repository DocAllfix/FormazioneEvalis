// Carica su Cloudflare Stream le clip VALIDATE di un corso (requireSignedURLs),
// attende il processing e salva { uid, duration } in clip-map.json per ID.
// Generalizzazione di scripts/upload-demo-clips.mjs (stesso pattern, chiave = ID canonico).
// Idempotente: salta gli ID già mappati. Carica SOLO clip con il gemello .ok (gate passato).
//
// Uso:  node scripts/produzione/upload-clips.mjs <corso> [--mock] [--from-r2]
//       --mock: niente Cloudflare, uid finti + durata da ffprobe (dry-run della catena)
//       --from-r2: le clip stanno su R2 (avatar-clips/<corso>/, caricate dai pod col gate);
//                  Stream le TIRA via URL presignato (endpoint /copy) — zero disco locale.
// Env:  CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_STREAM_API_TOKEN (token DEDICATO produzione);
//       con --from-r2 anche R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_ENDPOINT/R2_BUCKET (.env).

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { dirs, readJson, writeJson, probeDuration, ID_RE } from "./lib.mjs";

const corso = process.argv[2];
const mock = process.argv.includes("--mock");
const fromR2 = process.argv.includes("--from-r2");
if (!corso) {
  console.error("Uso: node scripts/produzione/upload-clips.mjs <corso> [--mock] [--from-r2]");
  process.exit(2);
}

const d = dirs(corso);
const map = readJson(d.clipMap, {});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const RCLONE = process.env.RCLONE || "rclone";
const r2Env = fromR2
  ? {
      ...process.env,
      RCLONE_CONFIG_R2_TYPE: "s3",
      RCLONE_CONFIG_R2_PROVIDER: "Cloudflare",
      RCLONE_CONFIG_R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
      RCLONE_CONFIG_R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
      RCLONE_CONFIG_R2_ENDPOINT: process.env.R2_ENDPOINT,
      RCLONE_S3_NO_CHECK_BUCKET: "true",
    }
  : undefined;
const r2Prefix = fromR2 ? `r2:${process.env.R2_BUCKET}/avatar-clips/${corso}` : undefined;

function rclone(args) {
  return execFileSync(RCLONE, args, { encoding: "utf8", env: r2Env }).trim();
}

// solo clip validate dal gate del render (.ok presente): in locale o su R2
const ids = fromR2
  ? rclone(["lsf", r2Prefix, "--include", "*.mp4.ok"])
      .split("\n")
      .filter(Boolean)
      .map((f) => f.replace(/\.mp4\.ok$/, ""))
      .filter((id) => ID_RE.test(id))
      .sort()
  : fs.existsSync(d.clips)
    ? fs.readdirSync(d.clips)
        .filter((f) => f.endsWith(".mp4.ok"))
        .map((f) => f.replace(/\.mp4\.ok$/, ""))
        .filter((id) => ID_RE.test(id))
        .sort()
    : [];
if (ids.length === 0) {
  console.error(fromR2
    ? `Nessuna clip validata (.ok) su ${r2Prefix}/ — prima il render con gate.`
    : `Nessuna clip validata (.ok) in ${d.clips}/ — prima il render con gate.`);
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

  return awaitReady(id, uid);
}

async function awaitReady(id, uid) {
  for (let i = 0; i < 200; i++) {
    const g = await fetch(`${base}/${uid}`, { headers: auth });
    const gJson = await g.json().catch(() => ({}));
    const r = gJson.result ?? {};
    if (r.readyToStream) return { uid, duration: Math.ceil(r.duration || 0) };
    if (r.status?.state === "error") throw new Error(`processing ${id}: ${JSON.stringify(r.status)}`);
    await sleep(3000);
  }
  throw new Error(`timeout processing ${id} (uid ${uid})`);
}

// --from-r2: Stream TIRA la clip da un URL presignato R2 (endpoint /copy) — niente disco locale
async function copyFromR2(id) {
  const url = rclone(["link", `${r2Prefix}/${id}.mp4`, "--expire", "4h"]);
  const up = await fetch(`${base}/copy`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ url, meta: { name: id }, requireSignedURLs: true }),
  });
  const upJson = await up.json().catch(() => ({}));
  if (!upJson.success) throw new Error(`copy ${id}: ${JSON.stringify(upJson.errors)}`);
  return awaitReady(id, upJson.result.uid);
}

console.log(`${ids.length} clip validate${mock ? " (MOCK: nessun upload reale)" : fromR2 ? " (da R2 via /copy)" : ""}`);
for (const id of ids) {
  if (map[id]?.uid) {
    console.log(`· ${id}: già mappata (${map[id].uid}), salto`);
    continue;
  }
  const file = path.join(d.clips, `${id}.mp4`);
  process.stdout.write(`↑ ${id} … `);
  const res = mock
    ? { uid: `mock-${id}`, duration: Math.ceil(probeDuration(file)) }
    : fromR2
      ? await copyFromR2(id)
      : await uploadOne(id, file);
  map[id] = res;
  writeJson(d.clipMap, map); // salvataggio incrementale (ripartibile)
  console.log(`ok uid=${res.uid} durata=${res.duration}s`);
}

console.log(`\nOK · ${Object.keys(map).length} clip in ${d.clipMap}`);
