// Registro attività append-only (hash-chain per organizzazione).
// - appendActivity: scrive un evento concatenato; serializza gli append per-org con
//   un advisory lock transazionale (niente biforcazioni sotto concorrenza).
// - verifyChain: segue i puntatori prev_hash e ricalcola gli hash → rileva manomissioni.
// L'immutabilità è imposta a livello DB da un trigger (vedi migrazione custom).

import { sql, eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { activityLog, enrollment } from "@/lib/db/schema";
import { computeHash } from "./hash";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Row = typeof activityLog.$inferSelect;

export interface ActivityEvent {
  organizationId: string;
  userId?: string | null;
  verb: string;
  object: string;
  payload?: unknown;
}

/** Scrive un evento nella catena dell'organizzazione. DEVE girare dentro una transazione. */
export async function appendActivity(tx: Tx, evt: ActivityEvent): Promise<{ id: string; hash: string }> {
  // serializza gli append della stessa org (rilasciato a fine transazione)
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${evt.organizationId})::bigint)`);

  const [tail] = await tx
    .select({ hash: activityLog.hash })
    .from(activityLog)
    .where(eq(activityLog.organizationId, evt.organizationId))
    .orderBy(desc(activityLog.createdAt), desc(activityLog.id))
    .limit(1);
  const prevHash = tail?.hash ?? null;

  const createdAt = new Date();
  const userId = evt.userId ?? null;
  const payload = evt.payload ?? null;
  const hash = computeHash({
    prevHash,
    organizationId: evt.organizationId,
    userId,
    verb: evt.verb,
    object: evt.object,
    payload,
    createdAtISO: createdAt.toISOString(),
  });

  const [row] = await tx
    .insert(activityLog)
    .values({ organizationId: evt.organizationId, userId, verb: evt.verb, object: evt.object, payload, prevHash, hash, createdAt })
    .returning({ id: activityLog.id });

  return { id: row.id, hash };
}

/** Deriva org+utente dall'enrollment (contesto degli eventi di compliance). */
export async function auditContextFromEnrollment(
  tx: Tx,
  enrollmentId: string,
): Promise<{ organizationId: string; userId: string }> {
  const [e] = await tx
    .select({ organizationId: enrollment.organizationId, userId: enrollment.userId })
    .from(enrollment)
    .where(eq(enrollment.id, enrollmentId))
    .limit(1);
  if (!e) throw new Error("Enrollment inesistente.");
  return e;
}

export interface ChainResult {
  valid: boolean;
  count: number;
  brokenAt?: string;
}

/** Verifica l'integrità della catena di un'organizzazione (tamper-evidence). */
export async function verifyChain(organizationId: string): Promise<ChainResult> {
  const rows: Row[] = await db
    .select()
    .from(activityLog)
    .where(eq(activityLog.organizationId, organizationId));
  if (rows.length === 0) return { valid: true, count: 0 };

  const nextByPrev = new Map<string, Row[]>();
  const genesis: Row[] = [];
  for (const r of rows) {
    if (r.prevHash === null) {
      genesis.push(r);
    } else {
      const arr = nextByPrev.get(r.prevHash) ?? [];
      arr.push(r);
      nextByPrev.set(r.prevHash, arr);
    }
  }
  if (genesis.length !== 1) return { valid: false, count: rows.length, brokenAt: genesis[0]?.id };

  let current: Row | undefined = genesis[0];
  const seen = new Set<string>();
  while (current) {
    const recomputed = computeHash({
      prevHash: current.prevHash,
      organizationId: current.organizationId,
      userId: current.userId,
      verb: current.verb,
      object: current.object,
      payload: current.payload ?? null,
      createdAtISO: current.createdAt.toISOString(),
    });
    if (recomputed !== current.hash) return { valid: false, count: rows.length, brokenAt: current.id };
    if (seen.has(current.id)) return { valid: false, count: rows.length, brokenAt: current.id };
    seen.add(current.id);

    const nexts: Row[] = nextByPrev.get(current.hash) ?? [];
    if (nexts.length > 1) return { valid: false, count: rows.length, brokenAt: nexts[0].id };
    current = nexts[0];
  }

  // orfani: record non raggiungibili dalla genesi → catena spezzata
  if (seen.size !== rows.length) return { valid: false, count: rows.length };
  return { valid: true, count: rows.length };
}
