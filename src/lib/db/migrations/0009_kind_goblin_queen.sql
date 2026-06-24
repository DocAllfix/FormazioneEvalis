ALTER TABLE "course" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "course" ADD COLUMN "price_cents" integer;--> statement-breakpoint
ALTER TABLE "course" ADD COLUMN "currency" text DEFAULT 'eur';