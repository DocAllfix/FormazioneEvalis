// Smoke live Cloudflare Stream (guardato dalle credenziali): carica un mp4 campione,
// genera l'URL firmato e verifica che Cloudflare lo accetti (firma valida) e — se il
// video è pronto — che il manifest sia servito (200). Cleanup del video.

import { describe, it, expect } from "vitest";
import { uploadClipFromUrl, getSignedClipUrl, deleteClip, isStreamConfigured } from "@/lib/cloudflare/stream";

const SAMPLE = "https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function videoState(uid: string): Promise<string | undefined> {
  const acct = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_STREAM_API_TOKEN;
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${acct}/stream/${uid}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const j = (await res.json()) as { result?: { status?: { state?: string } } };
  return j.result?.status?.state;
}

describe("Cloudflare Stream — smoke live", () => {
  it.skipIf(!isStreamConfigured())("upload → URL firmato accettato (e riproducibile se pronto)", async () => {
    const uid = await uploadClipFromUrl(SAMPLE);
    try {
      let ready = false;
      for (let i = 0; i < 12 && !ready; i++) {
        ready = (await videoState(uid)) === "ready";
        if (!ready) await sleep(4000);
      }
      const url = await getSignedClipUrl(uid);
      expect(url).toContain(".cloudflarestream.com/");
      const res = await fetch(url);
      // firma accettata da Cloudflare (no 401/403)
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
      if (ready) expect(res.ok).toBe(true); // manifest realmente servito
    } finally {
      await deleteClip(uid);
    }
  }, 90000);
});
