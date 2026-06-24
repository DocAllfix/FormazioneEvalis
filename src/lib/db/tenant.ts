// withTenant: esegue il callback dentro una transazione con le GUC di tenant
// (app.user_id / app.org_id) impostate, così le policy RLS scopano le query.
//
// - In produzione l'app si connette come `app_rls` (NOBYPASSRLS) → la RLS è attiva e
//   queste GUC la guidano: nessuna riga di altri tenant è raggiungibile.
// - In dev l'app si connette come `postgres` (bypassrls) → le GUC sono innocue e il
//   comportamento è identico a oggi. (Vedi migration 0007_rls_tenant_isolation e PRE-LAUNCH §6.)

import { sql } from "drizzle-orm";
import { db } from "./index";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function withTenant<T>(
  ctx: { userId: string; orgId?: string | null },
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.user_id', ${ctx.userId}, true)`);
    await tx.execute(sql`SELECT set_config('app.org_id', ${ctx.orgId ?? ""}, true)`);
    return fn(tx);
  });
}
