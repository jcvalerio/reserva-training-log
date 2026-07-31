CREATE TYPE "public"."exercise_load_mechanism" AS ENUM('bodyweight', 'dumbbell', 'machine', 'barbell');--> statement-breakpoint
ALTER TABLE "exercise_prescription" ADD COLUMN "load_mechanism" "exercise_load_mechanism";--> statement-breakpoint
ALTER TABLE "exercise_prescription" ADD COLUMN "is_compound" boolean;--> statement-breakpoint
UPDATE "exercise_prescription" SET "load_mechanism" = CASE "increment_category"
  WHEN 'machine_or_lower_body' THEN 'machine'
  WHEN 'upper_compound' THEN 'barbell'
  WHEN 'dumbbell' THEN 'dumbbell'
  WHEN 'isolation' THEN 'machine'
  ELSE NULL
END::"public"."exercise_load_mechanism",
"is_compound" = CASE "increment_category"
  WHEN 'machine_or_lower_body' THEN true
  WHEN 'upper_compound' THEN true
  WHEN 'dumbbell' THEN true
  WHEN 'isolation' THEN false
  ELSE NULL
END
WHERE "increment_category" IS NOT NULL;