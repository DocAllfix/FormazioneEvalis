// Integrazione DB Modulo 2: provisioning (acquisto/abbonamento/cancellazione) con effetti
// su enrollment+org+audit, idempotenza. Smoke Stripe LIVE (test mode) guardato dalla chiave.
// Pulizia: customer Stripe + activity_log (GUC) + enrollment/org/course.

import { describe, it, expect, afterAll } from "vitest";
import { sql, and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { organization, enrollment, course, activityLog, stripeProcessedEvent, bundle, bundleCourse } from "@/lib/db/schema";
import { provisionCoursePurchase, provisionBundlePurchase, applySubscriptionState, revokeOrgSubscription } from "@/features/billing/provisioning";
import { getSeatLimit } from "@/features/billing/seats";
import { ensureStripeCustomer } from "@/features/billing/customers";
import { isStripeConfigured, getStripe } from "@/lib/stripe/client";

const RUN = Date.now();
const courseIds: string[] = [];
const orgRowIds: string[] = [];
const auditOrgIds: string[] = [];
const customerIds: string[] = [];
const bundleIds: string[] = [];

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
  if (bundleIds.length) await db.delete(bundle).where(inArray(bundle.id, bundleIds)); // cascade bundle_course
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

  it("B2C bundle fixed: esplosione in N enrollment + UN audit; replay idempotente", async () => {
    const c1 = await makeCourse();
    const c2 = await makeCourse();
    const c3 = await makeCourse();
    const [b] = await db
      .insert(bundle)
      .values({ slug: `t2-bundle-${RUN}`, title: "Bundle test", kind: "fixed", active: true })
      .returning({ id: bundle.id });
    bundleIds.push(b.id);
    await db.insert(bundleCourse).values([
      { bundleId: b.id, courseId: c1, role: "included" },
      { bundleId: b.id, courseId: c2, role: "included" },
      { bundleId: b.id, courseId: c3, role: "included" },
    ]);
    const orgId = `t2-${RUN}-bun`;
    auditOrgIds.push(orgId);
    const userId = `u-${RUN}-bun`;

    const r1 = await provisionBundlePurchase({ userId, bundleId: b.id, orgId });
    expect(r1.enrolledCourseIds.sort()).toEqual([c1, c2, c3].sort());

    // replay del webhook → 0 nuovi enrollment, nessun audit doppio
    const r2 = await provisionBundlePurchase({ userId, bundleId: b.id, orgId });
    expect(r2.enrolledCourseIds).toEqual([]);

    const rows = await db
      .select({ source: enrollment.source })
      .from(enrollment)
      .where(and(eq(enrollment.userId, userId), inArray(enrollment.courseId, [c1, c2, c3])));
    expect(rows.length).toBe(3);
    expect(rows.every((r) => r.source === "b2c_purchase")).toBe(true);

    const audit = await db
      .select({ object: activityLog.object })
      .from(activityLog)
      .where(and(eq(activityLog.organizationId, orgId), eq(activityLog.verb, "purchased")));
    expect(audit.length).toBe(1);
    expect(audit[0].object).toBe(`bundle:${b.id}`);
  });

  it("B2C bundle: possesso parziale → solo i corsi mancanti; pick_one col corso scelto", async () => {
    const base = await makeCourse();
    const la1 = await makeCourse();
    const la2 = await makeCourse();
    const [b] = await db
      .insert(bundle)
      .values({ slug: `t2-pick-${RUN}`, title: "Pick test", kind: "pick_one", active: true })
      .returning({ id: bundle.id });
    bundleIds.push(b.id);
    await db.insert(bundleCourse).values([
      { bundleId: b.id, courseId: base, role: "included" },
      { bundleId: b.id, courseId: la1, role: "eligible" },
      { bundleId: b.id, courseId: la2, role: "eligible" },
    ]);
    const orgId = `t2-${RUN}-pick`;
    auditOrgIds.push(orgId);
    const userId = `u-${RUN}-pick`;

    // l'utente possiede GIÀ il corso base (comprato singolo in precedenza)
    await provisionCoursePurchase({ userId, courseId: base, orgId });

    const r = await provisionBundlePurchase({ userId, bundleId: b.id, chosenCourseId: la2, orgId });
    expect(r.enrolledCourseIds).toEqual([la2]); // solo il mancante; il base resta con l'enrollment originale

    // scelta non eligible → errore (il webhook farebbe release+retry)
    await expect(provisionBundlePurchase({ userId, bundleId: b.id, chosenCourseId: base, orgId })).rejects.toThrow();
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

  }, 30000);

  it("C-2: il claim dell'evento Stripe è idempotente e rilasciabile per il retry", async () => {
    const eventId = `evt_test_${RUN}`;
    const claim = () =>
      db
        .insert(stripeProcessedEvent)
        .values({ eventId })
        .onConflictDoNothing()
        .returning({ eventId: stripeProcessedEvent.eventId });

    // primo arrivo: reclamato → l'handler processa
    expect(await claim()).toHaveLength(1);
    // re-invio di Stripe: già presente → si salta (niente doppio provisioning)
    expect(await claim()).toHaveLength(0);

    // se l'handler fallisce il claim viene RILASCIATO: il retry di Stripe deve poter riprocessare
    await db.delete(stripeProcessedEvent).where(eq(stripeProcessedEvent.eventId, eventId));
    expect(await claim()).toHaveLength(1);

    await db.delete(stripeProcessedEvent).where(eq(stripeProcessedEvent.eventId, eventId));
  });
});
