// Integrazione DB Modulo 2: provisioning (acquisto/abbonamento/cancellazione) con effetti
// su enrollment+org+audit, idempotenza. Smoke Stripe LIVE (test mode) guardato dalla chiave.
// Pulizia: customer Stripe + activity_log (GUC) + enrollment/org/course.

import { describe, it, expect, afterAll } from "vitest";
import { sql, and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { organization, enrollment, course, activityLog } from "@/lib/db/schema";
import { provisionCoursePurchase, applySubscriptionState, revokeOrgSubscription } from "@/features/billing/provisioning";
import { getSeatLimit } from "@/features/billing/seats";
import { ensureStripeCustomer } from "@/features/billing/customers";
import { isStripeConfigured, getStripe } from "@/lib/stripe/client";

const RUN = Date.now();
const courseIds: string[] = [];
const orgRowIds: string[] = [];
const auditOrgIds: string[] = [];
const customerIds: string[] = [];

afterAll(async () => {
  for (const c of customerIds) {
    try {
      await getStripe().customers.del(c);
    } catch {
      /* ignore */
    }
  }
  if (auditOrgIds.length) {
    await db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL app.audit_maintenance = 'on'`);
      await tx.delete(activityLog).where(inArray(activityLog.organizationId, auditOrgIds));
    });
  }
  if (courseIds.length) await db.delete(course).where(inArray(course.id, courseIds)); // cascade enrollment
  if (orgRowIds.length) await db.delete(organization).where(inArray(organization.id, orgRowIds));
});

async function makeCourse(): Promise<string> {
  const [c] = await db
    .insert(course)
    .values({ title: `Corso billing ${RUN}`, status: "published", requiredMinutes: 0 })
    .returning({ id: course.id });
  courseIds.push(c.id);
  return c.id;
}

async function makeOrg(stripeCustomerId: string): Promise<string> {
  const id = `t2-${RUN}-${Math.random().toString(36).slice(2, 8)}`;
  await db.insert(organization).values({
    id,
    name: "Azienda Test",
    slug: id,
    createdAt: new Date(),
    stripeCustomerId,
  });
  orgRowIds.push(id);
  auditOrgIds.push(id);
  return id;
}

describe("Modulo 2 — provisioning billing", () => {
  it("B2C: acquisto corso → enrollment b2c_purchase (idempotente) + audit", async () => {
    const courseId = await makeCourse();
    const orgId = `t2-${RUN}-bc`;
    auditOrgIds.push(orgId);
    const userId = `u-${RUN}-bc`;

    const r1 = await provisionCoursePurchase({ userId, courseId, orgId });
    const r2 = await provisionCoursePurchase({ userId, courseId, orgId }); // evento doppio
    expect(r1.enrolled).toBe(true);
    expect(r2.enrolled).toBe(false); // idempotente

    const rows = await db
      .select({ source: enrollment.source, status: enrollment.status })
      .from(enrollment)
      .where(and(eq(enrollment.userId, userId), eq(enrollment.courseId, courseId)));
    expect(rows.length).toBe(1);
    expect(rows[0].source).toBe("b2c_purchase");

    const audit = await db
      .select({ id: activityLog.id })
      .from(activityLog)
      .where(and(eq(activityLog.organizationId, orgId), eq(activityLog.verb, "purchased")));
    expect(audit.length).toBe(1);
  });

  it("B2B: subscription updated → org.seats aggiornati (+ getSeatLimit)", async () => {
    const orgId = await makeOrg(`cus_test_${RUN}_a`);
    const res = await applySubscriptionState({
      stripeCustomerId: `cus_test_${RUN}_a`,
      subscriptionId: "sub_test_a",
      quantity: 7,
      status: "active",
      plan: "price_x",
    });
    expect(res.updated).toBe(true);
    expect(await getSeatLimit(orgId)).toBe(7);
  });

  it("B2B: cancellazione → enrollment seat revocati + org canceled", async () => {
    const courseId = await makeCourse();
    const customer = `cus_test_${RUN}_b`;
    const orgId = await makeOrg(customer);
    const userId = `u-${RUN}-seat`;
    await db.insert(enrollment).values({ organizationId: orgId, userId, courseId, source: "b2b_seat", status: "active" });

    const res = await revokeOrgSubscription(customer);
    expect(res.revoked).toBe(true);

    const [enr] = await db
      .select({ status: enrollment.status })
      .from(enrollment)
      .where(and(eq(enrollment.organizationId, orgId), eq(enrollment.userId, userId)));
    expect(enr.status).toBe("revoked");

    const [org] = await db
      .select({ seats: organization.seats, status: organization.subscriptionStatus })
      .from(organization)
      .where(eq(organization.id, orgId));
    expect(org.seats).toBe(0);
    expect(org.status).toBe("canceled");
  });

  it.skipIf(!isStripeConfigured())("smoke Stripe live: customer + checkout subscription URL", async () => {
    const orgId = `t2-${RUN}-smoke`;
    await db.insert(organization).values({ id: orgId, name: "Smoke", slug: orgId, createdAt: new Date() });
    orgRowIds.push(orgId);

    const customerId = await ensureStripeCustomer(orgId);
    customerIds.push(customerId);
    expect(customerId.startsWith("cus_")).toBe(true);

    const seatPrice = process.env.STRIPE_SEAT_PRICE_ID;
    if (seatPrice) {
      const session = await getStripe().checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: seatPrice, quantity: 2 }],
        success_url: "http://localhost:3000/ok",
        cancel_url: "http://localhost:3000/cancel",
      });
      expect(session.url?.startsWith("https://")).toBe(true);
    }
  }, 30000);
});
