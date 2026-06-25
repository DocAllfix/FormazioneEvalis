// Distribuzione corsi: l'admin/owner dell'azienda assegna un corso a un dipendente
// → crea un enrollment (source b2b_seat) scoping-ato all'org attiva. Idempotente.
// Chiude la catena org → seat → user → enrollment.

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { course, enrollment, member } from "@/lib/db/schema";
import { requireRole, requireActiveOrg } from "@/features/auth/guards";
import { appendActivity } from "@/features/audit/log";
import { withTenant } from "@/lib/db/tenant";

/** Server Action: l'admin/owner dell'org attiva assegna un corso a un dipendente. */
export async function assignCourse(memberUserId: string, courseId: string) {
  const { orgId } = await requireRole("owner", "admin");
  return enrollMemberInCourse({ orgId, memberUserId, courseId });
}

/**
 * Logica di assegnazione (senza guard, testabile): valida membership + corso e crea
 * l'enrollment b2b_seat. Idempotente grazie a unique(userId, courseId).
 */
export async function enrollMemberInCourse(params: {
  orgId: string;
  memberUserId: string;
  courseId: string;
}) {
  const { orgId, memberUserId, courseId } = params;

  // il destinatario deve essere membro dell'org
  const [m] = await db
    .select({ id: member.id })
    .from(member)
    .where(and(eq(member.userId, memberUserId), eq(member.organizationId, orgId)))
    .limit(1);
  if (!m) throw new Error("L'utente non è un membro di questa organizzazione.");

  // il corso deve esistere ed essere globale (org null) o dell'org corrente
  const [c] = await db
    .select({ id: course.id, organizationId: course.organizationId })
    .from(course)
    .where(eq(course.id, courseId))
    .limit(1);
  if (!c) throw new Error("Corso inesistente.");
  if (c.organizationId && c.organizationId !== orgId) {
    throw new Error("Corso non disponibile per questa organizzazione.");
  }

  // insert + audit atomici: l'evento `enrolled` si scrive solo se l'enrollment è
  // davvero nuovo (l'idempotenza non deve generare eventi duplicati).
  await withTenant({ orgId }, async (tx) => {
    const inserted = await tx
      .insert(enrollment)
      .values({ organizationId: orgId, userId: memberUserId, courseId, source: "b2b_seat", status: "active" })
      .onConflictDoNothing({ target: [enrollment.userId, enrollment.courseId] })
      .returning({ id: enrollment.id });
    if (inserted.length > 0) {
      await appendActivity(tx, {
        organizationId: orgId,
        userId: memberUserId,
        verb: "enrolled",
        object: `course:${courseId}`,
        payload: { enrollmentId: inserted[0].id, source: "b2b_seat" },
      });
    }
  });

  return { ok: true as const, orgId, userId: memberUserId, courseId };
}

/** Lista membri dell'org attiva (superficie per la dashboard admin). Progress: slice tracking. */
export async function listOrgMembers() {
  const { orgId } = await requireActiveOrg();
  return db
    .select({ userId: member.userId, role: member.role })
    .from(member)
    .where(eq(member.organizationId, orgId));
}

/** Seed: corso globale di test (per dev/test). */
export async function createTestCourse(title = "Corso di test"): Promise<string> {
  const [c] = await db
    .insert(course)
    .values({ title, status: "published" })
    .returning({ id: course.id });
  return c.id;
}
