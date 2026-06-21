-- Fix: in un trigger BEFORE UPDATE bisogna restituire NEW per applicare la modifica
-- (in manutenzione), e OLD per un BEFORE DELETE. Fuori manutenzione si solleva
-- comunque l'eccezione append-only.

CREATE OR REPLACE FUNCTION activity_log_immutable() RETURNS trigger AS $$
BEGIN
  IF current_setting('app.audit_maintenance', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'activity_log is append-only';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
