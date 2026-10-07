-- Numero dell'attestato ACCREDITATO.
--
-- L'ente che emette il certificato accreditato gli assegna un numero proprio (es. C013562026),
-- diverso dal numero EVALIS-AAAA-XXXXXXXX nato col provvisorio. Chi riceve l'attestato cerca
-- QUEL numero sulla pagina pubblica di verifica: prima non trovava nulla. Lo staff lo scrive
-- al caricamento del PDF (lifecycle.ts) e la verifica lo riconosce.
--
-- Colonna facoltativa: un certificato senza numero accreditato si comporta come prima. Unica,
-- perché un numero deve portare a un solo certificato. La funzione di verifica mantiene la
-- stessa forma della 0033 (stesse colonne restituite): cerca anche per numero accreditato e, se
-- c'è, restituisce quello come numero del certificato. Il numero EVALIS continua a funzionare.
-- Additiva e idempotente, nessun dato esistente toccato. Scritta a mano.
ALTER TABLE "certificate" ADD COLUMN IF NOT EXISTS "accreditato_numero" text;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "certificate_accreditato_numero_unique" ON "certificate" ("accreditato_numero");
--> statement-breakpoint
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
  -- il numero accreditato si salva senza spazi e in maiuscolo: si cerca allo stesso modo
  k_accr text := upper(regexp_replace(coalesce(p_chiave, ''), '\s', '', 'g'));
BEGIN
  IF k ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN QUERY
      SELECT c.status::text, coalesce(c.accreditato_numero, c.number), c.created_at, c.issued_at, coalesce(c.learner_name, u.name), co.title, c.verify_uuid
      FROM certificate c
      JOIN enrollment e ON e.id = c.enrollment_id
      JOIN "user" u ON u.id = e.user_id
      JOIN course co ON co.id = e.course_id
      WHERE c.verify_uuid = k::uuid
      LIMIT 1;
  ELSIF k <> '' THEN
    RETURN QUERY
      SELECT c.status::text, coalesce(c.accreditato_numero, c.number), c.created_at, c.issued_at, coalesce(c.learner_name, u.name), co.title, c.verify_uuid
      FROM certificate c
      JOIN enrollment e ON e.id = c.enrollment_id
      JOIN "user" u ON u.id = e.user_id
      JOIN course co ON co.id = e.course_id
      WHERE c.number = upper(k) OR c.accreditato_numero = k_accr
      -- se un numero coincidesse sia con un EVALIS sia con un accreditato vince l'accreditato
      ORDER BY (c.accreditato_numero = k_accr) DESC NULLS LAST
      LIMIT 1;
  END IF;
END;
$$;
