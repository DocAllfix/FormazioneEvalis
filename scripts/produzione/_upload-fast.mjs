// Upload R2 -> Cloudflare Stream con POOL CONTINUO (non lock-step): ~CONC clip "in volo",
// appena una finisce ne parte un'altra -> massimizza il parallelismo di codifica Cloudflare.
// IDENTITÀ INVARIATA rispetto al pilota: meta.name = ID, durata registrata SOLO dopo
// readyToStream, idempotente (salta le già mappate), carica SOLO gli ID presenti in audio-map
// (niente clip orfane). Backoff sui 429. La clip-map resta comunque da RICONCILIARE da Cloudflare
// dopo (riconcilia-stream) + verifica-corso: questo script è solo il trasporto, non la verità.
//
// Uso: node scripts/produzione/_upload-fast.mjs <corso> [concorrenza=20]
import "dotenv/config";
import fs from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);

const CORSO = process.argv[2];
const CONC = Number(process.argv[3] || 20);
if (!CORSO) { console.error("Uso: node _upload-fast.mjs <corso> [concorrenza]"); process.exit(2); }

const env = { ...process.env,
  RCLONE_CONFIG_R2_TYPE: "s3", RCLONE_CONFIG_R2_PROVIDER: "Cloudflare",
  RCLONE_CONFIG_R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  RCLONE_CONFIG_R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  RCLONE_CONFIG_R2_ENDPOINT: process.env.R2_ENDPOINT, RCLONE_S3_NO_CHECK_BUCKET: "true" };
const prefix = `r2:${process.env.R2_BUCKET}/avatar-clips/${CORSO}`;
const acct = process.env.CLOUDFLARE_ACCOUNT_ID, token = process.env.CLOUDFLARE_STREAM_API_TOKEN;
const base = `https://api.cloudflare.com/client/v4/accounts/${acct}/stream`;
const auth = { Authorization: `Bearer ${token}` };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mapPath = `produzione/${CORSO}/clip-map.json`;

// THROTTLE GLOBALE: tutte le chiamate all'API Cloudflare vengono distanziate di >= MIN_INTERVAL_MS
// (una coda seriale), così NON superiamo mai il rate limit (1200/5min = ~4/s) qualunque sia la
// concorrenza. Disaccoppia "encode in volo" (tanti, veloce) da "richieste API/s" (capped, sicuro).
const MIN_INTERVAL_MS = 350; // ~2.8 req/s verso l'API
let lastReq = 0;
let gate = Promise.resolve();
function throttle() {
  gate = gate.then(async () => {
    const wait = MIN_INTERVAL_MS - (Date.now() - lastReq);
    if (wait > 0) await sleep(wait);
    lastReq = Date.now();
  });
  return gate;
}

const audio = JSON.parse(fs.readFileSync(`produzione/${CORSO}/audio-map.json`, "utf8"));
const wanted = new Set(Object.keys(audio).filter((k) => !k.startsWith("_")));

const { stdout } = await execFileP("rclone", ["lsf", prefix, "--include", "*.mp4.ok"], { env, maxBuffer: 64 * 1024 * 1024 });
const okIds = stdout.split("\n").filter(Boolean).map((f) => f.replace(/\.mp4\.ok$/, ""));
const orphans = okIds.filter((id) => !wanted.has(id));
let map = fs.existsSync(mapPath) ? JSON.parse(fs.readFileSync(mapPath, "utf8")) : {};
const pending = okIds.filter((id) => wanted.has(id) && !map[id]?.uid);
console.log(`${CORSO}: ${okIds.length} clip .ok su R2 · ${wanted.size} attese (audio-map) · ${Object.keys(map).length} già su Stream · ${pending.length} da caricare · conc ${CONC}`);
if (orphans.length) console.log(`  (ignoro ${orphans.length} clip .ok NON in audio-map: ${orphans.slice(0, 5).join(", ")})`);

let done = 0, failed = 0, idx = 0;
const t0 = Date.now();
let saveTimer = null;
const scheduleSave = () => { if (!saveTimer) saveTimer = setTimeout(() => { fs.writeFileSync(mapPath, JSON.stringify(map, null, 2) + "\n"); saveTimer = null; }, 2000); };

async function cf(url, opts = {}, tries = 6) {
  for (let i = 0; i < tries; i++) {
    await throttle(); // coda globale: rispetta il rate limit qualunque sia la concorrenza
    const r = await fetch(url, { ...opts, headers: { ...auth, ...(opts.headers || {}) } });
    if (r.status === 429) { await sleep(3000 * (i + 1)); continue; } // rete di sicurezza
    return r;
  }
  throw new Error("429 ripetuti");
}

async function uploadOne(id) {
  const { stdout } = await execFileP("rclone", ["link", `${prefix}/${id}.mp4`, "--expire", "12h"], { env });
  const url = stdout.trim();
  const rc = await cf(`${base}/copy`, { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, meta: { name: id }, requireSignedURLs: true }) });
  const jc = await rc.json();
  if (!jc.success) throw new Error(`copy ${JSON.stringify(jc.errors)}`);
  const uid = jc.result.uid;
  for (let i = 0; i < 200; i++) {
    await sleep(10000); // poll ogni 10s (gentile con l'API; il throttle globale è la vera guardia)
    const res = (await (await cf(`${base}/${uid}`)).json()).result ?? {};
    if (res.readyToStream) return { uid, duration: Math.ceil(res.duration || 0) };
    if (res.status?.state === "error") throw new Error(`encode ${JSON.stringify(res.status)}`);
  }
  throw new Error("timeout");
}

async function worker() {
  while (idx < pending.length) {
    const id = pending[idx++];
    try {
      map[id] = await uploadOne(id);
      done++; scheduleSave();
    } catch (e) { failed++; console.log(`  X ${id}: ${e.message}`); }
    if ((done + failed) % 10 === 0) {
      const el = (Date.now() - t0) / 1000;
      console.log(`  ${done + failed}/${pending.length} (ok ${done}, err ${failed}) · ${el.toFixed(0)}s · ${(done / (el / 60)).toFixed(1)} clip/min`);
    }
  }
}

await Promise.all(Array.from({ length: Math.min(CONC, pending.length) }, worker));
fs.writeFileSync(mapPath, JSON.stringify(map, null, 2) + "\n");
const el = (Date.now() - t0) / 1000;
console.log(`\nFINITO ${CORSO}: ${Object.keys(map).length}/${wanted.size} su Stream · nuove ${done} · errori ${failed} · ${(el / 60).toFixed(1)} min`);
process.exit(failed ? 1 : 0);
