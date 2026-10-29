-- RECENSIONI dei corsi (richiesta del committente, 29/10/2026): a fine corso chi ha il certificato
-- lascia stelle sul corso, stelle facoltative sulla piattaforma e un testo; se acconsente,
-- l'opinione va sul sito («Dicono di noi» in landing e scheda pubblica del corso) dopo
-- l'approvazione dello staff.
--
-- Una recensione per iscrizione (unique enrollment_id), modificabile. Il consenso alla
-- pubblicazione è separato e revocabile: `pubblicazione` = 'no' | 'nome_cognome' | 'nome_iniziale',
-- con data e versione del testo accettato. `nome_pubblico` è il nome come apparirà, fissato al
-- salvataggio. `stato` = 'da_approvare' | 'approvata' | 'nascosta'; `in_evidenza` = in landing.
--
-- Dati personali: RLS attiva con UNA policy per app_rls come 0031 — ognuno legge e scrive solo le
-- proprie righe, lo staff di piattaforma (GUC app.platform_admin) tutte. Il sito pubblico legge
-- SOLO dalle due funzioni qui sotto (SECURITY DEFINER, row_security off, come 0030): opinioni
-- approvate e con consenso, e medie dei voti. NON forzata: l'owner resta libero per la pulizia
-- dei test. Additiva e idempotente, nessun dato esistente toccato. Scritta a mano.
CREATE TABLE IF NOT EXISTS "course_review" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "enrollment_id" uuid NOT NULL UNIQUE REFERENCES "enrollment"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "course_id" uuid NOT NULL REFERENCES "course"("id") ON DELETE CASCADE,
  "voto_corso" smallint NOT NULL CHECK ("voto_corso" BETWEEN 1 AND 5),
  "voto_piattaforma" smallint CHECK ("voto_piattaforma" BETWEEN 1 AND 5),
  "testo" text DEFAULT '' NOT NULL CHECK (char_length("testo") <= 800),
  "pubblicazione" text DEFAULT 'no' NOT NULL CHECK ("pubblicazione" IN ('no', 'nome_cognome', 'nome_iniziale')),
  "nome_pubblico" text,
  "consenso_il" timestamp with time zone,
  "consenso_versione" integer,
  "stato" text DEFAULT 'da_approvare' NOT NULL CHECK ("stato" IN ('da_approvare', 'approvata', 'nascosta')),
  "in_evidenza" boolean DEFAULT false NOT NULL,
  "moderata_da" text,
  "moderata_il" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "course_review_course_idx" ON "course_review" ("course_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "course_review_user_idx" ON "course_review" ("user_id");
--> statement-breakpoint
ALTER TABLE "course_review" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_rls') THEN
    EXECUTE 'DROP POLICY IF EXISTS "app_rls_propria" ON "course_review"';
    EXECUTE $p$CREATE POLICY "app_rls_propria" ON "course_review" FOR ALL TO app_rls
      USING (user_id = current_setting('app.user_id', true) OR current_setting('app.platform_admin', true) = 'on')
      WITH CHECK (user_id = current_setting('app.user_id', true) OR current_setting('app.platform_admin', true) = 'on')$p$;
  END IF;
END $$;
--> statement-breakpoint
-- Opinioni PUBBLICABILI: approvate, con consenso e con un testo. p_corso null = tutti i corsi;
-- p_evidenza = solo quelle scelte per la landing. Nessun dato oltre a quelli che l'utente ha
-- accettato di mostrare (niente email, niente id utente).
CREATE OR REPLACE FUNCTION public.recensioni_pubbliche(p_corso uuid, p_evidenza boolean, p_limite integer)
RETURNS TABLE (
  id uuid, nome_pubblico text, voto_corso smallint, voto_piattaforma smallint, testo text,
  course_title text, course_slug text, created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET row_security = off
SET search_path = public
AS $$
  SELECT r.id, r.nome_pubblico, r.voto_corso, r.voto_piattaforma, r.testo, co.title, co.slug, r.created_at
  FROM course_review r
  JOIN course co ON co.id = r.course_id
  WHERE r.stato = 'approvata'
    AND r.pubblicazione <> 'no'
    AND r.nome_pubblico IS NOT NULL
    AND btrim(r.testo) <> ''
    AND co.status = 'published'
    AND (p_corso IS NULL OR r.course_id = p_corso)
    AND (NOT coalesce(p_evidenza, false) OR r.in_evidenza)
  ORDER BY r.in_evidenza DESC, r.created_at DESC
  LIMIT least(greatest(coalesce(p_limite, 12), 1), 50);
$$;
--> statement-breakpoint
-- MEDIE dei voti su TUTTE le recensioni, pubblicate o no (Codice del Consumo: la media non si
-- costruisce scegliendo le opinioni), escluse solo quelle nascoste dallo staff. p_corso null =
-- media della piattaforma (voto_piattaforma, facoltativo).
CREATE OR REPLACE FUNCTION public.media_recensioni(p_corso uuid)
RETURNS TABLE (numero integer, media numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET row_security = off
SET search_path = public
AS $$
  SELECT count(*)::integer,
         round(avg(CASE WHEN p_corso IS NULL THEN r.voto_piattaforma ELSE r.voto_corso END)::numeric, 2)
  FROM course_review r
  WHERE r.stato <> 'nascosta'
    AND (CASE WHEN p_corso IS NULL THEN r.voto_piattaforma IS NOT NULL ELSE r.course_id = p_corso END);
$$;
