import { requireCurrentUser } from "@/lib/auth-server";
import { getRecentBodyMeasurementsForProfile } from "@/measurements/measurement-repository";
import { buildBodyMeasurementTrend } from "@/measurements/measurement-trend";
import { getAthleteProfileForUser } from "@/profile/profile-repository";
import { buildExerciseImprovements } from "@/workouts/improvement";
import {
  getCompletedWorkoutSessionsForProfile,
  getRecentExerciseInstancesByName,
  type CompletedSessionSummary,
  type ExerciseInstance,
} from "@/workouts/workout-repository";

import { ProgresoPageContent } from "./progreso-page-content";

export default async function ProgresoPage() {
  const user = await requireCurrentUser();
  const profile = await getAthleteProfileForUser(user.id);

  let completedSessions: CompletedSessionSummary[] = [];
  let instancesByName = new Map<string, ExerciseInstance[]>();
  let bodyMeasurements: Awaited<ReturnType<typeof getRecentBodyMeasurementsForProfile>> = [];

  if (profile) {
    [completedSessions, instancesByName, bodyMeasurements] = await Promise.all([
      getCompletedWorkoutSessionsForProfile(profile.id),
      getRecentExerciseInstancesByName(profile.id),
      getRecentBodyMeasurementsForProfile(profile.id, 24),
    ]);
  }

  return (
    <ProgresoPageContent
      hasProfile={Boolean(profile)}
      completedSessions={completedSessions}
      improvements={buildExerciseImprovements(instancesByName)}
      bodyMeasurementTrend={buildBodyMeasurementTrend(bodyMeasurements)}
    />
  );
}
