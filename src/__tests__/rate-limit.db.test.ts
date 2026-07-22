// C-1 (audit go-live): il rate limiter Postgres blocca oltre la soglia nella finestra,
// conta per-chiave e riparte in una nuova finestra. Colpisce la tabella rate_limit reale.

import { describe, it, expect, afterAll } from "vitest";
import { like } from "drizzle-orm";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/db/schema";
import { checkLimit, getClientIp } from "@/lib/security/rate-limit";

const PREFIX = `test:${Date.now()}`;

afterAll(async () => {
  await db.delete(rateLimit).where(like(rateLimit.key, `${PREFIX}%`));
});

describe("rate limiter (Postgres)", () => {
  it("consente fino alla soglia e poi blocca nella stessa finestra", async () => {
    const key = `${PREFIX}:soglia`;
    const results: boolean[] = [];
    for (let i = 0; i < 5; i++) results.push(await checkLimit(key, 3, 60_000));
    // le prime 3 passano, la 4ª e 5ª no
    expect(results).toEqual([true, true, true, false, false]);
  });

  it("conta separatamente chiavi diverse", async () => {
    expect(await checkLimit(`${PREFIX}:a`, 1, 60_000)).toBe(true);
    expect(await checkLimit(`${PREFIX}:a`, 1, 60_000)).toBe(false); // seconda su 'a' → bloccata
    expect(await checkLimit(`${PREFIX}:b`, 1, 60_000)).toBe(true); // 'b' è indipendente
  });

  it("una nuova finestra riparte da zero", async () => {
    const key = `${PREFIX}:finestra`;
    // finestra da 1ms: la seconda chiamata cade quasi certamente in una finestra nuova
    expect(await checkLimit(key, 1, 1)).toBe(true);
    await new Promise((r) => setTimeout(r, 5));
    expect(await checkLimit(key, 1, 1)).toBe(true);
  });

  it("getClientIp prende il primo hop di x-forwarded-for", () => {
    const req = new Request("https://x.test", { headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" } });
    expect(getClientIp(req)).toBe("1.2.3.4");
    expect(getClientIp(new Request("https://x.test"))).toBe("unknown");
  });
});
