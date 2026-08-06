"use server";

// Server Actions billing. Wrapper sottili sulle azioni di checkout (che applicano
// già i gate). Ritornano l'URL Stripe; il redirect lo fa la UI. Nessuna logica qui.

import {
  createCoursePurchaseCheckout,
  createBundlePurchaseCheckout,
  createBillingPortalSession,
} from "@/features/billing/checkout";

/** B2C: avvia il checkout d'acquisto di un corso → URL Stripe. */
export async function buyCourseAction(courseId: string): Promise<string> {
  return createCoursePurchaseCheckout(courseId);
}

/** B2B: l'azienda acquista un corso PER un proprio dipendente (l'iscrizione va a lui).
 * I gate (ruolo owner/admin + membership del destinatario) sono nel checkout. */
export async function buyCourseForMemberAction(courseId: string, memberUserId: string): Promise<string> {
  return createCoursePurchaseCheckout(courseId, memberUserId);
}

/** B2C: avvia il checkout d'acquisto di un PACCHETTO → URL Stripe.
 * `chosenCourseId` = corso a scelta per i bundle pick_one. */
export async function buyBundleAction(bundleId: string, chosenCourseId?: string): Promise<string> {
  return createBundlePurchaseCheckout(bundleId, chosenCourseId);
}

/** B2B: apre il Customer Portal Stripe (gestione posti/cancellazione) → URL. */
export async function openBillingPortalAction(): Promise<string> {
  return createBillingPortalSession();
}
