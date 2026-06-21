CREATE TYPE "public"."quiz_type" AS ENUM('checkpoint', 'final');--> statement-breakpoint
ALTER TYPE "public"."activity_type" ADD VALUE 'html' BEFORE 'video';--> statement-breakpoint
CREATE TABLE "quiz" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"type" "quiz_type" NOT NULL,
	"title" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"questions_to_draw" integer DEFAULT 1 NOT NULL,
	"pass_threshold" integer DEFAULT 80 NOT NULL,
	"time_limit_seconds" integer DEFAULT 0 NOT NULL,
	"cooldown_seconds" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "slide" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"title" text NOT NULL,
	"blocks" jsonb NOT NULL,
	"avatar_clip_uid" text,
	"audio_seconds" integer DEFAULT 0 NOT NULL,
	"speaker_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "slide_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"slide_id" uuid NOT NULL,
	"effective_seconds" integer DEFAULT 0 NOT NULL,
	"audio_completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "slide_progress_enrollment_slide_uq" UNIQUE("enrollment_id","slide_id")
);
--> statement-breakpoint
ALTER TABLE "course" ADD COLUMN "required_minutes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "quiz_attempt" ADD COLUMN "quiz_id" uuid;--> statement-breakpoint
ALTER TABLE "quiz_attempt" ADD COLUMN "started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "quiz_attempt" ADD COLUMN "submitted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "quiz_question" ADD COLUMN "quiz_id" uuid;--> statement-breakpoint
ALTER TABLE "heartbeat" ADD COLUMN "slide_id" uuid;--> statement-breakpoint
ALTER TABLE "quiz" ADD CONSTRAINT "quiz_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slide" ADD CONSTRAINT "slide_lesson_id_lesson_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lesson"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slide_progress" ADD CONSTRAINT "slide_progress_enrollment_id_enrollment_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slide_progress" ADD CONSTRAINT "slide_progress_slide_id_slide_id_fk" FOREIGN KEY ("slide_id") REFERENCES "public"."slide"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quiz_course_idx" ON "quiz" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "slide_lesson_idx" ON "slide" USING btree ("lesson_id");--> statement-breakpoint
ALTER TABLE "quiz_attempt" ADD CONSTRAINT "quiz_attempt_quiz_id_quiz_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quiz"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_question" ADD CONSTRAINT "quiz_question_quiz_id_quiz_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quiz"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "heartbeat" ADD CONSTRAINT "heartbeat_slide_id_slide_id_fk" FOREIGN KEY ("slide_id") REFERENCES "public"."slide"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quiz_question_quiz_idx" ON "quiz_question" USING btree ("quiz_id");