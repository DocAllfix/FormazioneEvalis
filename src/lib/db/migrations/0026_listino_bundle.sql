-- Listino B2C + bundle: doppio prezzo sui corsi (list_price_cents barrato display,
-- stripe_product_id persistito per riusare il Product ai cambi prezzo) + tabelle bundle
-- e bundle_course (pacchetti commerciali; "pick_one" = un corso a scelta tra gli eligible).
-- Tabelle globali non-tenant (catalogo, come course): RLS abilitata + policy passthrough
-- scoped al solo `app_rls` (pattern 0024/0025) → i ruoli PostgREST restano negati.
-- Additiva, idempotente. Scritta a mano (snapshot fermi a 0011).
ALTER TABLE "course" ADD COLUMN IF NOT EXISTS "list_price_cents" integer;--> statement-breakpoint
ALTER TABLE "course" ADD COLUMN IF NOT EXISTS "stripe_product_id" text;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "bundle_kind" AS ENUM ('fixed', 'pick_one');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "bundle_course_role" AS ENUM ('included', 'eligible');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bundle" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "title" text NOT NULL,
  "description" text,
  "kind" "bundle_kind" DEFAULT 'fixed' NOT NULL,
  "stripe_product_id" text,
  "stripe_price_id" text,
  "price_cents" integer,
  "list_price_cents" integer,
  "currency" text DEFAULT 'eur',
  "active" boolean DEFAULT false NOT NULL,
  "position" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bundle_course" (
  "bundle_id" uuid NOT NULL REFERENCES "bundle"("id") ON DELETE CASCADE,
  "course_id" uuid NOT NULL REFERENCES "course"("id") ON DELETE CASCADE,
  "role" "bundle_course_role" DEFAULT 'included' NOT NULL,
  CONSTRAINT "bundle_course_uq" UNIQUE ("bundle_id", "course_id")
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bundle_course_bundle_idx" ON "bundle_course" ("bundle_id");--> statement-breakpoint
ALTER TABLE "bundle" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "app_rls_passthrough" ON "bundle";--> statement-breakpoint
CREATE POLICY "app_rls_passthrough" ON "bundle" FOR ALL TO app_rls USING (true) WITH CHECK (true);--> statement-breakpoint
ALTER TABLE "bundle_course" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "app_rls_passthrough" ON "bundle_course";--> statement-breakpoint
CREATE POLICY "app_rls_passthrough" ON "bundle_course" FOR ALL TO app_rls USING (true) WITH CHECK (true);
