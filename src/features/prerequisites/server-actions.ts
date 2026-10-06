"use server";

// Presa d'atto dell'avviso ISO 19011 (advisory). Traccia append-only che l'utente è stato informato
// che, senza la 19011, la certificazione non è applicabile in ambito lavorativo — e ha scelto di
// procedere comunque. È la prova di aver adempiuto all'obbligo informativo. NON blocca nulla.
// Si registra solo se l'avviso aveva senso (stessa regola che lo mostra) e una sola volta per
// (azienda, utente, corso); negli altri casi si esce senza errore e l'acquisto prosegue.

import { and, eq } from "drizzle-orm";
import { requireActiveOrg } from "@/features/auth/guards";
import { withTenant } from "@/lib/db/tenant";
import { appendActivity } from "@/features/audit/log";
import { activityLog } from "@/lib/db/schema";
import { UUID_RE } from "@/features/catalog/queries";
import { iso19011Advisory } from "./advisory";

const VERBO = "iso19011-advisory-acknowledged";

export async function acknowledgeIso19011AdvisoryAction(courseId: string): Promise<void> {
  const { user, orgId } = await requireActiveOrg();
  if (typeof courseId !== "string" || !UUID_RE.test(courseId)) return;
  const avviso = await iso19011Advisory(user.id, courseId);
  if (!avviso.isIsoCourse || !avviso.shouldAdvise) return;

  await withTenant({ userId: user.id, orgId }, async (tx) => {
    const [gia] = await tx
      .select({ id: activityLog.id })
      .from(activityLog)
      .where(
        and(
          eq(activityLog.organizationId, orgId),
          eq(activityLog.userId, user.id),
          eq(activityLog.verb, VERBO),
          eq(activityLog.object, `course:${courseId}`),
        ),
      )
      .limit(1);
    if (gia) return;
    await appendActivity(tx, {
      organizationId: orgId,
      userId: user.id,
      verb: VERBO,
      object: `course:${courseId}`,
    });
  });
}
