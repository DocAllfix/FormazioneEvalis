-- payment_event: il registro finanziario NON SCRIVEVA NULLA in produzione.
--
-- La migrazione 0028 ha creato la tabella senza toccare la RLS. In produzione la RLS risultava
-- però ATTIVA (accesa fuori dalle migrazioni, verosimilmente dal pannello Supabase che segnala le
-- tabelle senza RLS) e SENZA ALCUNA POLICY: con RLS attiva e nessuna policy Postgres rifiuta ogni
-- riga, quindi ogni INSERT del webhook (ruolo app_rls) falliva. Il codice lo scrive in best-effort
-- (un guasto al registro non deve lasciare senza corso chi ha pagato), perciò l'errore finiva solo
-- nei log e il registro è rimasto vuoto dal primo giorno. In sviluppo la RLS era spenta: le due
-- basi dati divergevano e i test non potevano accorgersene. Scoperto il 29/09/2026.
--
-- Questa migrazione rende lo stato ESPLICITO e IDENTICO ovunque:
--  - RLS attiva, come tutte le altre tabelle: i ruoli PostgREST (anon, authenticated) restano negati;
--  - due policy per app_rls, SOLO inserimento e lettura. Nessuna policy per UPDATE/DELETE: il
--    registro resta append-only, già garantito dai GRANT (0028) e dai trigger payment_event_no_*.
-- NON forzata: l'owner (postgres) resta libero per manutenzione e pulizia dei test, come per le
-- altre tabelle (0015, 0024). Additiva e idempotente, nessun dato toccato. Scritta a mano.
ALTER TABLE "payment_event" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_rls') THEN
    EXECUTE 'DROP POLICY IF EXISTS "app_rls_inserisce" ON "payment_event"';
    EXECUTE 'CREATE POLICY "app_rls_inserisce" ON "payment_event" FOR INSERT TO app_rls WITH CHECK (true)';
    EXECUTE 'DROP POLICY IF EXISTS "app_rls_legge" ON "payment_event"';
    EXECUTE 'CREATE POLICY "app_rls_legge" ON "payment_event" FOR SELECT TO app_rls USING (true)';
  END IF;
END $$;
