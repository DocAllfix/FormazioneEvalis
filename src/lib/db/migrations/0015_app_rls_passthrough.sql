-- Cutover RLS: tutte le tabelle hanno RLS ABILITATA (rls=true) ma solo le 4 tabelle tenant
-- (enrollment, certificate, slide_progress, quiz_attempt) hanno una policy. Le altre tabelle
-- non-tenant, con RLS abilitata e NESSUNA policy, sono deny-all per i ruoli non-owner → sotto
-- `app_rls` l'app non potrebbe leggere course/user/organization/slide/quiz/...: rotta.
--
-- Soluzione: policy PERMISSIVA scoped al SOLO ruolo `app_rls` (FOR ALL TO app_rls USING true)
-- sulle tabelle non-tenant. `app_rls` ottiene accesso pieno (l'isolamento di queste tabelle
-- resta a carico dell'autorizzazione applicativa, come da design: la RLS-barriera copre solo
-- le 4 tabelle di compliance). I ruoli PostgREST (anon/authenticated) NON hanno policy → la
-- RLS resta protettiva verso l'esterno. Le 4 tabelle tenant NON ricevono questa policy
-- (manterrebbe l'isolamento via GUC). Idempotente.

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'account','activity_log','course','heartbeat','invitation','lesson','lesson_progress',
    'member','module','organization','quiz','quiz_question','session','slide','user','verification'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS app_rls_passthrough ON public.%I', t);
    EXECUTE format('CREATE POLICY app_rls_passthrough ON public.%I FOR ALL TO app_rls USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;
