CREATE TYPE "public"."plan_share_invite_status" AS ENUM('pending', 'redeemed');--> statement-breakpoint
CREATE TABLE "plan_share_invite" (
	"id" text PRIMARY KEY NOT NULL,
	"source_workout_plan_id" text NOT NULL,
	"created_by_athlete_profile_id" text NOT NULL,
	"recipient_email" text NOT NULL,
	"code" text NOT NULL,
	"status" "plan_share_invite_status" DEFAULT 'pending' NOT NULL,
	"redeemed_by_athlete_profile_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"redeemed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "exercise_prescription" ADD COLUMN "lineage_key" text;--> statement-breakpoint
ALTER TABLE "workout_plan" ADD COLUMN "share_plan_group_id" text;--> statement-breakpoint
ALTER TABLE "plan_share_invite" ADD CONSTRAINT "plan_share_invite_source_workout_plan_id_workout_plan_id_fk" FOREIGN KEY ("source_workout_plan_id") REFERENCES "public"."workout_plan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_share_invite" ADD CONSTRAINT "plan_share_invite_created_by_athlete_profile_id_athlete_profile_id_fk" FOREIGN KEY ("created_by_athlete_profile_id") REFERENCES "public"."athlete_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_share_invite" ADD CONSTRAINT "plan_share_invite_redeemed_by_athlete_profile_id_athlete_profile_id_fk" FOREIGN KEY ("redeemed_by_athlete_profile_id") REFERENCES "public"."athlete_profile"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "plan_share_invite_code_unique" ON "plan_share_invite" USING btree ("code");--> statement-breakpoint
CREATE INDEX "plan_share_invite_source_plan_idx" ON "plan_share_invite" USING btree ("source_workout_plan_id");--> statement-breakpoint
CREATE INDEX "plan_share_invite_recipient_email_idx" ON "plan_share_invite" USING btree ("recipient_email");--> statement-breakpoint
CREATE INDEX "workout_plan_share_group_idx" ON "workout_plan" USING btree ("share_plan_group_id");