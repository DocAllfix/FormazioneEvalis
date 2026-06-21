// Sorgente video del player: Cloudflare Stream con URL FIRMATI (RS256).
// Il player non conosce il provider: chiede il manifest a questa funzione.
// La firma del token è LOCALE (node:crypto), nessuna chiamata API per riproduzione
// → scalabile. Fallback al manifest di test se Cloudflare non è configurato (dev/test).

import { createSign } from "node:crypto";

// Stream HLS pubblico di test (player/antifrode senza Cloudflare configurato).
const TEST_HLS_MANIFEST = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";

export function isStreamConfigured(): boolean {
  return !!(
    process.env.CLOUDFLARE_STREAM_SIGNING_KEY &&
    process.env.CLOUDFLARE_STREAM_SIGNING_KEY_ID &&
    process.env.CLOUDFLARE_STREAM_CUSTOMER_CODE
  );
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

/** Token firmato Cloudflare Stream (JWT RS256). LOGICA PURA, testabile. */
export function signStreamToken(uid: string, ttlSeconds = 7200): string {
  const keyId = process.env.CLOUDFLARE_STREAM_SIGNING_KEY_ID;
  const pemB64 = process.env.CLOUDFLARE_STREAM_SIGNING_KEY;
  if (!keyId || !pemB64) throw new Error("Signing key Cloudflare non configurata.");
  const pem = Buffer.from(pemB64, "base64").toString("utf8");

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", kid: keyId };
  const payload = { sub: uid, kid: keyId, exp: now + ttlSeconds, nbf: now };
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = createSign("RSA-SHA256").update(signingInput).sign(pem);
  return `${signingInput}.${base64url(signature)}`;
}

/** Manifest HLS firmato della clip; senza configurazione → manifest di test. */
export async function getSignedClipUrl(clipUid: string | null, ttlSeconds = 7200): Promise<string> {
  if (!clipUid || !isStreamConfigured()) return TEST_HLS_MANIFEST;
  const code = process.env.CLOUDFLARE_STREAM_CUSTOMER_CODE;
  const token = signStreamToken(clipUid, ttlSeconds);
  return `https://customer-${code}.cloudflarestream.com/${token}/manifest/video.m3u8`;
}

// Alias storici usati dal contratto player.
export const getClipStreamUrl = getSignedClipUrl;
export const getLessonStreamUrl = getSignedClipUrl;

/** Carica una clip su Stream da URL pubblico (signed). Ritorna lo `uid`. */
export async function uploadClipFromUrl(url: string): Promise<string> {
  const acct = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_STREAM_API_TOKEN;
  if (!acct || !token) throw new Error("Credenziali Cloudflare non configurate.");
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${acct}/stream/copy`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url, requireSignedURLs: true }),
  });
  const json = (await res.json()) as { success: boolean; result?: { uid: string }; errors?: unknown };
  if (!json.success || !json.result) throw new Error(`Upload Cloudflare fallito: ${JSON.stringify(json.errors)}`);
  return json.result.uid;
}

/** Elimina una clip (cleanup test / amministrazione). */
export async function deleteClip(uid: string): Promise<void> {
  const acct = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_STREAM_API_TOKEN;
  if (!acct || !token) return;
  await fetch(`https://api.cloudflare.com/client/v4/accounts/${acct}/stream/${uid}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}
