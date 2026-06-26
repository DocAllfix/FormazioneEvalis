-- Fase 6 — Onboarding. Stato onboarding per-utente (1 riga per utente). Tenant-sensibile:
-- RLS reale (user_id = app.user_id OR app.platform_admin='on'). NUOVA tabella tenant →
-- NON riceve il passthrough 0015. Idempotente, scritta a mano (coerente con 0016).

CREATE TABLE IF NOT EXISTS "user_onboarding" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "organization_id" text NOT NULL,
  "persona" text NOT NULL,
  "current_step" integer DEFAULT 0 NOT NULL,
  "completed_steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "goal" text,
  "status" text DEFAULT 'pending' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "completed_at" timestamp with time zone
);--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "user_onboarding" ADD CONSTRAINT "user_onboarding_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "user_onboarding" ADD CONSTRAINT "user_onboarding_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "user_onboarding_user_uq" ON "user_onboarding" ("user_id");--> statement-breakpoint

-- RLS: FORCE (anche l'owner della tabella subisce le policy). Owner o staff.
ALTER TABLE "user_onboarding" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_onboarding" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "rls_user_onboarding" ON "user_onboarding";--> statement-breakpoint
CREATE POLICY "rls_user_onboarding" ON "user_onboarding" FOR ALL
  USING (user_id = current_setting('app.user_id', true)
         OR current_setting('app.platform_admin', true) = 'on')
  WITH CHECK (user_id = current_setting('app.user_id', true)
         OR current_setting('app.platform_admin', true) = 'on');
