-- Fase 2B — Knowledge base chatbot. Estensione pgvector + tabelle kb_document/kb_chunk/
-- kb_embedding (embedding vector(1536), indice HNSW coseno). Contenuti GLOBALI → tabelle
-- non-tenant: RLS abilitata + policy passthrough scoped a `app_rls` (come 0015/0017). Idempotente.

CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "kb_document" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "source_type" text NOT NULL,
  "source_id" text,
  "title" text NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "kb_chunk" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "document_id" uuid NOT NULL,
  "content" text NOT NULL,
  "chunk_index" integer DEFAULT 0 NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "kb_embedding" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "chunk_id" uuid NOT NULL,
  "embedding" vector(1536) NOT NULL
);--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "kb_chunk" ADD CONSTRAINT "kb_chunk_document_fk" FOREIGN KEY ("document_id") REFERENCES "public"."kb_document"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "kb_embedding" ADD CONSTRAINT "kb_embedding_chunk_fk" FOREIGN KEY ("chunk_id") REFERENCES "public"."kb_chunk"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "kb_chunk_document_idx" ON "kb_chunk" ("document_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kb_embedding_hnsw" ON "kb_embedding" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint

-- RLS passthrough app_rls (KB globale; PostgREST resta negato)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['kb_document','kb_chunk','kb_embedding']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS app_rls_passthrough ON public.%I', t);
    EXECUTE format('CREATE POLICY app_rls_passthrough ON public.%I FOR ALL TO app_rls USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;
