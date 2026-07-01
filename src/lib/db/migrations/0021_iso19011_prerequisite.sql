-- ISO 19011 — prerequisito INFORMATIVO (advisory, NON blocca l'accesso). Additivo e inerte:
-- default NULL ovunque → feature spenta finché lo staff non marca i corsi ISO.
--   course.prerequisite_course_id → i corsi ISO puntano al corso 19011 (self-FK); NULL per il 19011
--     stesso e per tutti i corsi professionali. ON DELETE SET NULL: se il prerequisito sparisce il corso
--     torna semplicemente senza avviso (nessuna FK rotta).
--   user_onboarding.iso19011_certified → autodichiarazione (NULL=non chiesto, true/false=risposto).
-- Idempotente.

ALTER TABLE "course" ADD COLUMN IF NOT EXISTS "prerequisite_course_id" uuid;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "course" ADD CONSTRAINT "course_prerequisite_course_id_fk"
    FOREIGN KEY ("prerequisite_course_id") REFERENCES "course"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
ALTER TABLE "user_onboarding" ADD COLUMN IF NOT EXISTS "iso19011_certified" boolean;
