-- Dati anagrafici per il CERTIFICATO ACCREDITATO: codice fiscale, data e luogo di nascita.
-- Il committente li richiede per emettere l'accreditato (05/10/2026). Si chiedono all'utente prima
-- dell'esame finale; finiscono nella mail al committente, nella console staff e (luogo e data)
-- sul certificato provvisorio. Mai nella verifica pubblica.
--
-- Tabella a parte, non colonne su "user": quella tabella la gestisce better-auth.
-- Dati personali: RLS attiva con UNA policy per app_rls — ognuno legge e scrive solo la propria
-- riga, lo staff di piattaforma (GUC app.platform_admin) le legge tutte. Gli altri ruoli
-- (anon, authenticated di PostgREST) restano negati: RLS attiva e nessuna policy per loro.
-- NON forzata, come 0024/0029: l'owner resta libero per manutenzione e pulizia dei test.
-- Privilegi tabellari per app_rls dalle ALTER DEFAULT PRIVILEGES di 0007. Additiva, idempotente.
CREATE TABLE IF NOT EXISTS "anagrafica_certificato" (
  "user_id" text PRIMARY KEY NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "codice_fiscale" text NOT NULL,
  "data_nascita" date NOT NULL,
  "luogo_nascita" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "anagrafica_certificato" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_rls') THEN
    EXECUTE 'DROP POLICY IF EXISTS "app_rls_propria" ON "anagrafica_certificato"';
    EXECUTE $p$CREATE POLICY "app_rls_propria" ON "anagrafica_certificato" FOR ALL TO app_rls
      USING (user_id = current_setting('app.user_id', true) OR current_setting('app.platform_admin', true) = 'on')
      WITH CHECK (user_id = current_setting('app.user_id', true) OR current_setting('app.platform_admin', true) = 'on')$p$;
  END IF;
END $$;
