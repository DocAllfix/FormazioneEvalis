-- RLS — seconda barriera di isolamento tenant (idempotente).
-- Si applica come ruolo privilegiato (postgres/DIRECT_URL). L'app in produzione si
-- connette come `app_rls` (NOBYPASSRLS); le 4 tabelle sensibili sono FORCE RLS e le
-- policy leggono le GUC di sessione app.user_id / app.org_id (impostate da withTenant).
-- Senza GUC, current_setting(..., true) = NULL → nessuna riga visibile (default sicuro).

-- 1) Ruolo applicativo ristretto (no login/segreto qui: LOGIN+password via ops).
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_rls') THEN
    CREATE ROLE app_rls NOLOGIN NOBYPASSRLS;
  END IF;
END $$;

-- 2) Privilegi ampi: l'app deve poter operare su tutto lo schema. L'ISOLAMENTO arriva
--    dalla RLS forzata SOLO sulle 4 tabelle sensibili (sotto), non da GRANT mancanti.
GRANT USAGE ON SCHEMA public TO app_rls;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_rls;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_rls;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_rls;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_rls;

-- 3) Permette al ruolo privilegiato di fare SET ROLE app_rls (test di isolamento).
GRANT app_rls TO postgres;

-- 4) enrollment: scope = utente (i propri enrollment) OPPURE org (vista azienda).
ALTER TABLE enrollment ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollment FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_enrollment ON enrollment;
CREATE POLICY rls_enrollment ON enrollment FOR ALL
  USING (user_id = current_setting('app.user_id', true)
         OR organization_id = current_setting('app.org_id', true))
  WITH CHECK (user_id = current_setting('app.user_id', true)
         OR organization_id = current_setting('app.org_id', true));

-- 5) certificate: scope derivato dall'enrollment di appartenenza.
ALTER TABLE certificate ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificate FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_certificate ON certificate;
CREATE POLICY rls_certificate ON certificate FOR ALL
  USING (EXISTS (SELECT 1 FROM enrollment e WHERE e.id = certificate.enrollment_id
                 AND (e.user_id = current_setting('app.user_id', true)
                      OR e.organization_id = current_setting('app.org_id', true))))
  WITH CHECK (EXISTS (SELECT 1 FROM enrollment e WHERE e.id = certificate.enrollment_id
                 AND (e.user_id = current_setting('app.user_id', true)
                      OR e.organization_id = current_setting('app.org_id', true))));

-- 6) slide_progress: scope derivato dall'enrollment.
ALTER TABLE slide_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE slide_progress FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_slide_progress ON slide_progress;
CREATE POLICY rls_slide_progress ON slide_progress FOR ALL
  USING (EXISTS (SELECT 1 FROM enrollment e WHERE e.id = slide_progress.enrollment_id
                 AND (e.user_id = current_setting('app.user_id', true)
                      OR e.organization_id = current_setting('app.org_id', true))))
  WITH CHECK (EXISTS (SELECT 1 FROM enrollment e WHERE e.id = slide_progress.enrollment_id
                 AND (e.user_id = current_setting('app.user_id', true)
                      OR e.organization_id = current_setting('app.org_id', true))));

-- 7) quiz_attempt: scope derivato dall'enrollment.
ALTER TABLE quiz_attempt ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempt FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_quiz_attempt ON quiz_attempt;
CREATE POLICY rls_quiz_attempt ON quiz_attempt FOR ALL
  USING (EXISTS (SELECT 1 FROM enrollment e WHERE e.id = quiz_attempt.enrollment_id
                 AND (e.user_id = current_setting('app.user_id', true)
                      OR e.organization_id = current_setting('app.org_id', true))))
  WITH CHECK (EXISTS (SELECT 1 FROM enrollment e WHERE e.id = quiz_attempt.enrollment_id
                 AND (e.user_id = current_setting('app.user_id', true)
                      OR e.organization_id = current_setting('app.org_id', true))));
