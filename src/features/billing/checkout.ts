// Azioni di checkout (avviate dall'utente). Ritornano un URL Stripe che la UI
// usa per il redirect. Protette dai guard esistenti. Nessuna logica di pagamento qui:
// il pagamento vive su Stripe, la verità di stato arriva dal webhook.

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { course } from "@/lib/db/schema";
import { getStripe } from "@/lib/stripe/client";
import { requireActiveOrg, requireRole } from "@/features/auth/guards";
import { ensureStripeCustomer } from "./customers";

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/** B2C: acquisto one-off di un corso → enrollment (via webhook). */
export async function createCoursePurchaseCheckout(courseId: string): Promise<string> {
  const { user, orgId } = await requireActiveOrg();
  const [c] = await db
    .select({ stripePriceId: course.stripePriceId })
    .from(course)
    .where(eq(course.id, courseId))
    .limit(1);
  if (!c) throw new Error("Corso inesistente.");
  if (!c.stripePriceId) throw new Error("Corso non acquistabile singolarmente (prezzo non configurato).");

  const customerId = await ensureStripeCustomer(orgId);
  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    line_items: [{ price: c.stripePriceId, quantity: 1 }],
    metadata: { kind: "course_purchase", userId: user.id, courseId, orgId },
    success_url: `${appUrl()}/dashboard?purchase=success`,
    cancel_url: `${appUrl()}/dashboard?purchase=cancel`,
  });
  if (!session.url) throw new Error("URL checkout non disponibile.");
  return session.url;
}

/** B2B: abbonamento a posti (quantity = seats) → org.seats (via webhook). */
export async function createSeatSubscriptionCheckout(seats: number): Promise<string> {
  if (!Number.isInteger(seats) || seats < 1) throw new Error("Numero posti non valido.");
  const { orgId } = await requireRole("owner", "admin");
  const priceId = process.env.STRIPE_SEAT_PRICE_ID;
  if (!priceId) throw new Error("STRIPE_SEAT_PRICE_ID non impostato.");

  const customerId = await ensureStripeCustomer(orgId);
  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: seats }],
    metadata: { kind: "seat_subscription", orgId },
    subscription_data: { metadata: { orgId } },
    success_url: `${appUrl()}/admin/billing?sub=success`,
    cancel_url: `${appUrl()}/admin/billing?sub=cancel`,
  });
  if (!session.url) throw new Error("URL checkout non disponibile.");
  return session.url;
}

/** B2B: Customer Portal (cambio posti / cancellazione gestiti da Stripe). */
export async function createBillingPortalSession(): Promise<string> {
  const { orgId } = await requireRole("owner", "admin");
  const customerId = await ensureStripeCustomer(orgId);
  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl()}/admin/billing`,
  });
  return session.url;
}
