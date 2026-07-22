// Rate limiting a finestra fissa su Postgres (C-1 audit go-live). Nessun servizio esterno.
// checkLimit incrementa atomicamente il contatore della finestra corrente e dice se la soglia
// è superata. FAIL-OPEN: se il DB del limiter non risponde NON blocchiamo l'utente legittimo —
// è protezione anti-abuso, non un controllo di compliance (e se il DB è giù, l'app è giù comunque).

import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/** IP del client dietro il proxy Vercel (mai fidarsi di un singolo header spoofabile a monte:
 *  x-forwarded-for è impostato dal proxy; prendiamo il primo hop). */
export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim() || "unknown";
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/** true = richiesta consentita; false = soglia superata nella finestra (→ 429). */
export async function checkLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
  try {
    const rows = (await db.execute(sql`
      INSERT INTO rate_limit ("key", window_start, "count") VALUES (${key}, ${windowStart}, 1)
      ON CONFLICT ("key", window_start) DO UPDATE SET "count" = rate_limit."count" + 1
      RETURNING "count"
    `)) as unknown as { count: number }[];
    return Number(rows[0]?.count ?? 1) <= limit;
  } catch {
    return true; // fail-open
  }
}

/** Risposta 429 uniforme con Retry-After. */
export function tooManyRequests(windowMs: number): Response {
  return new Response("Troppe richieste: riprova più tardi.", {
    status: 429,
    headers: { "Retry-After": String(Math.ceil(windowMs / 1000)) },
  });
}
