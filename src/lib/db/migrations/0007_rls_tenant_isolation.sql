-- RLS — seconda barriera di isolamento tenant (idempotente, versionata).
-- L'app in produzione si connette come `app_rls` (NOBYPASSRLS); le 4 tabelle sensibili
-- sono FORCE RLS e le policy leggono le GUC di sessione app.user_id / app.org_id
-- (impostate da withTenant, src/lib/db/tenant.ts). Senza GUC current_setting(..., true)
-- = NULL → nessuna riga visibile (default sicuro). LOGIN+password di app_rls = step ops
-- (PRE-LAUNCH §6), non qui.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_rls') THEN
    CREATE ROLE app_rls NOLOGIN NOBYPASSRLS;
  END IF;
END $$;--> statement-breakpoint

GRANT USAGE ON SCHEMA public TO app_rls;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_rls;--> statement-breakpoint
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_rls;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_rls;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_rls;--> statement-breakpoint

-- Consente al ruolo privilegiato (postgres) di SET ROLE app_rls per i test di isolamento.
GRANT app_rls TO postgres;--> statement-breakpoint

ALTER TABLE enrollment ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE enrollment FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS rls_enrollment ON enrollment;--> statement-breakpoint
CREATE POLICY rls_enrollment ON enrollment FOR ALL
  USING (user_id = current_setting('app.user_id', true)
         OR organization_id = current_setting('app.org_id', true))
  WITH CHECK (user_id = current_setting('app.user_id', true)
         OR organization_id = current_setting('app.org_id', true));--> statement-breakpoint

ALTER TABLE certificate ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE certificate FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS rls_certificate ON certificate;--> statement-breakpoint
CREATE POLICY rls_certificate ON certificate FOR ALL
  USING (EXISTS (SELECT 1 FROM enrollment e WHERE e.id = certificate.enrollment_id
                 AND (e.user_id = current_setting('app.user_id', true)
                      OR e.organization_id = current_setting('app.org_id', true))))
  WITH CHECK (EXISTS (SELECT 1 FROM enrollment e WHERE e.id = certificate.enrollment_id
                 AND (e.user_id = current_setting('app.user_id', true)
                      OR e.organization_id = current_setting('app.org_id', true))));--> statement-breakpoint

ALTER TABLE slide_progress ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE slide_progress FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS rls_slide_progress ON slide_progress;--> statement-breakpoint
CREATE POLICY rls_slide_progress ON slide_progress FOR ALL
  USING (EXISTS (SELECT 1 FROM enrollment e WHERE e.id = slide_progress.enrollment_id
                 AND (e.user_id = current_setting('app.user_id', true)
                      OR e.organization_id = current_setting('app.org_id', true))))
  WITH CHECK (EXISTS (SELECT 1 FROM enrollment e WHERE e.id = slide_progress.enrollment_id
                 AND (e.user_id = current_setting('app.user_id', true)
                      OR e.organization_id = current_setting('app.org_id', true))));--> statement-breakpoint

ALTER TABLE quiz_attempt ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE quiz_attempt FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS rls_quiz_attempt ON quiz_attempt;--> statement-breakpoint
CREATE POLICY rls_quiz_attempt ON quiz_attempt FOR ALL
  USING (EXISTS (SELECT 1 FROM enrollment e WHERE e.id = quiz_attempt.enrollment_id
                 AND (e.user_id = current_setting('app.user_id', true)
                      OR e.organization_id = current_setting('app.org_id', true))))
  WITH CHECK (EXISTS (SELECT 1 FROM enrollment e WHERE e.id = quiz_attempt.enrollment_id
                 AND (e.user_id = current_setting('app.user_id', true)
                      OR e.organization_id = current_setting('app.org_id', true))));
