-- Hardening RLS (post-cutover) — heartbeat + lesson_progress: da policy PASSTHROUGH (app_rls
-- USING true, nessun isolamento) alla STESSA policy GUC EXISTS-su-enrollment di slide_progress
-- (incluso la valvola staff `platform_admin`). Defense-in-depth su dati antifrode/progressi
-- per-utente. ⚠️ Tocca SOLO le policy (nessuna colonna/dato). Idempotente.
-- Scritta a mano (coerente con 0007/0012/0016). Entrambe le tabelle hanno enrollment_id.

-- heartbeat
DROP POLICY IF EXISTS "app_rls_passthrough" ON "heartbeat";--> statement-breakpoint
ALTER TABLE "heartbeat" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "rls_heartbeat" ON "heartbeat";--> statement-breakpoint
CREATE POLICY "rls_heartbeat" ON "heartbeat" FOR ALL
  USING (EXISTS (SELECT 1 FROM enrollment e WHERE e.id = heartbeat.enrollment_id
                 AND (e.user_id = current_setting('app.user_id', true)
                      OR e.organization_id = current_setting('app.org_id', true)))
         OR current_setting('app.platform_admin', true) = 'on')
  WITH CHECK (EXISTS (SELECT 1 FROM enrollment e WHERE e.id = heartbeat.enrollment_id
                 AND (e.user_id = current_setting('app.user_id', true)
                      OR e.organization_id = current_setting('app.org_id', true)))
         OR current_setting('app.platform_admin', true) = 'on');--> statement-breakpoint

-- lesson_progress
DROP POLICY IF EXISTS "app_rls_passthrough" ON "lesson_progress";--> statement-breakpoint
ALTER TABLE "lesson_progress" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "rls_lesson_progress" ON "lesson_progress";--> statement-breakpoint
CREATE POLICY "rls_lesson_progress" ON "lesson_progress" FOR ALL
  USING (EXISTS (SELECT 1 FROM enrollment e WHERE e.id = lesson_progress.enrollment_id
                 AND (e.user_id = current_setting('app.user_id', true)
                      OR e.organization_id = current_setting('app.org_id', true)))
         OR current_setting('app.platform_admin', true) = 'on')
  WITH CHECK (EXISTS (SELECT 1 FROM enrollment e WHERE e.id = lesson_progress.enrollment_id
                 AND (e.user_id = current_setting('app.user_id', true)
                      OR e.organization_id = current_setting('app.org_id', true)))
         OR current_setting('app.platform_admin', true) = 'on');
