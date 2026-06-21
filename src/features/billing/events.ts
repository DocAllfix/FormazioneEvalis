// Mappatura PURA evento Stripe → azione di provisioning (testabile senza rete/DB).

import type Stripe from "stripe";

export type BillingAction =
  | { action: "course_purchase"; userId: string; courseId: string; orgId: string }
  | { action: "subscription_upsert"; stripeCustomerId: string; subscriptionId: string; quantity: number; status: string; plan: string | null }
  | { action: "subscription_revoke"; stripeCustomerId: string }
  | { action: "ignore" };

function customerId(c: string | { id: string } | null): string {
  return typeof c === "string" ? c : c?.id ?? "";
}

export function planFromEvent(event: Stripe.Event): BillingAction {
  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      const m = s.metadata;
      if (s.mode === "payment" && m?.kind === "course_purchase" && m.userId && m.courseId && m.orgId) {
        return { action: "course_purchase", userId: m.userId, courseId: m.courseId, orgId: m.orgId };
      }
      return { action: "ignore" };
    }
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const item = sub.items.data[0];
      return {
        action: "subscription_upsert",
        stripeCustomerId: customerId(sub.customer as string | { id: string } | null),
        subscriptionId: sub.id,
        quantity: item?.quantity ?? 0,
        status: sub.status,
        plan: item?.price?.id ?? null,
      };
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      return { action: "subscription_revoke", stripeCustomerId: customerId(sub.customer as string | { id: string } | null) };
    }
    default:
      return { action: "ignore" };
  }
}
