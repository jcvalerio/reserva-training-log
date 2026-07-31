ALTER TABLE "exercise_prescription" ADD COLUMN "is_unilateral" boolean;
--> statement-breakpoint
UPDATE "exercise_prescription" SET "is_unilateral" = ("side_mode" != 'bilateral');