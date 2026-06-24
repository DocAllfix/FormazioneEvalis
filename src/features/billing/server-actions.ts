"use server";

// Server Actions billing. Wrapper sottili sulle azioni di checkout (che applicano
// già i gate). Ritornano l'URL Stripe; il redirect lo fa la UI. Nessuna logica qui.

import {
  createCoursePurchaseCheckout,
  createSeatSubscriptionCheckout,
  createBillingPortalSession,
} from "@/features/billing/checkout";

/** B2C: avvia il checkout d'acquisto di un corso → URL Stripe. */
export async function buyCourseAction(courseId: string): Promise<string> {
  return createCoursePurchaseCheckout(courseId);
}

/** B2B: avvia il checkout dell'abbonamento a posti (quantity = posti) → URL Stripe. */
export async function buySeatsAction(seats: number): Promise<string> {
  return createSeatSubscriptionCheckout(seats);
}

/** B2B: apre il Customer Portal Stripe (gestione posti/cancellazione) → URL. */
export async function openBillingPortalAction(): Promise<string> {
  return createBillingPortalSession();
}
