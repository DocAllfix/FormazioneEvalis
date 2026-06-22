// Guard server-side: sessione, organizzazione attiva, ruolo. Superficie che le
// Server Actions e (tramite esse) il frontend useranno per proteggere le azioni.
// Convenzione scoping: ogni query di dominio filtra per l'org attiva (prima barriera);
// RLS Supabase = seconda barriera (slice successivo).

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { member } from "@/lib/db/schema";
import { getCurrentSession } from "@/lib/auth/server";

export async function requireSession() {
  const ctx = await getCurrentSession();
  if (!ctx) throw new Error("Non autenticato.");
  return ctx;
}

/** Prima organizzazione di cui l'utente è membro (fallback per l'org attiva). */
export async function firstMembershipOrgId(userId: string): Promise<string | null> {
  const [m] = await db
    .select({ orgId: member.organizationId })
    .from(member)
    .where(eq(member.userId, userId))
    .limit(1);
  return m?.orgId ?? null;
}

export async function requireActiveOrg() {
  const ctx = await requireSession();
  // Risoluzione lazy: better-auth può creare la sessione prima dell'org personale
  // (hook user.create.after), quindi activeOrganizationId può essere null al primo accesso.
  const orgId = ctx.session.activeOrganizationId ?? (await firstMembershipOrgId(ctx.user.id));
  if (!orgId) throw new Error("Nessuna organizzazione attiva.");
  return { ...ctx, orgId };
}

export async function getMemberRole(userId: string, orgId: string): Promise<string | null> {
  const [m] = await db
    .select({ role: member.role })
    .from(member)
    .where(and(eq(member.userId, userId), eq(member.organizationId, orgId)))
    .limit(1);
  return m?.role ?? null;
}

/** Richiede che l'utente abbia uno dei ruoli indicati nell'org attiva, altrimenti lancia. */
export async function requireRole(...roles: string[]) {
  const { user, session, orgId } = await requireActiveOrg();
  const role = await getMemberRole(user.id, orgId);
  if (!role || !roles.includes(role)) {
    throw new Error(
      `Permesso negato: richiesto ${roles.join("|")}, attuale "${role ?? "nessuno"}".`,
    );
  }
  return { user, session, orgId, role };
}

/**
 * Staff della piattaforma (ente accreditato): revisore certificati, TRASVERSALE alle org.
 * Allowlist via env `PLATFORM_STAFF_EMAILS` (CSV), letta a runtime. Funzione pura testabile.
 */
export function isPlatformStaffEmail(email: string): boolean {
  const list = (process.env.PLATFORM_STAFF_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.trim().toLowerCase());
}

/** Richiede che l'utente in sessione sia staff piattaforma, altrimenti lancia. */
export async function requirePlatformStaff() {
  const ctx = await requireSession();
  if (!isPlatformStaffEmail(ctx.user.email)) {
    throw new Error("Permesso negato: richiesto staff piattaforma.");
  }
  return ctx;
}
