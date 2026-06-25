-- RLS valvole: oltre allo scope tenant (app.user_id / app.org_id), due valvole GUC narrow:
--   app.platform_admin='on'  → staff piattaforma (console certificati, cross-tenant). Gated server.
--   app.verify_uuid=<uuid>   → verifica pubblica di UN certificato per il suo uuid (read-only).
-- Senza GUC, current_setting(..., true)=NULL → nessun accesso extra (default-deny invariato).
-- Idempotente.

DROP POLICY IF EXISTS rls_enrollment ON enrollment;--> statement-breakpoint
CREATE POLICY rls_enrollment ON enrollment FOR ALL
  USING (user_id = current_setting('app.user_id', true)
         OR organization_id = current_setting('app.org_id', true)
         OR current_setting('app.platform_admin', true) = 'on')
  WITH CHECK (user_id = current_setting('app.user_id', true)
         OR organization_id = current_setting('app.org_id', true)
         OR current_setting('app.platform_admin', true) = 'on');--> statement-breakpoint

DROP POLICY IF EXISTS rls_certificate ON certificate;--> statement-breakpoint
CREATE POLICY rls_certificate ON certificate FOR ALL
  USING (EXISTS (SELECT 1 FROM enrollment e WHERE e.id = certificate.enrollment_id
                 AND (e.user_id = current_setting('app.user_id', true)
                      OR e.organization_id = current_setting('app.org_id', true)))
         OR current_setting('app.platform_admin', true) = 'on'
         OR certificate.verify_uuid::text = current_setting('app.verify_uuid', true))
  WITH CHECK (EXISTS (SELECT 1 FROM enrollment e WHERE e.id = certificate.enrollment_id
                 AND (e.user_id = current_setting('app.user_id', true)
                      OR e.organization_id = current_setting('app.org_id', true)))
         OR current_setting('app.platform_admin', true) = 'on');--> statement-breakpoint

DROP POLICY IF EXISTS rls_slide_progress ON slide_progress;--> statement-breakpoint
CREATE POLICY rls_slide_progress ON slide_progress FOR ALL
  USING (EXISTS (SELECT 1 FROM enrollment e WHERE e.id = slide_progress.enrollment_id
                 AND (e.user_id = current_setting('app.user_id', true)
                      OR e.organization_id = current_setting('app.org_id', true)))
         OR current_setting('app.platform_admin', true) = 'on')
  WITH CHECK (EXISTS (SELECT 1 FROM enrollment e WHERE e.id = slide_progress.enrollment_id
                 AND (e.user_id = current_setting('app.user_id', true)
                      OR e.organization_id = current_setting('app.org_id', true)))
         OR current_setting('app.platform_admin', true) = 'on');--> statement-breakpoint

DROP POLICY IF EXISTS rls_quiz_attempt ON quiz_attempt;--> statement-breakpoint
CREATE POLICY rls_quiz_attempt ON quiz_attempt FOR ALL
  USING (EXISTS (SELECT 1 FROM enrollment e WHERE e.id = quiz_attempt.enrollment_id
                 AND (e.user_id = current_setting('app.user_id', true)
                      OR e.organization_id = current_setting('app.org_id', true)))
         OR current_setting('app.platform_admin', true) = 'on')
  WITH CHECK (EXISTS (SELECT 1 FROM enrollment e WHERE e.id = quiz_attempt.enrollment_id
                 AND (e.user_id = current_setting('app.user_id', true)
                      OR e.organization_id = current_setting('app.org_id', true)))
         OR current_setting('app.platform_admin', true) = 'on');
