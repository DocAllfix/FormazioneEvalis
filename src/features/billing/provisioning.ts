// Effetti del billing sul NOSTRO DB (testabili, niente rete). La verità dello stato
// abbonamento è qui, sincronizzata dal webhook. Eventi nella catena audit (Modulo 6).

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { organization, enrollment } from "@/lib/db/schema";
import { appendActivity } from "@/features/audit/log";
import { withTenant } from "@/lib/db/tenant";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DbOrTx = typeof db | Tx;

async function orgIdByCustomer(exec: DbOrTx, stripeCustomerId: string): Promise<string | undefined> {
  const [o] = await exec
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.stripeCustomerId, stripeCustomerId))
    .limit(1);
  return o?.id;
}

/** B2C: acquisto corso → enrollment idempotente + audit `purchased`. Scope org (GUC). */
export async function provisionCoursePurchase(params: {
  userId: string;
  courseId: string;
  orgId: string;
}): Promise<{ enrolled: boolean }> {
  const { userId, courseId, orgId } = params;
  return withTenant({ orgId }, async (tx) => {
    const inserted = await tx
      .insert(enrollment)
      .values({ organizationId: orgId, userId, courseId, source: "b2c_purchase", status: "active" })
      .onConflictDoNothing({ target: [enrollment.userId, enrollment.courseId] })
      .returning({ id: enrollment.id });
    if (inserted.length > 0) {
      await appendActivity(tx, {
        organizationId: orgId,
        userId,
        verb: "purchased",
        object: `course:${courseId}`,
        payload: { enrollmentId: inserted[0].id },
      });
    }
    return { enrolled: inserted.length > 0 };
  });
}

/** B2B: stato abbonamento → org.seats/status + audit. */
export async function applySubscriptionState(params: {
  stripeCustomerId: string;
  subscriptionId: string;
  quantity: number;
  status: string;
  plan: string | null;
}): Promise<{ updated: boolean; orgId?: string }> {
  const { stripeCustomerId, subscriptionId, quantity, status, plan } = params;
  return db.transaction(async (tx) => {
    const orgId = await orgIdByCustomer(tx, stripeCustomerId);
    if (!orgId) return { updated: false };
    await tx
      .update(organization)
      .set({ stripeSubscriptionId: subscriptionId, seats: quantity, subscriptionStatus: status, plan })
      .where(eq(organization.id, orgId));
    await appendActivity(tx, {
      organizationId: orgId,
      userId: null,
      verb: "subscription-updated",
      object: `subscription:${subscriptionId}`,
      payload: { quantity, status },
    });
    return { updated: true, orgId };
  });
}

/** B2B: cancellazione → revoca immediata degli accessi seat + org canceled + audit. */
export async function revokeOrgSubscription(
  stripeCustomerId: string,
): Promise<{ revoked: boolean; orgId?: string }> {
  const orgId = await orgIdByCustomer(db, stripeCustomerId);
  if (!orgId) return { revoked: false };
  return withTenant({ orgId }, async (tx) => {
    await tx
      .update(organization)
      .set({ subscriptionStatus: "canceled", seats: 0 })
      .where(eq(organization.id, orgId));
    await tx
      .update(enrollment)
      .set({ status: "revoked" })
      .where(and(eq(enrollment.organizationId, orgId), eq(enrollment.source, "b2b_seat")));
    await appendActivity(tx, {
      organizationId: orgId,
      userId: null,
      verb: "subscription-canceled",
      object: `customer:${stripeCustomerId}`,
    });
    return { revoked: true, orgId };
  });
}
