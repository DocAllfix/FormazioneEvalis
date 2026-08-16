// Mappatura PURA evento Stripe → azione di provisioning (testabile senza rete/DB).

import type Stripe from "stripe";

export type BillingAction =
  | { action: "course_purchase"; userId: string; courseId: string; orgId: string }
  | { action: "bundle_purchase"; userId: string; bundleId: string; chosenCourseId?: string; orgId: string }
  | { action: "subscription_upsert"; stripeCustomerId: string; subscriptionId: string; quantity: number; status: string; plan: string | null }
  | { action: "subscription_revoke"; stripeCustomerId: string }
  | { action: "ignore" };

function customerId(c: string | { id: string } | null): string {
  return typeof c === "string" ? c : c?.id ?? "";
}

/** Riga del registro finanziario ricavata da un evento Stripe. Funzione PURA: nessuna rete. */
export type DatiPagamento = {
  stripeEventId: string;
  type: string;
  livemode: boolean;
  stripeCustomerId: string | null;
  checkoutSessionId: string | null;
  paymentIntentId: string | null;
  organizationId: string | null;
  userId: string | null;
  amountTotal: number | null;
  currency: string | null;
  occurredAt: Date;
};

function testo(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

/**
 * Estrae i dati finanziari da un evento Stripe, qualunque sia il tipo.
 *
 * Volutamente TOLLERANTE: se un campo non c'è resta `null`. Il registro deve poter accogliere
 * anche eventi che oggi non gestiamo (rimborsi, contestazioni, pagamenti falliti) senza che una
 * forma inattesa faccia fallire la scrittura — il payload grezzo resta comunque salvato per
 * intero, quindi nulla va perso.
 */
export function datiPagamentoDaEvento(event: Stripe.Event): DatiPagamento {
  // l'unione dei tipi Stripe è enorme e non si sovrappone a Record: si passa da `unknown`
  const o = event.data.object as unknown as Record<string, unknown>;
  const meta = (o.metadata ?? {}) as Record<string, unknown>;

  // `customer`, `payment_intent` e simili arrivano come stringa o come oggetto espanso
  const rif = (v: unknown): string | null =>
    typeof v === "string" ? v : testo((v as { id?: unknown } | null)?.id);

  const sessione = event.type.startsWith("checkout.session.") ? testo(o.id) : null;
  // per gli eventi di charge/payment_intent l'oggetto stesso può essere il payment intent
  const intent =
    rif(o.payment_intent) ?? (event.type.startsWith("payment_intent.") ? testo(o.id) : null);

  const importo =
    typeof o.amount_total === "number"
      ? o.amount_total
      : typeof o.amount === "number"
        ? o.amount
        : typeof o.amount_captured === "number"
          ? o.amount_captured
          : null;

  return {
    stripeEventId: event.id,
    type: event.type,
    livemode: Boolean(event.livemode),
    stripeCustomerId: rif(o.customer),
    checkoutSessionId: sessione,
    paymentIntentId: intent,
    organizationId: testo(meta.orgId),
    userId: testo(meta.userId),
    amountTotal: importo,
    currency: testo(o.currency),
    occurredAt: new Date((event.created ?? Math.floor(Date.now() / 1000)) * 1000),
  };
}

export function planFromEvent(event: Stripe.Event): BillingAction {
  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      const m = s.metadata;
      if (s.mode === "payment" && m?.kind === "course_purchase" && m.userId && m.courseId && m.orgId) {
        return { action: "course_purchase", userId: m.userId, courseId: m.courseId, orgId: m.orgId };
      }
      if (s.mode === "payment" && m?.kind === "bundle_purchase" && m.userId && m.bundleId && m.orgId) {
        return {
          action: "bundle_purchase",
          userId: m.userId,
          bundleId: m.bundleId,
          chosenCourseId: m.chosenCourseId || undefined,
          orgId: m.orgId,
        };
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
