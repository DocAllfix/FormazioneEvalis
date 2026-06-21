-- activity_log: immutabilità append-only imposta a livello DB.
-- UPDATE/DELETE sollevano eccezione per CHIUNQUE, salvo la GUC di manutenzione
-- (app.audit_maintenance='on') che la produzione non imposta mai e che i test
-- usano transitoriamente per la pulizia.

CREATE OR REPLACE FUNCTION activity_log_immutable() RETURNS trigger AS $$
BEGIN
  IF current_setting('app.audit_maintenance', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'activity_log is append-only';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER activity_log_no_update BEFORE UPDATE ON activity_log
  FOR EACH ROW EXECUTE FUNCTION activity_log_immutable();
--> statement-breakpoint
CREATE TRIGGER activity_log_no_delete BEFORE DELETE ON activity_log
  FOR EACH ROW EXECUTE FUNCTION activity_log_immutable();
