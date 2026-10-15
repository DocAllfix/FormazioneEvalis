-- Corsi con attestato SOLO EVALIS (nessun accreditamento esterno, es. i corsi privacy FAD-PRIV).
--
-- Per questi corsi il documento definitivo non è un certificato accreditato da un ente caricato
-- dallo staff, ma l'attestato di formazione EVALIS Academy: dopo la verifica di una persona dello
-- staff la piattaforma lo genera con lo stesso numero e lo stesso QR del provvisorio (lifecycle.ts,
-- emettiAttestatoEvalisById). I testi del provvisorio non parlano di accreditamento.
--
-- Colonna con default false: tutti i corsi esistenti restano esattamente come prima. Additiva e
-- idempotente, nessun dato esistente toccato. Scritta a mano.
ALTER TABLE "course" ADD COLUMN IF NOT EXISTS "attestato_solo_evalis" boolean DEFAULT false NOT NULL;
