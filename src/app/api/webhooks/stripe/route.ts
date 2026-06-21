// Webhook Stripe: verifica la firma (STRIPE_WEBHOOK_SECRET), mappa l'evento e applica
// il provisioning. Idempotente e veloce (200). La verità dello stato abbonamento è qui.

import { getStripe } from "@/lib/stripe/client";
import { planFromEvent } from "@/features/billing/events";
import {
  provisionCoursePurchase,
  applySubscriptionState,
  revokeOrgSubscription,
} from "@/features/billing/provisioning";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response("webhook non configurato", { status: 500 });
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("firma mancante", { status: 400 });

  const body = await req.text();
  let event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, secret);
  } catch {
    return new Response("firma non valida", { status: 400 });
  }

  const plan = planFromEvent(event);
  try {
    switch (plan.action) {
      case "course_purchase":
        await provisionCoursePurchase(plan);
        break;
      case "subscription_upsert":
        await applySubscriptionState(plan);
        break;
      case "subscription_revoke":
        await revokeOrgSubscription(plan.stripeCustomerId);
        break;
      case "ignore":
        break;
    }
  } catch (e) {
    console.error("[stripe webhook] handler error", e);
    return new Response("errore handler", { status: 500 });
  }
  return new Response("ok", { status: 200 });
}
