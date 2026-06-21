DROP INDEX "certificate_enrollment_idx";--> statement-breakpoint
ALTER TABLE "certificate" ADD COLUMN "number" text;--> statement-breakpoint
ALTER TABLE "certificate" ADD COLUMN "revoked_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "certificate_enrollment_uq" ON "certificate" USING btree ("enrollment_id");--> statement-breakpoint
ALTER TABLE "certificate" ADD CONSTRAINT "certificate_number_unique" UNIQUE("number");