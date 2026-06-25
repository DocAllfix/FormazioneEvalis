-- Fix della ricorsione introdotta da 0013: la valvola inline su `enrollment` che interroga
-- `certificate` causa ricorsione infinita tra le policy (certificate.policy referenzia
-- enrollment e viceversa → 42P17). Ripristino la policy enrollment alla forma 0012 (nessun
-- ramo verify inline) e sposto la verifica pubblica in una funzione SECURITY DEFINER che
-- legge i dati di UN certificato per verify_uuid bypassando la RLS (row_security off): è il
-- minimo indispensabile per l'attestazione pubblica (uuid = segreto non indovinabile).
-- Idempotente.

DROP POLICY IF EXISTS rls_enrollment ON enrollment;--> statement-breakpoint
CREATE POLICY rls_enrollment ON enrollment FOR ALL
  USING (user_id = current_setting('app.user_id', true)
         OR organization_id = current_setting('app.org_id', true)
         OR current_setting('app.platform_admin', true) = 'on')
  WITH CHECK (user_id = current_setting('app.user_id', true)
         OR organization_id = current_setting('app.org_id', true)
         OR current_setting('app.platform_admin', true) = 'on');--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.verify_certificate(p_uuid uuid)
RETURNS TABLE (status text, number text, issued_at timestamptz, learner_name text, course_title text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET row_security = off
AS $$
  SELECT c.status::text, c.number, c.issued_at, u.name, co.title
  FROM certificate c
  JOIN enrollment e ON e.id = c.enrollment_id
  JOIN "user" u ON u.id = e.user_id
  JOIN course co ON co.id = e.course_id
  WHERE c.verify_uuid = p_uuid
  LIMIT 1;
$$;
