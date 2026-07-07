CREATE TYPE "public"."baseline_side" AS ENUM('bilateral', 'left', 'right');--> statement-breakpoint
CREATE TABLE "baseline_lift" (
	"id" text PRIMARY KEY NOT NULL,
	"athlete_profile_id" text NOT NULL,
	"exercise_id" text NOT NULL,
	"side" "baseline_side" DEFAULT 'bilateral' NOT NULL,
	"weight_kg" numeric(6, 2) NOT NULL,
	"reps" integer NOT NULL,
	"sets" integer NOT NULL,
	"rir" integer NOT NULL,
	"pain_score" integer NOT NULL,
	"notes" text,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercise" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name_es" text NOT NULL,
	"name_en" text NOT NULL,
	"primary_muscles" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"secondary_muscles" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"equipment_type" text NOT NULL,
	"movement_pattern" text,
	"is_unilateral_capable" boolean DEFAULT false NOT NULL,
	"joint_stress_tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"default_rep_range_min" integer DEFAULT 8 NOT NULL,
	"default_rep_range_max" integer DEFAULT 12 NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "baseline_lift" ADD CONSTRAINT "baseline_lift_athlete_profile_id_athlete_profile_id_fk" FOREIGN KEY ("athlete_profile_id") REFERENCES "public"."athlete_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "baseline_lift" ADD CONSTRAINT "baseline_lift_exercise_id_exercise_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercise"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "baseline_lift_athlete_profile_id_idx" ON "baseline_lift" USING btree ("athlete_profile_id");--> statement-breakpoint
CREATE INDEX "baseline_lift_exercise_id_idx" ON "baseline_lift" USING btree ("exercise_id");--> statement-breakpoint
CREATE UNIQUE INDEX "exercise_slug_unique" ON "exercise" USING btree ("slug");