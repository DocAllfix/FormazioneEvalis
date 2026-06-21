// Test puro della mappatura evento Stripe → azione (planFromEvent). Nessuna rete/DB.

import { describe, it, expect } from "vitest";
import type Stripe from "stripe";
import { planFromEvent } from "../features/billing/events";

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
});
