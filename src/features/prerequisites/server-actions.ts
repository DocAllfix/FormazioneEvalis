"use server";

// Presa d'atto dell'avviso ISO 19011 (advisory). Traccia append-only che l'utente è stato informato
// che, senza la 19011, la certificazione non è applicabile in ambito lavorativo — e ha scelto di
// procedere comunque. È la prova di aver adempiuto all'obbligo informativo. NON blocca nulla.

import { requireActiveOrg } from "@/features/auth/guards";
import { withTenant } from "@/lib/db/tenant";
import { appendActivity } from "@/features/audit/log";

export async function acknowledgeIso19011AdvisoryAction(courseId: string): Promise<void> {
  const { user, orgId } = await requireActiveOrg();
  await withTenant({ userId: user.id, orgId }, async (tx) => {
    await appendActivity(tx, {
      organizationId: orgId,
      userId: user.id,
      verb: "iso19011-advisory-acknowledged",
      object: `course:${courseId}`,
    });
  });
}
