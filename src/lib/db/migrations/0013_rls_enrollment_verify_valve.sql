-- RLS: estende la valvola di verifica pubblica all'enrollment, in modo NARROW.
-- La verifica pubblica (getCertificateByVerifyUuid) legge certificate JOIN enrollment per
-- ricavare learnerName/courseTitle. La valvola app.verify_uuid apriva solo `certificate`:
-- il join su `enrollment` (policy senza valvola) restava chiuso → 0 righe sotto app_rls.
-- Qui aggiungo alla policy enrollment un ramo che espone ESCLUSIVAMENTE l'enrollment il cui
-- certificato ha quel verify_uuid (EXISTS guardato da <> '' per evitare il subquery quando
-- la valvola non è attiva). Read-only: il WITH CHECK NON include la valvola (la verifica non
-- scrive). Senza GUC nessun accesso extra (default-deny invariato). Idempotente.

DROP POLICY IF EXISTS rls_enrollment ON enrollment;--> statement-breakpoint
CREATE POLICY rls_enrollment ON enrollment FOR ALL
  USING (user_id = current_setting('app.user_id', true)
         OR organization_id = current_setting('app.org_id', true)
         OR current_setting('app.platform_admin', true) = 'on'
         OR (current_setting('app.verify_uuid', true) <> ''
             AND EXISTS (SELECT 1 FROM certificate c
                         WHERE c.enrollment_id = enrollment.id
                           AND c.verify_uuid::text = current_setting('app.verify_uuid', true))))
  WITH CHECK (user_id = current_setting('app.user_id', true)
         OR organization_id = current_setting('app.org_id', true)
         OR current_setting('app.platform_admin', true) = 'on');
