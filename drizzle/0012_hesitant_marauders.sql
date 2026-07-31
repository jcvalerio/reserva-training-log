CREATE TYPE "public"."exercise_prescription_type" AS ENUM('strength', 'duration');--> statement-breakpoint
ALTER TABLE "exercise_prescription" ALTER COLUMN "target_rep_min" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "exercise_prescription" ALTER COLUMN "target_rep_max" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "exercise_prescription" ALTER COLUMN "target_rir" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "set_log" ALTER COLUMN "actual_weight_kg" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "set_log" ALTER COLUMN "actual_reps" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "set_log" ALTER COLUMN "rir" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "exercise_prescription" ADD COLUMN "prescription_type" "exercise_prescription_type" DEFAULT 'strength' NOT NULL;--> statement-breakpoint
ALTER TABLE "exercise_prescription" ADD COLUMN "duration_seconds" integer;--> statement-breakpoint
ALTER TABLE "set_log" ADD COLUMN "actual_duration_seconds" integer;