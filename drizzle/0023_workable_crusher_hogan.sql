CREATE TABLE "limb_symmetry_test" (
	"id" text PRIMARY KEY NOT NULL,
	"athlete_profile_id" text NOT NULL,
	"tested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"exercise_name_es" text NOT NULL,
	"test_weight_kg" numeric(6, 2) NOT NULL,
	"left_reps" integer NOT NULL,
	"right_reps" integer NOT NULL,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "limb_symmetry_test" ADD CONSTRAINT "limb_symmetry_test_athlete_profile_id_athlete_profile_id_fk" FOREIGN KEY ("athlete_profile_id") REFERENCES "public"."athlete_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "limb_symmetry_test_athlete_profile_id_idx" ON "limb_symmetry_test" USING btree ("athlete_profile_id");--> statement-breakpoint
CREATE INDEX "limb_symmetry_test_tested_at_idx" ON "limb_symmetry_test" USING btree ("tested_at");