CREATE TABLE "body_measurement" (
	"id" text PRIMARY KEY NOT NULL,
	"athlete_profile_id" text NOT NULL,
	"measured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"body_weight_kg" numeric(6, 2),
	"waist_cm" numeric(6, 2),
	"right_thigh_cm" numeric(6, 2),
	"left_thigh_cm" numeric(6, 2),
	"right_calf_cm" numeric(6, 2),
	"left_calf_cm" numeric(6, 2),
	"right_arm_cm" numeric(6, 2),
	"left_arm_cm" numeric(6, 2),
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "body_measurement" ADD CONSTRAINT "body_measurement_athlete_profile_id_athlete_profile_id_fk" FOREIGN KEY ("athlete_profile_id") REFERENCES "public"."athlete_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "body_measurement_athlete_profile_id_idx" ON "body_measurement" USING btree ("athlete_profile_id");--> statement-breakpoint
CREATE INDEX "body_measurement_measured_at_idx" ON "body_measurement" USING btree ("measured_at");