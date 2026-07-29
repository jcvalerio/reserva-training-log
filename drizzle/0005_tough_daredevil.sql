CREATE TYPE "public"."exercise_phase" AS ENUM('warmup', 'main', 'accessory', 'mobility');--> statement-breakpoint
CREATE TYPE "public"."exercise_side_mode" AS ENUM('bilateral', 'unilateral_separate', 'unilateral_matched');--> statement-breakpoint
CREATE TYPE "public"."workout_plan_status" AS ENUM('draft', 'active', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."workout_session_status" AS ENUM('planned', 'active', 'completed', 'skipped');--> statement-breakpoint
CREATE TABLE "exercise_log" (
	"id" text PRIMARY KEY NOT NULL,
	"workout_session_id" text NOT NULL,
	"exercise_prescription_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercise_prescription" (
	"id" text PRIMARY KEY NOT NULL,
	"plan_session_template_id" text NOT NULL,
	"order_index" integer NOT NULL,
	"exercise_name_es" text NOT NULL,
	"exercise_name_en" text,
	"phase" "exercise_phase" NOT NULL,
	"side_mode" "exercise_side_mode" NOT NULL,
	"target_sets" integer NOT NULL,
	"target_rep_min" integer NOT NULL,
	"target_rep_max" integer NOT NULL,
	"target_rir" integer NOT NULL,
	"rest_seconds" integer NOT NULL,
	"notes_es" text NOT NULL,
	"notes_en" text,
	"pain_sensitive" boolean DEFAULT false NOT NULL,
	"substitution_options_es" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_session_template" (
	"id" text PRIMARY KEY NOT NULL,
	"workout_plan_id" text NOT NULL,
	"week_number" integer NOT NULL,
	"day_index" integer NOT NULL,
	"name_es" text NOT NULL,
	"name_en" text,
	"focus" text NOT NULL,
	"estimated_duration_minutes" integer NOT NULL,
	"mobility_notes_es" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "set_log" (
	"id" text PRIMARY KEY NOT NULL,
	"exercise_log_id" text NOT NULL,
	"set_number" integer NOT NULL,
	"side" "baseline_side" DEFAULT 'bilateral' NOT NULL,
	"actual_weight_kg" numeric(6, 2) NOT NULL,
	"actual_reps" integer NOT NULL,
	"rir" integer NOT NULL,
	"pain_score" integer NOT NULL,
	"notes" text,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_plan" (
	"id" text PRIMARY KEY NOT NULL,
	"athlete_profile_id" text NOT NULL,
	"name_es" text NOT NULL,
	"name_en" text,
	"goal" text DEFAULT 'hypertrophy' NOT NULL,
	"duration_weeks" integer NOT NULL,
	"days_per_week" integer NOT NULL,
	"session_duration_minutes" integer NOT NULL,
	"locale" "locale" DEFAULT 'es' NOT NULL,
	"safety_summary_es" text NOT NULL,
	"status" "workout_plan_status" DEFAULT 'draft' NOT NULL,
	"activated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_session" (
	"id" text PRIMARY KEY NOT NULL,
	"athlete_profile_id" text NOT NULL,
	"workout_plan_id" text NOT NULL,
	"plan_session_template_id" text NOT NULL,
	"status" "workout_session_status" DEFAULT 'planned' NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "exercise_log" ADD CONSTRAINT "exercise_log_workout_session_id_workout_session_id_fk" FOREIGN KEY ("workout_session_id") REFERENCES "public"."workout_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_log" ADD CONSTRAINT "exercise_log_exercise_prescription_id_exercise_prescription_id_fk" FOREIGN KEY ("exercise_prescription_id") REFERENCES "public"."exercise_prescription"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_prescription" ADD CONSTRAINT "exercise_prescription_plan_session_template_id_plan_session_template_id_fk" FOREIGN KEY ("plan_session_template_id") REFERENCES "public"."plan_session_template"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_session_template" ADD CONSTRAINT "plan_session_template_workout_plan_id_workout_plan_id_fk" FOREIGN KEY ("workout_plan_id") REFERENCES "public"."workout_plan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "set_log" ADD CONSTRAINT "set_log_exercise_log_id_exercise_log_id_fk" FOREIGN KEY ("exercise_log_id") REFERENCES "public"."exercise_log"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_plan" ADD CONSTRAINT "workout_plan_athlete_profile_id_athlete_profile_id_fk" FOREIGN KEY ("athlete_profile_id") REFERENCES "public"."athlete_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_session" ADD CONSTRAINT "workout_session_athlete_profile_id_athlete_profile_id_fk" FOREIGN KEY ("athlete_profile_id") REFERENCES "public"."athlete_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_session" ADD CONSTRAINT "workout_session_workout_plan_id_workout_plan_id_fk" FOREIGN KEY ("workout_plan_id") REFERENCES "public"."workout_plan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_session" ADD CONSTRAINT "workout_session_plan_session_template_id_plan_session_template_id_fk" FOREIGN KEY ("plan_session_template_id") REFERENCES "public"."plan_session_template"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "exercise_log_workout_session_id_idx" ON "exercise_log" USING btree ("workout_session_id");--> statement-breakpoint
CREATE INDEX "exercise_prescription_plan_session_template_id_idx" ON "exercise_prescription" USING btree ("plan_session_template_id");--> statement-breakpoint
CREATE UNIQUE INDEX "exercise_prescription_template_order_unique" ON "exercise_prescription" USING btree ("plan_session_template_id","order_index");--> statement-breakpoint
CREATE INDEX "plan_session_template_workout_plan_id_idx" ON "plan_session_template" USING btree ("workout_plan_id");--> statement-breakpoint
CREATE UNIQUE INDEX "plan_session_template_plan_week_day_unique" ON "plan_session_template" USING btree ("workout_plan_id","week_number","day_index");--> statement-breakpoint
CREATE INDEX "set_log_exercise_log_id_idx" ON "set_log" USING btree ("exercise_log_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workout_plan_active_per_profile_idx" ON "workout_plan" USING btree ("athlete_profile_id") WHERE "workout_plan"."status" = 'active';--> statement-breakpoint
CREATE INDEX "workout_session_athlete_profile_id_idx" ON "workout_session" USING btree ("athlete_profile_id");--> statement-breakpoint
CREATE INDEX "workout_session_workout_plan_id_idx" ON "workout_session" USING btree ("workout_plan_id");