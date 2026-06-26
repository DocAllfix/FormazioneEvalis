// Rileva la PERSONA reale dell'utente dal dato (non da un flag): determina quale dei tre
// flussi di onboarding mostrare. Coerente col modello org→seats→users:
//   - admin azienda  → owner/admin di un'org metadata.type=company  (getCompanyAdminOrg)
//   - dipendente B2B → membro (role member) di un'org company
//   - B2C            → solo org personale (type=personal)

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { member, organization } from "@/lib/db/schema";
import { parseOrgMetadata } from "@/features/auth/org-metadata";
import { getCompanyAdminOrg } from "@/features/admin/context";
import type { OnboardingPersona } from "@/lib/db/schema/onboarding";

export type ResolvedPersona = {
  persona: OnboardingPersona;
  /** Org da agganciare all'onboarding (azienda per B2B, personale per B2C). */
  orgId: string;
  /** Nome azienda (solo B2B), per il copy di benvenuto. */
  companyName?: string;
};

export async function resolveOnboardingPersona(userId: string): Promise<ResolvedPersona> {
  // 1) Admin/owner di un'azienda?
  const adminOrg = await getCompanyAdminOrg(userId);
  if (adminOrg) {
    return { persona: "b2b_admin", orgId: adminOrg.id, companyName: adminOrg.name };
  }

  // 2) Membro di un'azienda (invitato) oppure solo org personale (B2C)?
  const rows = await db
    .select({
      orgId: organization.id,
      name: organization.name,
      metadata: organization.metadata,
    })
    .from(member)
    .innerJoin(organization, eq(organization.id, member.organizationId))
    .where(eq(member.userId, userId));

  let personalOrgId: string | undefined;
  for (const r of rows) {
    const meta = parseOrgMetadata(r.metadata);
    if (meta?.type === "company") {
      return { persona: "b2b_member", orgId: r.orgId, companyName: r.name };
    }
    if (meta?.type === "personal") personalOrgId = r.orgId;
  }

  // B2C: org personale (fallback alla prima membership se il metadata è assente).
  return { persona: "b2c", orgId: personalOrgId ?? rows[0]?.orgId };
}
