-- Leak-guard: chiude qualsiasi transazione lasciata aperta ("idle in transaction") oltre 30s.
--
-- Perché: con postgres.js sul transaction pooler (pgbouncer), una scrittura interrotta a metà
-- (client che naviga via durante la server action, contention sul pool) può lasciare una
-- connessione a BEGIN mai chiusa, che occupa una connessione del pool finché il processo vive.
-- Osservato sui server action del forum (createThread/replyToThread): /forum passava da ~1s a ~94s
-- alla visita successiva. 30s non tocca le transazioni reali (completano in millisecondi).
--
-- Va sul RUOLO (non nel codice): il pooler scarta il parametro passato dall'app, ma eredita
-- la configurazione impostata sul ruolo. app_rls = produzione; postgres = ambiente attuale.

-- Applicata solo ai ruoli ESISTENTI: in CI (Postgres effimero) `app_rls` non c'è, e un
-- ALTER ROLE su un ruolo assente farebbe fallire l'intera migrazione.
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['app_rls', 'postgres'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('ALTER ROLE %I SET idle_in_transaction_session_timeout = %L', r, '30s');
    END IF;
  END LOOP;
END $$;
