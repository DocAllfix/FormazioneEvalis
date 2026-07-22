// @vitest-environment node
// A-4 (audit go-live): in produzione i segreti Cloudflare Stream sono obbligatori (niente
// degrado silenzioso al video demo); in sviluppo restano opzionali. env.ts valida a import-time.

import { describe, it, expect, vi, afterEach } from "vitest";

const baseEnv = () => {
  vi.stubEnv("DATABASE_URL", "postgres://x");
  vi.stubEnv("BETTER_AUTH_SECRET", "0123456789abcdef");
  vi.stubEnv("BETTER_AUTH_URL", "https://x.test");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://x.test");
  vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", "x.test");
  // gruppo Cloudflare svuotato: in prod deve far fallire, in dev no
  vi.stubEnv("CLOUDFLARE_ACCOUNT_ID", "");
  vi.stubEnv("CLOUDFLARE_STREAM_API_TOKEN", "");
  vi.stubEnv("CLOUDFLARE_STREAM_SIGNING_KEY", "");
  vi.stubEnv("CLOUDFLARE_STREAM_SIGNING_KEY_ID", "");
  vi.stubEnv("CLOUDFLARE_STREAM_CUSTOMER_CODE", "");
};

describe("env A-4 — segreti servizio required in produzione", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("in produzione senza le chiavi Cloudflare → l'avvio FALLISCE", async () => {
    vi.stubEnv("NODE_ENV", "production");
    baseEnv();
    vi.resetModules();
    await expect(import("@/lib/env")).rejects.toThrow(/CLOUDFLARE/i);
  });

  it("in sviluppo le stesse chiavi restano opzionali → nessun errore", async () => {
    vi.stubEnv("NODE_ENV", "development");
    baseEnv();
    vi.resetModules();
    await expect(import("@/lib/env")).resolves.toBeDefined();
  });
});
