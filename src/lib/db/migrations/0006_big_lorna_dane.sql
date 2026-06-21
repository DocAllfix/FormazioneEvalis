ALTER TABLE "organization" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "stripe_subscription_id" text;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "plan" text;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "subscription_status" text;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "seats" integer;--> statement-breakpoint
ALTER TABLE "course" ADD COLUMN "stripe_price_id" text;--> statement-breakpoint
CREATE INDEX "organization_stripe_customer_idx" ON "organization" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE INDEX "organization_stripe_subscription_idx" ON "organization" USING btree ("stripe_subscription_id");--> statement-breakpoint
ALTER TABLE "organization" ADD CONSTRAINT "organization_stripe_customer_id_unique" UNIQUE("stripe_customer_id");