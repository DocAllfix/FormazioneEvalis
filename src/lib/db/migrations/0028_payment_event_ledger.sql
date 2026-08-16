-- payment_event: REGISTRO FINANZIARIO append-only (importi, valuta, identificativi Stripe).
--
-- ⚠️ Questo file è stato SCRITTO A MANO. La versione generata da `drizzle-kit generate`
-- conteneva anche CREATE TABLE per bundle/ticket/forum/kb_*/user_onboarding/rate_limit e
-- ALTER TABLE su course: tabelle e colonne che ESISTONO GIÀ. Il motivo è che lo snapshot 0027
-- ne conosceva solo 20 su 36 (diverse migrazioni passate erano SQL a mano e non hanno
-- aggiornato gli snapshot). Applicare quel diff avrebbe fatto fallire la migrazione.
-- Lo snapshot 0028 salvato accanto a questo file è invece completo (36 tabelle): i diff futuri
-- ripartono da una base corretta.

CREATE TABLE IF NOT EXISTS "payment_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stripe_event_id" text NOT NULL,
	"type" text NOT NULL,
	"livemode" boolean NOT NULL,
	"stripe_customer_id" text,
	"checkout_session_id" text,
	"payment_intent_id" text,
	"organization_id" text,
	"user_id" text,
	"amount_total" integer,
	"currency" text,
	"occurred_at" timestamp with time zone NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"payload" jsonb NOT NULL,
	CONSTRAINT "payment_event_stripe_event_id_unique" UNIQUE("stripe_event_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_event_org_idx" ON "payment_event" USING btree ("organization_id","occurred_at");
--> statement-breakpoint

-- Immutabilità imposta dal DB, stesso schema di `activity_log` (migrazione 0003): UPDATE e
-- DELETE sollevano eccezione per CHIUNQUE, salvo la GUC di manutenzione — che la produzione non
-- imposta mai e che serve ai test per ripulire la tabella fra un'esecuzione e l'altra.
CREATE OR REPLACE FUNCTION payment_event_immutable() RETURNS trigger AS $$
BEGIN
  IF current_setting('app.audit_maintenance', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'payment_event is append-only';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP TRIGGER IF EXISTS payment_event_no_update ON payment_event;
--> statement-breakpoint
CREATE TRIGGER payment_event_no_update BEFORE UPDATE ON payment_event
  FOR EACH ROW EXECUTE FUNCTION payment_event_immutable();
--> statement-breakpoint
DROP TRIGGER IF EXISTS payment_event_no_delete ON payment_event;
--> statement-breakpoint
CREATE TRIGGER payment_event_no_delete BEFORE DELETE ON payment_event
  FOR EACH ROW EXECUTE FUNCTION payment_event_immutable();
--> statement-breakpoint

-- Il ruolo di produzione può SOLO inserire e leggere: niente UPDATE/DELETE nemmeno per errore.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_rls') THEN
    EXECUTE 'GRANT SELECT, INSERT ON public.payment_event TO app_rls';
    EXECUTE 'REVOKE UPDATE, DELETE ON public.payment_event FROM app_rls';
  END IF;
END $$;
