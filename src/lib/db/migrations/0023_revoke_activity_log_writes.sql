-- M-6 (audit go-live): activity_log append-only ANCHE a livello di privilegi, difesa indipendente
-- dal trigger GUC-gated (activity_log_immutable). Il ruolo applicativo di produzione `app_rls`
-- perde UPDATE/DELETE; resta SELECT/INSERT (appendActivity inserisce soltanto). L'owner `postgres`
-- non è toccato (migrazioni + manutenzione GUC-gated girano come owner; i test girano come postgres).
-- Additivo, nessun dato toccato. Scritto a mano.
REVOKE UPDATE, DELETE ON "activity_log" FROM "app_rls";--> statement-breakpoint
REVOKE UPDATE, DELETE ON "activity_log" FROM PUBLIC;
