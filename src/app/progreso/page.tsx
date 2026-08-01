import { requireCurrentUser } from "@/lib/auth-server";
import { getRecentBodyMeasurementsForProfile } from "@/measurements/measurement-repository";
import { buildMeasurementSeries } from "@/measurements/measurement-series";
import { buildBodyMeasurementTrend } from "@/measurements/measurement-trend";
import { getAthleteProfileForUser } from "@/profile/profile-repository";
import { buildConsistencySummary, type ConsistencySummary } from "@/workouts/consistency";
import { pickDefaultExerciseName, toExerciseSeriesGroups } from "@/workouts/exercise-series";
import { buildExerciseImprovements } from "@/workouts/improvement";
import {
  getCompletedWorkoutSessionsForProfile,
  getRecentExerciseInstancesByName,
  type CompletedSessionSummary,
  type ExerciseInstance,
} from "@/workouts/workout-repository";

import { ProgresoPageContent } from "./progreso-page-content";

// The improvement cards only need the latest 2 instances per exercise, but
// the progression chart wants real history to grow into — one query serves
// both (buildExerciseImprovements just reads the first 2 of whatever it gets).
const EXERCISE_INSTANCE_HISTORY_LIMIT = 12;

export default async function ProgresoPage() {
  const user = await requireCurrentUser();
  const profile = await getAthleteProfileForUser(user.id);

  let completedSessions: CompletedSessionSummary[] = [];
  let instancesByName = new Map<string, ExerciseInstance[]>();
  let bodyMeasurements: Awaited<ReturnType<typeof getRecentBodyMeasurementsForProfile>> = [];
  let consistencySummary: ConsistencySummary | null = null;

  if (profile) {
    [completedSessions, instancesByName, bodyMeasurements] = await Promise.all([
      getCompletedWorkoutSessionsForProfile(profile.id),
      getRecentExerciseInstancesByName(profile.id, EXERCISE_INSTANCE_HISTORY_LIMIT),
      getRecentBodyMeasurementsForProfile(profile.id, 24),
    ]);
    consistencySummary = buildConsistencySummary(completedSessions, profile.targetTrainingDaysPerWeek);
  }

  const exerciseSeriesGroups = toExerciseSeriesGroups(instancesByName);

  return (
    <ProgresoPageContent
      hasProfile={Boolean(profile)}
      completedSessions={completedSessions}
      improvements={buildExerciseImprovements(instancesByName)}
      bodyMeasurementTrend={buildBodyMeasurementTrend(bodyMeasurements)}
      measurementSeries={buildMeasurementSeries(bodyMeasurements)}
      exerciseSeriesGroups={exerciseSeriesGroups}
      defaultExerciseName={pickDefaultExerciseName(exerciseSeriesGroups)}
      consistencySummary={consistencySummary}
    />
  );
}
