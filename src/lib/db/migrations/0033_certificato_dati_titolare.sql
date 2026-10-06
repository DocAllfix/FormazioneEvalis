-- Nome e anagrafica del titolare SCRITTI NEL CERTIFICATO (audit di sicurezza, B8).
--
-- Il certificato leggeva il nome dal profilo a ogni richiesta: chi cambiava nome dopo l'emissione
-- (l'endpoint di aggiornamento del profilo è aperto) cambiava anche il PDF provvisorio e la pagina
-- pubblica di verifica, con lo stesso numero. Ora nome, codice fiscale, data e luogo di nascita
-- si fissano sul certificato quando nasce (lifecycle.ts) e da lì non cambiano più.
--
-- Colonne facoltative: un certificato senza dati salvati continua a leggere dal profilo (coalesce
-- nel codice e nella funzione qui sotto), quindi il codice vecchio e quello nuovo convivono.
-- Il riempimento fissa sui certificati ESISTENTI i dati di oggi (verificati col committente prima
-- di applicarla in produzione). Tocca solo `certificate`: il registro di audit non c'entra.
-- Additiva e idempotente. Scritta a mano.
ALTER TABLE "certificate" ADD COLUMN IF NOT EXISTS "learner_name" text;
--> statement-breakpoint
ALTER TABLE "certificate" ADD COLUMN IF NOT EXISTS "codice_fiscale" text;
--> statement-breakpoint
ALTER TABLE "certificate" ADD COLUMN IF NOT EXISTS "data_nascita" date;
--> statement-breakpoint
ALTER TABLE "certificate" ADD COLUMN IF NOT EXISTS "luogo_nascita" text;
--> statement-breakpoint
UPDATE "certificate" c
SET "learner_name" = u.name,
    "codice_fiscale" = a.codice_fiscale,
    "data_nascita" = a.data_nascita,
    "luogo_nascita" = a.luogo_nascita
FROM "enrollment" e
JOIN "user" u ON u.id = e.user_id
LEFT JOIN "anagrafica_certificato" a ON a.user_id = e.user_id
WHERE e.id = c.enrollment_id AND c.learner_name IS NULL;
--> statement-breakpoint
-- Verifica pubblica: stesso testo della 0030, con il nome preso dal certificato (dal profilo solo
-- se il certificato non lo ha).
CREATE OR REPLACE FUNCTION public.verifica_certificato(p_chiave text)
RETURNS TABLE (
  status text, number text, created_at timestamptz, issued_at timestamptz,
  learner_name text, course_title text, verify_uuid uuid
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET row_security = off
SET search_path = public
AS $$
DECLARE
  k text := btrim(coalesce(p_chiave, ''));
BEGIN
  IF k ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN QUERY
      SELECT c.status::text, c.number, c.created_at, c.issued_at, coalesce(c.learner_name, u.name), co.title, c.verify_uuid
      FROM certificate c
      JOIN enrollment e ON e.id = c.enrollment_id
      JOIN "user" u ON u.id = e.user_id
      JOIN course co ON co.id = e.course_id
      WHERE c.verify_uuid = k::uuid
      LIMIT 1;
  ELSIF k <> '' THEN
    RETURN QUERY
      SELECT c.status::text, c.number, c.created_at, c.issued_at, coalesce(c.learner_name, u.name), co.title, c.verify_uuid
      FROM certificate c
      JOIN enrollment e ON e.id = c.enrollment_id
      JOIN "user" u ON u.id = e.user_id
      JOIN course co ON co.id = e.course_id
      WHERE c.number = upper(k)
      LIMIT 1;
  END IF;
END;
$$;
