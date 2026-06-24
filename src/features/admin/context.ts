// Contesto multi-area: risolve l'org AZIENDA (type=company) amministrata dall'utente
// e i flag di navigazione (staff). Usato da: sidebar discente (link condizionali),
// layout (admin) (gate + set active org), onboarding azienda.

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { member, organization } from "@/lib/db/schema";
import { parseOrgMetadata } from "@/features/auth/org-metadata";
import { isPlatformStaffEmail, requireSession } from "@/features/auth/guards";

export type CompanyOrg = { id: string; name: string; slug: string; seatLimit: number };

/** L'org AZIENDA (metadata.type=company) di cui l'utente è owner/admin, o null. */
export async function getCompanyAdminOrg(userId: string): Promise<CompanyOrg | null> {
  const rows = await db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      metadata: organization.metadata,
    })
    .from(member)
    .innerJoin(organization, eq(organization.id, member.organizationId))
    .where(and(eq(member.userId, userId), inArray(member.role, ["owner", "admin"])));

  for (const r of rows) {
    const meta = parseOrgMetadata(r.metadata);
    if (meta?.type === "company") {
      return { id: r.id, name: r.name, slug: r.slug, seatLimit: meta.seatLimit };
    }
  }
  return null;
}

/** Flag di navigazione per la shell discente (link condizionali area azienda/staff). */
export async function getNavContext(user: { id: string; email: string }) {
  const companyOrg = await getCompanyAdminOrg(user.id);
  return { isStaff: isPlatformStaffEmail(user.email), companyOrg };
}

/**
 * Contesto azienda per query/azioni admin: risolve ESPLICITAMENTE l'org azienda
 * amministrata (NON l'org attiva di sessione, inaffidabile per utenti con più org).
 * L'appartenenza owner/admin è già garantita da getCompanyAdminOrg.
 */
export async function requireCompanyContext() {
  const { user } = await requireSession();
  const org = await getCompanyAdminOrg(user.id);
  if (!org) throw new Error("Nessuna azienda amministrata.");
  return { user, org };
}
