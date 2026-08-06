// Azioni di checkout (avviate dall'utente). Ritornano un URL Stripe che la UI
// usa per il redirect. Protette dai guard esistenti. Nessuna logica di pagamento qui:
// il pagamento vive su Stripe, la verità di stato arriva dal webhook.

import { and, count, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { course, enrollment, member, organization } from "@/lib/db/schema";
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
 * Sconto azienda applicato AUTOMATICAMENTE (−20% dal 2° iscritto, −30% dal 5°).
 * `beneficiaryUserId`: l'azienda può comprare PER un proprio dipendente (l'iscrizione va
 * a lui). Consentito solo a owner/admin dell'org e solo verso membri della stessa org. */
export async function createCoursePurchaseCheckout(courseId: string, beneficiaryUserId?: string): Promise<string> {
  const { user, orgId } = await requireActiveOrg();
  const [c] = await db
    .select({ stripePriceId: course.stripePriceId })
    .from(course)
    .where(eq(course.id, courseId))
    .limit(1);
  if (!c) throw new Error("Corso inesistente.");
  if (!c.stripePriceId) throw new Error("Corso non acquistabile singolarmente (prezzo non configurato).");

  // acquisto per un dipendente: serve il ruolo e la membership del destinatario
  let destinatarioId = user.id;
  if (beneficiaryUserId && beneficiaryUserId !== user.id) {
    await requireRole("owner", "admin");
    const [m] = await db
      .select({ id: member.id })
      .from(member)
      .where(and(eq(member.userId, beneficiaryUserId), eq(member.organizationId, orgId)))
      .limit(1);
    if (!m) throw new Error("Il destinatario non è un membro della tua organizzazione.");
    destinatarioId = beneficiaryUserId;
  }

  const percent = await courseCompanyDiscountPercent(orgId, courseId);
  const customerId = await ensureStripeCustomer(orgId);
  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    line_items: [{ price: c.stripePriceId, quantity: 1 }],
    // `discounts` è mutuamente esclusivo con allow_promotion_codes (che non usiamo)
    ...(percent !== 0 ? { discounts: [{ coupon: COMPANY_COUPONS[percent] }] } : {}),
    ...TAX_PARAMS,
    // userId = destinatario dell'iscrizione (se stesso, o il dipendente per cui si compra)
    metadata: { kind: "course_purchase", userId: destinatarioId, courseId, orgId },
    success_url: `${appUrl()}${destinatarioId === user.id ? "/dashboard?purchase=success" : "/admin/persone?purchase=success"}`,
    cancel_url: `${appUrl()}${destinatarioId === user.id ? "/dashboard?purchase=cancel" : "/admin/persone?purchase=cancel"}`,
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

// NB: qui c'era `createSeatSubscriptionCheckout`, un abbonamento mensile per posto nato col
// modulo 2. Il modello commerciale e' poi diventato un altro — corsi e pacchetti a prezzo
// pieno con i coupon azienda (-20% dal 2° iscritto, -30% dal 5°), che e' quello in vendita —
// e quella funzione e' rimasta irraggiungibile per mesi, puntata a un prezzo del vecchio
// account di prova che sul live non esiste nemmeno.
//
// Rimossa il 06/08/2026. Non perche' desse fastidio, ma perche' SEMBRAVA pronta: e' il tipo
// di codice che qualcuno ricollega tra sei mesi credendo sia la strada per il B2B, e ci si
// ritrova con due modelli di vendita in piedi contemporaneamente.

/** B2B: Customer Portal Stripe — l'azienda vede fatture e metodi di pagamento. */
export async function createBillingPortalSession(): Promise<string> {
  const { orgId } = await requireRole("owner", "admin");
  const customerId = await ensureStripeCustomer(orgId);
  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl()}/admin/billing`,
  });
  return session.url;
}
