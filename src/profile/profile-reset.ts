import { count, eq } from "drizzle-orm";

import { db } from "@/db";
import { bodyMeasurement, workoutPlan, workoutSession } from "@/db/schema";

export type ProfileResetSummary = {
  planCount: number;
  sessionCount: number;
  measurementCount: number;
};

export async function getProfileResetSummary(athleteProfileId: string): Promise<ProfileResetSummary> {
  const [[plans], [sessions], [measurements]] = await Promise.all([
    db.select({ value: count() }).from(workoutPlan).where(eq(workoutPlan.athleteProfileId, athleteProfileId)),
    db.select({ value: count() }).from(workoutSession).where(eq(workoutSession.athleteProfileId, athleteProfileId)),
    db.select({ value: count() }).from(bodyMeasurement).where(eq(bodyMeasurement.athleteProfileId, athleteProfileId)),
  ]);

  return {
    planCount: plans?.value ?? 0,
    sessionCount: sessions?.value ?? 0,
    measurementCount: measurements?.value ?? 0,
  };
}

// Wipes every plan/session/measurement a profile has ever had — the profile
// row itself (and limitation/musclePriority, its onboarding characteristics)
// are left untouched, only training data goes.
//
// Order matters: workoutSession must go first. exerciseLog.exercisePrescriptionId
// is deliberately onDelete:"restrict" (protects logged history from an
// accidental plan edit elsewhere), so deleting workoutPlan first would fail
// with a live FK violation for any plan that has ever been trained. Deleting
// workoutSession first cascades exerciseLog -> setLog away, clearing that
// restriction before workoutPlan (which cascades planSessionTemplate,
// exercisePrescription, and any planShareInvite created from it) is deleted.
//
// No db.transaction: this codebase's Neon HTTP driver has no established
// transaction usage elsewhere. A mid-failure here is recoverable (rerun),
// not silently corrupting — nothing downstream depends on partial state.
//
// keepMeasurements: body measurements track physical progress independent of
// whichever plan you're running, so they're excluded by default — a "start
// fresh" reset shouldn't have to mean losing real weight/measurement
// history too. Pass keepMeasurements: false for a genuinely full wipe.
export async function resetAthleteProfileData(
  athleteProfileId: string,
  { keepMeasurements = true }: { keepMeasurements?: boolean } = {},
): Promise<void> {
  await db.delete(workoutSession).where(eq(workoutSession.athleteProfileId, athleteProfileId));
  if (!keepMeasurements) {
    await db.delete(bodyMeasurement).where(eq(bodyMeasurement.athleteProfileId, athleteProfileId));
  }
  await db.delete(workoutPlan).where(eq(workoutPlan.athleteProfileId, athleteProfileId));
}
