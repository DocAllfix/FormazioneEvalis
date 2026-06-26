-- Fase 2A — Ticketing. Tabelle `ticket` + `ticket_message` con RLS reale (tenant-sensibile):
--   ticket: visibile/scrivibile dal proprietario (app.user_id) o dallo staff (app.platform_admin='on')
--   ticket_message: stesso scope, via EXISTS sul ticket padre (niente ricorsione: ticket non
--   referenzia ticket_message). NUOVE tabelle tenant → NON ricevono il passthrough 0015.
-- Scritta a mano (coerente con 0007/0012; gli snapshot drizzle-kit si fermano a 0011). Idempotente.

DO $$ BEGIN
  CREATE TYPE "public"."ticket_status" AS ENUM('open', 'pending', 'closed');
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "ticket" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" text NOT NULL,
  "user_id" text NOT NULL,
  "subject" text NOT NULL,
  "status" "ticket_status" DEFAULT 'open' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "ticket_message" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ticket_id" uuid NOT NULL,
  "author_id" text NOT NULL,
  "body" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "ticket" ADD CONSTRAINT "ticket_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "ticket" ADD CONSTRAINT "ticket_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "ticket_message" ADD CONSTRAINT "ticket_message_ticket_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."ticket"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "ticket_message" ADD CONSTRAINT "ticket_message_author_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "ticket_user_idx" ON "ticket" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ticket_org_idx" ON "ticket" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ticket_status_idx" ON "ticket" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ticket_message_ticket_idx" ON "ticket_message" ("ticket_id");--> statement-breakpoint

-- RLS: FORCE su entrambe (anche l'owner della tabella subisce le policy)
ALTER TABLE "ticket" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ticket" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "rls_ticket" ON "ticket";--> statement-breakpoint
CREATE POLICY "rls_ticket" ON "ticket" FOR ALL
  USING (user_id = current_setting('app.user_id', true)
         OR current_setting('app.platform_admin', true) = 'on')
  WITH CHECK (user_id = current_setting('app.user_id', true)
         OR current_setting('app.platform_admin', true) = 'on');--> statement-breakpoint

ALTER TABLE "ticket_message" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ticket_message" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "rls_ticket_message" ON "ticket_message";--> statement-breakpoint
CREATE POLICY "rls_ticket_message" ON "ticket_message" FOR ALL
  USING (EXISTS (SELECT 1 FROM ticket t WHERE t.id = ticket_message.ticket_id
                 AND (t.user_id = current_setting('app.user_id', true)
                      OR current_setting('app.platform_admin', true) = 'on')))
  WITH CHECK (EXISTS (SELECT 1 FROM ticket t WHERE t.id = ticket_message.ticket_id
                 AND (t.user_id = current_setting('app.user_id', true)
                      OR current_setting('app.platform_admin', true) = 'on')));
