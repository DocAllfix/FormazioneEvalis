// withTenant: esegue il callback dentro una transazione con le GUC di tenant impostate,
// così le policy RLS scopano le query. Origine della GUC = la SESSIONE (mai i dati):
//   - learner  → { userId }            (le policy matchano le sue righe per user_id)
//   - azienda  → { orgId }             (match per organization_id)
//   - staff    → { platformAdmin:true }(valvola cross-tenant, gated requirePlatformAdmin)
//   - verifica → { verifyUuid }        (valvola narrow: UN certificato pubblico per uuid)
//
// In dev l'app gira come `postgres` (bypassrls) → le GUC sono innocue, comportamento identico.
// In produzione come `app_rls` (NOBYPASSRLS) → la RLS è attiva e queste GUC la guidano.
// (Vedi migration 0007 + 0012_rls_valves e PRE-LAUNCH §6.)

import { sql } from "drizzle-orm";
import { db } from "./index";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type TenantCtx = {
  userId?: string | null;
  orgId?: string | null;
  platformAdmin?: boolean;
  verifyUuid?: string | null;
};

// Seam di verifica (dev/CI): se RLS_FORCE_ROLE è impostato (es. "app_rls"), ogni transazione
// withTenant assume quel ruolo via SET LOCAL ROLE. Permette di esercitare la RLS davvero
// mentre il seeding dei test (db grezzo) resta sul ruolo di connessione (bypass). In PROD non
// si imposta: la connessione è direttamente `app_rls` (fail-closed). Whitelist anti-injection.
const FORCE_ROLE = process.env.RLS_FORCE_ROLE;
const SAFE_ROLE = FORCE_ROLE && /^[a-z_][a-z0-9_]*$/.test(FORCE_ROLE) ? FORCE_ROLE : null;

export async function withTenant<T>(ctx: TenantCtx, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    if (SAFE_ROLE) await tx.execute(sql.raw(`SET LOCAL ROLE ${SAFE_ROLE}`));
    await tx.execute(sql`SELECT set_config('app.user_id', ${ctx.userId ?? ""}, true)`);
    await tx.execute(sql`SELECT set_config('app.org_id', ${ctx.orgId ?? ""}, true)`);
    await tx.execute(sql`SELECT set_config('app.platform_admin', ${ctx.platformAdmin ? "on" : ""}, true)`);
    await tx.execute(sql`SELECT set_config('app.verify_uuid', ${ctx.verifyUuid ?? ""}, true)`);
    return fn(tx);
  });
}
