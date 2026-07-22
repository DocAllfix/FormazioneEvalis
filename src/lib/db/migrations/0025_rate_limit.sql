-- C-1 (audit go-live): rate limiting su Postgres (nessun servizio esterno). Contatore a finestra
-- fissa: (key, window_start) → count, incremento atomico via upsert. Tabella globale non-tenant.
-- RLS abilitata + policy passthrough scoped al solo `app_rls` (come 0015/0024) → PostgREST negato;
-- privilegi tabellari dalle ALTER DEFAULT PRIVILEGES di 0007. Additiva, idempotente. Scritta a mano.
CREATE TABLE IF NOT EXISTS "rate_limit" (
  "key" text NOT NULL,
  "window_start" bigint NOT NULL,
  "count" integer DEFAULT 0 NOT NULL,
  CONSTRAINT "rate_limit_key_window_start_pk" PRIMARY KEY("key","window_start")
);--> statement-breakpoint
ALTER TABLE "rate_limit" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "app_rls_passthrough" ON "rate_limit";--> statement-breakpoint
CREATE POLICY "app_rls_passthrough" ON "rate_limit" FOR ALL TO app_rls USING (true) WITH CHECK (true);
