ALTER TABLE "exercise_setup" ADD COLUMN "plate_build" jsonb;--> statement-breakpoint
ALTER TABLE "exercise_setup" ADD COLUMN "plate_build_total_kg" numeric(6, 2);--> statement-breakpoint
ALTER TABLE "exercise_setup" ADD COLUMN "plate_build_recorded_at" timestamp with time zone;