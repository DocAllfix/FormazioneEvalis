-- Verifica pubblica del certificato anche per NUMERO, non solo per il codice del QR.
--
-- La landing invita a "inserire il codice univoco" stampato sul certificato, ma la verifica
-- accettava solo il verify_uuid del QR: il numero (EVALIS-2026-XXXXXXXX) finiva in un cast a uuid
-- e la pagina andava in errore 500 (provato su evalisacademy.it il 02/10/2026).
--
-- Nuova funzione, stesso modello della 0014 (SECURITY DEFINER, row_security off, UN solo
-- certificato, dati minimi d'attestazione). Restituisce anche created_at: per il certificato
-- PROVVISORIO è la data di completamento del corso. La vecchia verify_certificate resta com'è.
-- Il riconoscimento uuid/numero è qui, con un IF esplicito: un CASE in SQL non garantisce che il
-- cast a uuid non venga valutato in anticipo, e un input sporco tornerebbe a dare errore.
-- Additiva e idempotente, nessun dato toccato. Scritta a mano.
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
      SELECT c.status::text, c.number, c.created_at, c.issued_at, u.name, co.title, c.verify_uuid
      FROM certificate c
      JOIN enrollment e ON e.id = c.enrollment_id
      JOIN "user" u ON u.id = e.user_id
      JOIN course co ON co.id = e.course_id
      WHERE c.verify_uuid = k::uuid
      LIMIT 1;
  ELSIF k <> '' THEN
    RETURN QUERY
      SELECT c.status::text, c.number, c.created_at, c.issued_at, u.name, co.title, c.verify_uuid
      FROM certificate c
      JOIN enrollment e ON e.id = c.enrollment_id
      JOIN "user" u ON u.id = e.user_id
      JOIN course co ON co.id = e.course_id
      WHERE c.number = upper(k)
      LIMIT 1;
  END IF;
END;
$$;
