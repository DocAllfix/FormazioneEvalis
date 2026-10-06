-- Posizione dei checkpoint = indice della lezione nel CORSO, come la legge il player.
-- L'ingest salvava l'indice della lezione DENTRO il modulo: con un modulo = una lezione erano
-- tutti 0 e il player mostrava solo il checkpoint del Modulo 1. Qui "Checkpoint Modulo N" → N-1,
-- solo nei corsi dove ogni modulo ha esattamente una lezione (tutti i corsi reali al 06/10/2026).
-- Chi aveva già superato quei punti prima della correzione non se li vede chiedere a posteriori:
-- vedi src/features/courses/checkpoint-esonero.ts.
-- Ritorno indietro (se servisse): UPDATE quiz SET position = 0 WHERE type = 'checkpoint'
--   AND title ~ '^Checkpoint Modulo [0-9]+$';
UPDATE quiz q
SET position = substring(q.title from '^Checkpoint Modulo ([0-9]+)$')::int - 1
WHERE q.type = 'checkpoint'
  AND q.title ~ '^Checkpoint Modulo [0-9]+$'
  AND q.course_id IN (
    SELECT m.course_id FROM module m JOIN lesson l ON l.module_id = m.id
    GROUP BY m.course_id HAVING count(l.id) = count(DISTINCT m.id)
  );
