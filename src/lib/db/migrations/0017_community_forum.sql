-- Fase 2C — Forum community GLOBALE. Tabelle non-tenant (niente organization_id): l'autorizzazione
-- è a livello app (autore/staff). RLS ABILITATA + policy PASSTHROUGH scoped al ruolo `app_rls`
-- (come 0015): i ruoli PostgREST restano negati, l'app (postgres/app_rls) accede. Seed di
-- categorie iniziali. Scritta a mano (coerente con la disciplina del repo). Idempotente.

CREATE TABLE IF NOT EXISTS "forum_category" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "description" text,
  "position" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "forum_thread" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "category_id" uuid NOT NULL,
  "author_id" text NOT NULL,
  "title" text NOT NULL,
  "locked" boolean DEFAULT false NOT NULL,
  "pinned" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_post_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "forum_post" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "thread_id" uuid NOT NULL,
  "author_id" text NOT NULL,
  "body" text NOT NULL,
  "hidden" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "forum_report" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "post_id" uuid NOT NULL,
  "reporter_id" text NOT NULL,
  "reason" text NOT NULL,
  "resolved" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "forum_moderation_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "staff_id" text NOT NULL,
  "action" text NOT NULL,
  "target" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "forum_thread" ADD CONSTRAINT "forum_thread_category_fk" FOREIGN KEY ("category_id") REFERENCES "public"."forum_category"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "forum_thread" ADD CONSTRAINT "forum_thread_author_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "forum_post" ADD CONSTRAINT "forum_post_thread_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."forum_thread"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "forum_post" ADD CONSTRAINT "forum_post_author_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "forum_report" ADD CONSTRAINT "forum_report_post_fk" FOREIGN KEY ("post_id") REFERENCES "public"."forum_post"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "forum_report" ADD CONSTRAINT "forum_report_reporter_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."user"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "forum_moderation_log" ADD CONSTRAINT "forum_modlog_staff_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."user"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "forum_thread_category_idx" ON "forum_thread" ("category_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "forum_thread_lastpost_idx" ON "forum_thread" ("last_post_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "forum_post_thread_idx" ON "forum_post" ("thread_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "forum_report_post_idx" ON "forum_report" ("post_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "forum_modlog_created_idx" ON "forum_moderation_log" ("created_at");--> statement-breakpoint

-- RLS passthrough app_rls (tabelle globali; PostgREST resta negato)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['forum_category','forum_thread','forum_post','forum_report','forum_moderation_log']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS app_rls_passthrough ON public.%I', t);
    EXECUTE format('CREATE POLICY app_rls_passthrough ON public.%I FOR ALL TO app_rls USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;--> statement-breakpoint

-- Categorie iniziali
INSERT INTO "forum_category" ("slug","name","description","position") VALUES
  ('generale','Generale','Discussioni libere della community', 0),
  ('corsi','Domande sui corsi','Dubbi e confronto sui contenuti dei corsi', 1),
  ('certificazioni','Certificazioni','Esami, attestati e percorsi di certificazione', 2)
ON CONFLICT ("slug") DO NOTHING;
