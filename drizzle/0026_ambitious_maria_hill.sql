CREATE TYPE "public"."loading_model" AS ENUM('stack', 'plate_loaded', 'fixed_dumbbell', 'bodyweight', 'band', 'other');--> statement-breakpoint
CREATE TYPE "public"."weight_unit" AS ENUM('kg', 'lb');--> statement-breakpoint
CREATE TABLE "athlete_gym" (
	"id" text PRIMARY KEY NOT NULL,
	"athlete_profile_id" text NOT NULL,
	"name_es" text NOT NULL,
	"is_default" boolean DEFAULT true NOT NULL,
	"display_unit" "weight_unit" DEFAULT 'kg' NOT NULL,
	"plate_inventory" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercise_setup" (
	"id" text PRIMARY KEY NOT NULL,
	"athlete_profile_id" text NOT NULL,
	"gym_id" text NOT NULL,
	"exercise_key" text NOT NULL,
	"exercise_id" text,
	"setup_notes_es" text,
	"loading_model" "loading_model",
	"increment_value" numeric(6, 2),
	"increment_unit" "weight_unit",
	"add_on_value" numeric(6, 2),
	"add_on_unit" "weight_unit",
	"plate_inventory" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "athlete_gym" ADD CONSTRAINT "athlete_gym_athlete_profile_id_athlete_profile_id_fk" FOREIGN KEY ("athlete_profile_id") REFERENCES "public"."athlete_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_setup" ADD CONSTRAINT "exercise_setup_athlete_profile_id_athlete_profile_id_fk" FOREIGN KEY ("athlete_profile_id") REFERENCES "public"."athlete_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_setup" ADD CONSTRAINT "exercise_setup_gym_id_athlete_gym_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."athlete_gym"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_setup" ADD CONSTRAINT "exercise_setup_exercise_id_exercise_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercise"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "athlete_gym_athlete_profile_id_idx" ON "athlete_gym" USING btree ("athlete_profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "athlete_gym_default_unique" ON "athlete_gym" USING btree ("athlete_profile_id") WHERE "athlete_gym"."is_default";--> statement-breakpoint
CREATE UNIQUE INDEX "exercise_setup_scope_unique" ON "exercise_setup" USING btree ("athlete_profile_id","gym_id","exercise_key");--> statement-breakpoint
CREATE INDEX "exercise_setup_profile_gym_idx" ON "exercise_setup" USING btree ("athlete_profile_id","gym_id");