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

ALTER ROLE app_rls SET idle_in_transaction_session_timeout = '30s';
ALTER ROLE postgres SET idle_in_transaction_session_timeout = '30s';
