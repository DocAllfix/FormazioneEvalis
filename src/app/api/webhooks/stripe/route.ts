// Webhook Stripe: verifica la firma (STRIPE_WEBHOOK_SECRET), mappa l'evento e applica
// il provisioning. La verità dello stato abbonamento è qui.
//
// C-2 (audit go-live) — tre garanzie:
//  1. IDEMPOTENZA per-evento: l'event.id viene "reclamato" su stripe_processed_event PRIMA di
//     processare. Un re-invio trova la riga e non rifà nulla.
//  2. NIENTE PERDITE SILENZIOSE: se il provisioning non trova l'organizzazione (race tipica:
//     checkout completato ma organization.stripeCustomerId non ancora scritto), il claim viene
//     RILASCIATO e si risponde non-2xx → Stripe riprova. Prima si rispondeva 200 e i posti
//     pagati non venivano mai attivati, senza alcun errore visibile.
//  3. ORDINE: per le subscription non ci si fida del payload dell'evento (un `updated` vecchio
//     consegnato dopo sovrascriverebbe i posti con un valore stale): si rilegge lo stato
//     CORRENTE da Stripe.

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { stripeProcessedEvent } from "@/lib/db/schema";
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

  // (1) claim idempotente: se l'evento c'è già, è un re-invio → niente da rifare.
  const claimed = await db
    .insert(stripeProcessedEvent)
    .values({ eventId: event.id })
    .onConflictDoNothing()
    .returning({ eventId: stripeProcessedEvent.eventId });
  if (claimed.length === 0) return new Response("già processato", { status: 200 });

  // il claim non deve MAI impedire un retry legittimo di Stripe
  const release = () =>
    db.delete(stripeProcessedEvent).where(eq(stripeProcessedEvent.eventId, event.id));

  const plan = planFromEvent(event);
  try {
    switch (plan.action) {
      case "course_purchase":
        // `enrolled:false` = iscrizione già presente: successo idempotente, non un errore.
        await provisionCoursePurchase(plan);
        break;

      case "subscription_upsert": {
        // (3) stato corrente da Stripe, non dal payload dell'evento
        const fresh = await getStripe().subscriptions.retrieve(plan.subscriptionId);
        const quantity = fresh.items.data[0]?.quantity ?? plan.quantity;
        const res = await applySubscriptionState({ ...plan, quantity, status: fresh.status });
        if (!res.updated) {
          // (2) org non ancora mappata al customer → far riprovare Stripe
          await release();
          console.error(
            `[stripe webhook] org non mappata per customer=${plan.stripeCustomerId} (event=${event.id}): richiesto retry`,
          );
          return new Response("organizzazione non mappata: riprovare", { status: 409 });
        }
        break;
      }

      case "subscription_revoke": {
        const res = await revokeOrgSubscription(plan.stripeCustomerId);
        if (!res.revoked) {
          // (2) come sopra: una revoca non applicata è un accesso NON revocato → mai silenziosa
          await release();
          console.error(
            `[stripe webhook] revoca senza org mappata per customer=${plan.stripeCustomerId} (event=${event.id}): richiesto retry`,
          );
          return new Response("organizzazione non mappata: riprovare", { status: 409 });
        }
        break;
      }

      case "ignore":
        break;
    }
  } catch (e) {
    await release();
    console.error("[stripe webhook] handler error", e);
    return new Response("errore handler", { status: 500 });
  }
  return new Response("ok", { status: 200 });
}
