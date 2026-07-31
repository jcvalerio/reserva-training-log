ALTER TABLE "exercise_prescription" ALTER COLUMN "is_unilateral" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "exercise_prescription" DROP COLUMN "side_mode";--> statement-breakpoint
DROP TYPE "public"."exercise_side_mode";