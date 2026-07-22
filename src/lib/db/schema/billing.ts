// Cluster billing — infrastruttura webhook Stripe.
//
// stripe_processed_event: chiave di idempotenza PER-EVENTO (C-2 audit go-live). Stripe
// ri-consegna gli eventi (retry, duplicati, ordine non garantito): senza questa tabella un
// re-invio ri-esegue l'handler e può sovrascrivere i posti con valori stale. Tabella globale,
// non-tenant (nessun dato utente): solo l'id evento e quando è stato processato.

import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const stripeProcessedEvent = pgTable("stripe_processed_event", {
  eventId: text("event_id").primaryKey(),
  processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
});
