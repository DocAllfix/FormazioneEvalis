// Test puro della mappatura evento Stripe → azione (planFromEvent) e della risoluzione
// composizione bundle (resolveBundleCourseIds). Nessuna rete/DB.

import { describe, it, expect } from "vitest";
import type Stripe from "stripe";
import { planFromEvent } from "../features/billing/events";
import { resolveBundleCourseIds, type BundleLink } from "../features/billing/bundles";
import { companyDiscountPercent, COMPANY_COUPONS } from "../features/billing/discounts";

const ev = (type: string, object: unknown) => ({ type, data: { object } }) as unknown as Stripe.Event;

describe("planFromEvent", () => {
  it("checkout payment (course_purchase) → course_purchase", () => {
    const p = planFromEvent(
      ev("checkout.session.completed", {
        mode: "payment",
        metadata: { kind: "course_purchase", userId: "u1", courseId: "c1", orgId: "o1" },
      }),
    );
    expect(p).toEqual({ action: "course_purchase", userId: "u1", courseId: "c1", orgId: "o1" });
  });

  it("checkout subscription → ignore (gestito dagli eventi subscription)", () => {
    const p = planFromEvent(
      ev("checkout.session.completed", { mode: "subscription", metadata: { kind: "seat_subscription", orgId: "o1" } }),
    );
    expect(p.action).toBe("ignore");
  });

  it("subscription.updated → subscription_upsert (quantity/status/customer/plan)", () => {
    const p = planFromEvent(
      ev("customer.subscription.updated", {
        id: "sub_1",
        customer: "cus_1",
        status: "active",
        items: { data: [{ quantity: 5, price: { id: "price_1" } }] },
      }),
    );
    expect(p).toEqual({
      action: "subscription_upsert",
      stripeCustomerId: "cus_1",
      subscriptionId: "sub_1",
      quantity: 5,
      status: "active",
      plan: "price_1",
    });
  });

  it("subscription.deleted → subscription_revoke (customer come oggetto)", () => {
    const p = planFromEvent(
      ev("customer.subscription.deleted", { id: "sub_1", customer: { id: "cus_1" }, status: "canceled", items: { data: [] } }),
    );
    expect(p).toEqual({ action: "subscription_revoke", stripeCustomerId: "cus_1" });
  });

  it("evento non rilevante → ignore", () => {
    expect(planFromEvent(ev("invoice.paid", {})).action).toBe("ignore");
  });

  it("checkout payment (bundle_purchase) → bundle_purchase, con e senza corso a scelta", () => {
    const conScelta = planFromEvent(
      ev("checkout.session.completed", {
        mode: "payment",
        metadata: { kind: "bundle_purchase", userId: "u1", bundleId: "b1", chosenCourseId: "c9", orgId: "o1" },
      }),
    );
    expect(conScelta).toEqual({ action: "bundle_purchase", userId: "u1", bundleId: "b1", chosenCourseId: "c9", orgId: "o1" });

    const senzaScelta = planFromEvent(
      ev("checkout.session.completed", {
        mode: "payment",
        metadata: { kind: "bundle_purchase", userId: "u1", bundleId: "b1", orgId: "o1" },
      }),
    );
    expect(senzaScelta).toEqual({ action: "bundle_purchase", userId: "u1", bundleId: "b1", chosenCourseId: undefined, orgId: "o1" });
  });

  it("bundle_purchase con metadata incompleti → ignore", () => {
    const p = planFromEvent(
      ev("checkout.session.completed", { mode: "payment", metadata: { kind: "bundle_purchase", userId: "u1", orgId: "o1" } }),
    );
    expect(p.action).toBe("ignore");
  });
});

describe("resolveBundleCourseIds", () => {
  const links: BundleLink[] = [
    { courseId: "c-base", role: "included" },
    { courseId: "la1", role: "eligible" },
    { courseId: "la2", role: "eligible" },
  ];

  it("fixed → tutti gli included, chosen vietato", () => {
    const fixedLinks: BundleLink[] = [
      { courseId: "a", role: "included" },
      { courseId: "b", role: "included" },
    ];
    expect(resolveBundleCourseIds({ kind: "fixed" }, fixedLinks)).toEqual(["a", "b"]);
    expect(() => resolveBundleCourseIds({ kind: "fixed" }, fixedLinks, "a")).toThrow(/non prevede/);
  });

  it("fixed senza corsi → errore", () => {
    expect(() => resolveBundleCourseIds({ kind: "fixed" }, [])).toThrow(/senza corsi/);
  });

  it("pick_one → included + scelto; senza scelta → errore", () => {
    expect(resolveBundleCourseIds({ kind: "pick_one" }, links, "la2")).toEqual(["c-base", "la2"]);
    expect(() => resolveBundleCourseIds({ kind: "pick_one" }, links)).toThrow(/Seleziona/);
  });

  it("pick_one con scelta non eligible (o included spacciato per scelta) → errore", () => {
    expect(() => resolveBundleCourseIds({ kind: "pick_one" }, links, "estraneo")).toThrow(/non valido/);
    expect(() => resolveBundleCourseIds({ kind: "pick_one" }, links, "c-base")).toThrow(/non valido/);
  });
});

describe("companyDiscountPercent (sconto azienda automatico)", () => {
  it("org personale → mai sconto, anche con acquisti precedenti", () => {
    expect(companyDiscountPercent({ isCompanyOrg: false, priorCoursePurchases: 0 })).toBe(0);
    expect(companyDiscountPercent({ isCompanyOrg: false, priorCoursePurchases: 10 })).toBe(0);
  });

  it("azienda: 1° iscritto pieno, dal 2° −20%, dal 5° −30%", () => {
    expect(companyDiscountPercent({ isCompanyOrg: true, priorCoursePurchases: 0 })).toBe(0); // 1° iscritto
    expect(companyDiscountPercent({ isCompanyOrg: true, priorCoursePurchases: 1 })).toBe(20); // 2°
    expect(companyDiscountPercent({ isCompanyOrg: true, priorCoursePurchases: 3 })).toBe(20); // 4°
    expect(companyDiscountPercent({ isCompanyOrg: true, priorCoursePurchases: 4 })).toBe(30); // 5°
    expect(companyDiscountPercent({ isCompanyOrg: true, priorCoursePurchases: 9 })).toBe(30); // 10°
  });

  it("le % mappano su coupon Stripe con ID fisso", () => {
    expect(COMPANY_COUPONS[20]).toBe("azienda-20");
    expect(COMPANY_COUPONS[30]).toBe("azienda-30");
  });
});
