// Test puro della firma token Cloudflare Stream (RS256). Genera una coppia di chiavi
// di test, firma, e verifica struttura + firma con la chiave pubblica. Niente rete.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { generateKeyPairSync, createVerify } from "node:crypto";
import { signStreamToken, getSignedClipUrl } from "../lib/cloudflare/stream";

const KEYS = [
  "CLOUDFLARE_STREAM_SIGNING_KEY",
  "CLOUDFLARE_STREAM_SIGNING_KEY_ID",
  "CLOUDFLARE_STREAM_CUSTOMER_CODE",
] as const;
const saved: Record<string, string | undefined> = {};
let publicKey = "";

beforeAll(() => {
  for (const k of KEYS) saved[k] = process.env[k];
  const kp = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs1", format: "pem" },
  });
  publicKey = kp.publicKey;
  process.env.CLOUDFLARE_STREAM_SIGNING_KEY = Buffer.from(kp.privateKey).toString("base64");
  process.env.CLOUDFLARE_STREAM_SIGNING_KEY_ID = "testkid";
  process.env.CLOUDFLARE_STREAM_CUSTOMER_CODE = "testcode";
});

afterAll(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

function b64urlToBuf(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "="), "base64");
}

describe("signStreamToken", () => {
  it("firma un JWT RS256 con claim corretti e firma valida", () => {
    const tok = signStreamToken("vid123", 3600);
    const [h, p, s] = tok.split(".");
    expect(JSON.parse(b64urlToBuf(h).toString())).toMatchObject({ alg: "RS256", kid: "testkid" });
    const payload = JSON.parse(b64urlToBuf(p).toString());
    expect(payload.sub).toBe("vid123");
    expect(payload.kid).toBe("testkid");
    expect(payload.exp - payload.nbf).toBe(3600);
    const ok = createVerify("RSA-SHA256").update(`${h}.${p}`).verify(publicKey, b64urlToBuf(s));
    expect(ok).toBe(true);
  });

  it("getSignedClipUrl produce l'URL customer firmato", async () => {
    const url = await getSignedClipUrl("vid123");
    expect(url.startsWith("https://customer-testcode.cloudflarestream.com/")).toBe(true);
    expect(url.endsWith("/manifest/video.m3u8")).toBe(true);
  });

  it("senza configurazione → manifest di test (fallback dev)", async () => {
    const k = process.env.CLOUDFLARE_STREAM_SIGNING_KEY;
    delete process.env.CLOUDFLARE_STREAM_SIGNING_KEY;
    const url = await getSignedClipUrl("vid123");
    expect(url).toContain("test-streams.mux.dev");
    process.env.CLOUDFLARE_STREAM_SIGNING_KEY = k;
  });
});
