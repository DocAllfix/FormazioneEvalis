// Setup Cloudflare Stream (idempotente nei valori env): crea una signing key, ricava
// il customer code, carica un mp4 di esempio firmato (per il test). Scrive in .env:
//   CLOUDFLARE_STREAM_SIGNING_KEY_ID, CLOUDFLARE_STREAM_SIGNING_KEY (pem base64),
//   CLOUDFLARE_STREAM_CUSTOMER_CODE
// Esegui: node scripts/cloudflare-setup.mjs

import "dotenv/config";
import fs from "node:fs";

const acct = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_STREAM_API_TOKEN;
if (!acct || !token) {
  console.error("Mancano CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_STREAM_API_TOKEN in .env");
  process.exit(1);
}

const base = `https://api.cloudflare.com/client/v4/accounts/${acct}/stream`;
const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

async function api(path, opts = {}) {
  const res = await fetch(`${base}${path}`, { headers, ...opts });
  const json = await res.json().catch(() => ({ success: false, errors: ["risposta non-JSON"] }));
  if (!json.success) {
    console.error(`Errore Cloudflare su ${path}:`, JSON.stringify(json.errors));
    process.exit(1);
  }
  return json.result;
}

function upsertEnv(updates) {
  const path = ".env";
  let content = fs.existsSync(path) ? fs.readFileSync(path, "utf8") : "";
  for (const [k, v] of Object.entries(updates)) {
    const re = new RegExp(`^${k}=.*$`, "m");
    const line = `${k}=${v}`;
    if (re.test(content)) content = content.replace(re, line);
    else content += (content === "" || content.endsWith("\n") ? "" : "\n") + line + "\n";
  }
  fs.writeFileSync(path, content);
}

// 1) signing key (pem privata, restituita una sola volta)
const key = await api("/keys", { method: "POST" });
const keyId = key.id;
// Cloudflare restituisce `pem` GIÀ in base64. Salviamo base64(PEM) singolo:
// se per qualche motivo arriva PEM grezzo (contiene BEGIN), lo codifichiamo noi.
const pemB64 = key.pem.includes("BEGIN") ? Buffer.from(key.pem, "utf8").toString("base64") : key.pem;

// 2) upload campione (copy-from-url) firmato
const SAMPLE = "https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4";
const video = await api("/copy", {
  method: "POST",
  body: JSON.stringify({ url: SAMPLE, requireSignedURLs: true }),
});
const uid = video.uid;
let hls = video.playback?.hls ?? "";
if (!hls) {
  const v = await api(`/${uid}`);
  hls = v.playback?.hls ?? "";
}
const customerCode = (hls.match(/customer-([a-z0-9]+)\.cloudflarestream\.com/i) ?? [])[1] ?? "";

upsertEnv({
  CLOUDFLARE_STREAM_SIGNING_KEY_ID: keyId,
  CLOUDFLARE_STREAM_SIGNING_KEY: pemB64,
  CLOUDFLARE_STREAM_CUSTOMER_CODE: customerCode,
});

console.log("\n=== Cloudflare Stream setup OK (scritto in .env) ===");
console.log("SIGNING_KEY_ID :", keyId);
console.log("CUSTOMER_CODE  :", customerCode || "(non ricavato — riprova tra qualche secondo)");
console.log("SAMPLE_UID     :", uid, "(video di test, eliminabile)");
