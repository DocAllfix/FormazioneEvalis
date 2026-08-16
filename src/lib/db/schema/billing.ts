// Cluster billing — infrastruttura webhook Stripe.
//
// stripe_processed_event: chiave di idempotenza PER-EVENTO (C-2 audit go-live). Stripe
// ri-consegna gli eventi (retry, duplicati, ordine non garantito): senza questa tabella un
// re-invio ri-esegue l'handler e può sovrascrivere i posti con valori stale. Tabella globale,
// non-tenant (nessun dato utente): solo l'id evento e quando è stato processato.

import { boolean, index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const stripeProcessedEvent = pgTable("stripe_processed_event", {
  eventId: text("event_id").primaryKey(),
  processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * payment_event — REGISTRO FINANZIARIO append-only.
 *
 * Perché esiste: finora il nostro DB sapeva *che* un corso era stato comprato (activity_log), ma
 * non *quanto* era stato incassato. Per ricostruire i movimenti bisognava interrogare Stripe.
 * Qui resta traccia di importo, valuta, identificativi Stripe e payload grezzo.
 *
 * NON è la fonte di verità del denaro — quella resta Stripe. È il nostro registro consultabile,
 * e per questo la scrittura è best-effort: un guasto qui non deve mai impedire a chi ha pagato
 * di ricevere il corso.
 *
 * Scelte di progetto:
 * - **niente foreign key** verso organization/user: come `activity_log`, il registro deve
 *   sopravvivere alla cancellazione di un'organizzazione o di un utente;
 * - `stripe_event_id` UNIQUE: un evento = una riga, anche se Stripe lo ri-consegna;
 * - importi in **centesimi**, esattamente come li manda Stripe (nessuna conversione, nessun
 *   arrotondamento nostro);
 * - `livemode`: distingue i movimenti veri da quelli in modalità test. Non è un dettaglio —
 *   ci è già servito per capire che certe transazioni non erano incassi reali.
 * - immutabilità imposta dal DB con un trigger (vedi migrazione 0028).
 */
export const paymentEvent = pgTable(
  "payment_event",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    stripeEventId: text("stripe_event_id").notNull().unique(),
    type: text("type").notNull(),
    livemode: boolean("livemode").notNull(),
    stripeCustomerId: text("stripe_customer_id"),
    checkoutSessionId: text("checkout_session_id"),
    paymentIntentId: text("payment_intent_id"),
    organizationId: text("organization_id"),
    userId: text("user_id"),
    amountTotal: integer("amount_total"),
    currency: text("currency"),
    /** `event.created` di Stripe: quando è successo davvero, non quando l'abbiamo scritto. */
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
    payload: jsonb("payload").notNull(),
  },
  (t) => [index("payment_event_org_idx").on(t.organizationId, t.occurredAt)],
);
