CREATE TABLE "functional_test" (
	"id" text PRIMARY KEY NOT NULL,
	"athlete_profile_id" text NOT NULL,
	"tested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sit_to_stand_reps" integer,
	"balance_left_seconds" numeric(6, 2),
	"balance_right_seconds" numeric(6, 2),
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "functional_test" ADD CONSTRAINT "functional_test_athlete_profile_id_athlete_profile_id_fk" FOREIGN KEY ("athlete_profile_id") REFERENCES "public"."athlete_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "functional_test_athlete_profile_id_idx" ON "functional_test" USING btree ("athlete_profile_id");--> statement-breakpoint
CREATE INDEX "functional_test_tested_at_idx" ON "functional_test" USING btree ("tested_at");