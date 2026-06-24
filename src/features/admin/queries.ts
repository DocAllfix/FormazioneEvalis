// Letture area AZIENDA (gate owner/admin sull'org attiva = azienda). Sottili: riusano
// gli helper esistenti (seats). Nessuna logica di compliance qui.

import { and, count, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { member, user, enrollment, certificate, invitation, organization } from "@/lib/db/schema";
import { countMembers, getSeatLimit } from "@/features/billing/seats";
import { parseOrgMetadata } from "@/features/auth/org-metadata";
import { requireCompanyContext } from "@/features/admin/context";

export type OrgOverview = {
  orgId: string;
  name: string;
  slug: string;
  seatsUsed: number;
  seatLimit: number;
  subscriptionStatus: string | null;
  plan: string | null;
};

export async function getOrgOverview(): Promise<OrgOverview> {
  const { org } = await requireCompanyContext();
  const orgId = org.id;
  const [used, limit] = await Promise.all([countMembers(orgId), getSeatLimit(orgId)]);
  const [orgRow] = await db
    .select({ metadata: organization.metadata })
    .from(organization)
    .where(eq(organization.id, orgId))
    .limit(1);
  const meta = parseOrgMetadata(orgRow?.metadata);
  return {
    orgId,
    name: org.name,
    slug: org.slug,
    seatsUsed: used,
    seatLimit: limit,
    subscriptionStatus: meta?.status ?? null,
    plan: meta?.plan ?? null,
  };
}

export type OrgMember = {
  userId: string;
  name: string | null;
  email: string;
  role: string;
  assigned: number;
  certified: number;
};

export async function getOrgMembersWithDetails(): Promise<OrgMember[]> {
  const { org } = await requireCompanyContext();
  const orgId = org.id;

  const members = await db
    .select({ userId: member.userId, role: member.role, name: user.name, email: user.email })
    .from(member)
    .innerJoin(user, eq(user.id, member.userId))
    .where(eq(member.organizationId, orgId));

  // Conteggi aggregati per utente (2 query con GROUP BY, non N+1).
  const assignedRows = await db
    .select({ userId: enrollment.userId, n: count() })
    .from(enrollment)
    .where(eq(enrollment.organizationId, orgId))
    .groupBy(enrollment.userId);
  const assigned = new Map(assignedRows.map((r) => [r.userId, Number(r.n)]));

  const certRows = await db
    .select({ userId: enrollment.userId, n: count() })
    .from(certificate)
    .innerJoin(enrollment, eq(enrollment.id, certificate.enrollmentId))
    .where(and(eq(enrollment.organizationId, orgId), eq(certificate.status, "issued")))
    .groupBy(enrollment.userId);
  const certified = new Map(certRows.map((r) => [r.userId, Number(r.n)]));

  return members.map((m) => ({
    userId: m.userId,
    name: m.name,
    email: m.email,
    role: m.role,
    assigned: assigned.get(m.userId) ?? 0,
    certified: certified.get(m.userId) ?? 0,
  }));
}

export type OrgInvitation = { id: string; email: string; role: string };

export async function listOrgInvitations(): Promise<OrgInvitation[]> {
  const { org } = await requireCompanyContext();
  const orgId = org.id;
  const rows = await db
    .select({ id: invitation.id, email: invitation.email, role: invitation.role })
    .from(invitation)
    .where(and(eq(invitation.organizationId, orgId), eq(invitation.status, "pending")));
  return rows.map((r) => ({ id: r.id, email: r.email, role: r.role ?? "member" }));
}
