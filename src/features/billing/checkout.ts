// Azioni di checkout (avviate dall'utente). Ritornano un URL Stripe che la UI
// usa per il redirect. Protette dai guard esistenti. Nessuna logica di pagamento qui:
// il pagamento vive su Stripe, la verità di stato arriva dal webhook.

import { and, count, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { course, enrollment, organization } from "@/lib/db/schema";
import { getStripe } from "@/lib/stripe/client";
import { requireActiveOrg, requireRole } from "@/features/auth/guards";
import { parseOrgMetadata } from "@/features/auth/org-metadata";
import { ensureStripeCustomer } from "./customers";
import { loadBundleWithCourses, resolveBundleCourseIds } from "./bundles";
import { COMPANY_COUPONS, companyDiscountPercent } from "./discounts";

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// IVA (Stripe Tax): i Price sono tax-exclusive ("+ IVA"), Stripe calcola e aggiunge
// l'imposta al checkout. `customer_update` è OBBLIGATORIO col customer esistente:
// senza, i customer creati prima (senza indirizzo) fanno fallire sessions.create.
// Esportato: l'E2E (scripts/produzione/_e2e-listino.ts) riusa ESATTAMENTE questi parametri.
export const TAX_PARAMS = {
  automatic_tax: { enabled: true },
  billing_address_collection: "required",
  tax_id_collection: { enabled: true },
  customer_update: { address: "auto", name: "auto" },
} as const;

/** % sconto azienda per l'acquisto di un corso da parte dell'org attiva (0 | 20 | 30). */
export async function courseCompanyDiscountPercent(orgId: string, courseId: string): Promise<0 | 20 | 30> {
  const [org] = await db
    .select({ metadata: organization.metadata })
    .from(organization)
    .where(eq(organization.id, orgId))
    .limit(1);
  const isCompanyOrg = parseOrgMetadata(org?.metadata)?.type === "company";
  if (!isCompanyOrg) return 0; // org personale B2C: mai sconto azienda (query sotto evitata)
  const [prior] = await db
    .select({ n: count() })
    .from(enrollment)
    .where(
      and(
        eq(enrollment.organizationId, orgId),
        eq(enrollment.courseId, courseId),
        eq(enrollment.source, "b2c_purchase"),
        eq(enrollment.status, "active"),
      ),
    );
  return companyDiscountPercent({ isCompanyOrg, priorCoursePurchases: prior?.n ?? 0 });
}

/** B2C: acquisto one-off di un corso → enrollment (via webhook).
 * Sconto azienda applicato AUTOMATICAMENTE (−20% dal 2° iscritto, −30% dal 5°). */
export async function createCoursePurchaseCheckout(courseId: string): Promise<string> {
  const { user, orgId } = await requireActiveOrg();
  const [c] = await db
    .select({ stripePriceId: course.stripePriceId })
    .from(course)
    .where(eq(course.id, courseId))
    .limit(1);
  if (!c) throw new Error("Corso inesistente.");
  if (!c.stripePriceId) throw new Error("Corso non acquistabile singolarmente (prezzo non configurato).");

  const percent = await courseCompanyDiscountPercent(orgId, courseId);
  const customerId = await ensureStripeCustomer(orgId);
  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    line_items: [{ price: c.stripePriceId, quantity: 1 }],
    // `discounts` è mutuamente esclusivo con allow_promotion_codes (che non usiamo)
    ...(percent !== 0 ? { discounts: [{ coupon: COMPANY_COUPONS[percent] }] } : {}),
    ...TAX_PARAMS,
    metadata: { kind: "course_purchase", userId: user.id, courseId, orgId },
    success_url: `${appUrl()}/dashboard?purchase=success`,
    cancel_url: `${appUrl()}/dashboard?purchase=cancel`,
  });
  if (!session.url) throw new Error("URL checkout non disponibile.");
  return session.url;
}

/** B2C: acquisto one-off di un PACCHETTO → N enrollment (via webhook). Il prezzo è quello
 * del bundle (un solo line_item); per i pick_one `chosenCourseId` è il corso a scelta,
 * validato qui (fail-fast) e riverificato dal provisioning. Nessuno sconto azienda. */
export async function createBundlePurchaseCheckout(bundleId: string, chosenCourseId?: string): Promise<string> {
  const { user, orgId } = await requireActiveOrg();
  const { bundle: b, links } = await loadBundleWithCourses(bundleId);
  if (!b.active) throw new Error("Pacchetto non disponibile.");
  if (!b.stripePriceId) throw new Error("Pacchetto non acquistabile (prezzo non configurato).");
  resolveBundleCourseIds(b, links, chosenCourseId); // valida la composizione prima di toccare Stripe

  const customerId = await ensureStripeCustomer(orgId);
  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    line_items: [{ price: b.stripePriceId, quantity: 1 }],
    ...TAX_PARAMS,
    metadata: {
      kind: "bundle_purchase",
      userId: user.id,
      bundleId,
      ...(chosenCourseId ? { chosenCourseId } : {}),
      orgId,
    },
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
