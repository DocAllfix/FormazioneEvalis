-- C-2 (audit go-live): idempotenza PER-EVENTO del webhook Stripe. Senza, un re-invio di Stripe
-- ri-esegue l'handler e un evento vecchio consegnato dopo può sovrascrivere `seats` con un
-- valore stale. La riga viene "reclamata" prima di processare e RIMOSSA se il processing
-- fallisce, così Stripe può davvero riprovare (niente perdita silenziosa di eventi).
--
-- Tabella globale non-tenant: RLS abilitata + policy passthrough scoped al solo `app_rls`
-- (stesso schema di 0015) → i ruoli PostgREST restano negati. I privilegi tabellari arrivano
-- dalle ALTER DEFAULT PRIVILEGES di 0007. NON forzata: l'owner (postgres) resta libero per
-- manutenzione e pulizia dei test. Additiva, idempotente. Scritta a mano (snapshot fermi a 0011).
CREATE TABLE IF NOT EXISTS "stripe_processed_event" (
  "event_id" text PRIMARY KEY NOT NULL,
  "processed_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "stripe_processed_event" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "app_rls_passthrough" ON "stripe_processed_event";--> statement-breakpoint
CREATE POLICY "app_rls_passthrough" ON "stripe_processed_event" FOR ALL TO app_rls USING (true) WITH CHECK (true);
