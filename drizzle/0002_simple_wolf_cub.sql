CREATE TYPE "public"."limitation_severity" AS ENUM('mild', 'moderate', 'severe');--> statement-breakpoint
CREATE TYPE "public"."limitation_side" AS ENUM('left', 'right', 'bilateral', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."muscle_priority_level" AS ENUM('normal', 'high', 'very_high');--> statement-breakpoint
CREATE TYPE "public"."side_focus" AS ENUM('right', 'left', 'bilateral', 'none');--> statement-breakpoint
CREATE TABLE "limitation" (
	"id" text PRIMARY KEY NOT NULL,
	"athlete_profile_id" text NOT NULL,
	"body_region" text NOT NULL,
	"side" "limitation_side" DEFAULT 'unknown' NOT NULL,
	"condition_name" text NOT NULL,
	"severity" "limitation_severity" DEFAULT 'moderate' NOT NULL,
	"requires_pain_tracking" boolean DEFAULT true NOT NULL,
	"avoid_patterns" text,
	"notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "muscle_priority" (
	"id" text PRIMARY KEY NOT NULL,
	"athlete_profile_id" text NOT NULL,
	"muscle_group" text NOT NULL,
	"priority_level" "muscle_priority_level" DEFAULT 'high' NOT NULL,
	"side_focus" "side_focus" DEFAULT 'none' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "limitation" ADD CONSTRAINT "limitation_athlete_profile_id_athlete_profile_id_fk" FOREIGN KEY ("athlete_profile_id") REFERENCES "public"."athlete_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "muscle_priority" ADD CONSTRAINT "muscle_priority_athlete_profile_id_athlete_profile_id_fk" FOREIGN KEY ("athlete_profile_id") REFERENCES "public"."athlete_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "limitation_athlete_profile_id_idx" ON "limitation" USING btree ("athlete_profile_id");--> statement-breakpoint
CREATE INDEX "muscle_priority_athlete_profile_id_idx" ON "muscle_priority" USING btree ("athlete_profile_id");