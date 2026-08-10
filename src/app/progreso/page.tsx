import { requireCurrentUser } from "@/lib/auth-server";
import { getRecentBodyMeasurementsForProfile } from "@/measurements/measurement-repository";
import { buildMeasurementSeries } from "@/measurements/measurement-series";
import { buildBodyMeasurementTrend } from "@/measurements/measurement-trend";
import { getAthleteProfileForUser } from "@/profile/profile-repository";
import { buildConsistencySummary, type ConsistencySummary } from "@/workouts/consistency";
import { pickDefaultExerciseName, toExerciseSeriesGroups } from "@/workouts/exercise-series";
import { buildExerciseImprovements } from "@/workouts/improvement";
import { buildMuscleVolumeSummary, type MuscleVolumeSummary } from "@/workouts/muscle-volume";
import {
  getCompletedWorkoutSessionsForProfile,
  getLoggedVolumeInstancesSince,
  getRecentExerciseInstancesByName,
  type CompletedSessionSummary,
  type ExerciseInstance,
} from "@/workouts/workout-repository";

import { ProgresoPageContent } from "./progreso-page-content";

// The improvement cards only need the latest 2 instances per exercise, but
// the progression chart wants real history to grow into — one query serves
// both (buildExerciseImprovements just reads the first 2 of whatever it gets).
const EXERCISE_INSTANCE_HISTORY_LIMIT = 12;

// Matches buildMuscleVolumeSummary's default window and buildConsistencySummary's,
// so all three weekly views on this page cover the same span.
const VOLUME_WEEKS_BACK = 8;

// Outside the component: reading the clock inside a component body trips
// react-hooks/purity, and this is a request-time value either way.
function volumeWindowStart(): Date {
  return new Date(Date.now() - VOLUME_WEEKS_BACK * 7 * 24 * 60 * 60 * 1000);
}

export default async function ProgresoPage() {
  const user = await requireCurrentUser();
  const profile = await getAthleteProfileForUser(user.id);

  let completedSessions: CompletedSessionSummary[] = [];
  let instancesByName = new Map<string, ExerciseInstance[]>();
  let bodyMeasurements: Awaited<ReturnType<typeof getRecentBodyMeasurementsForProfile>> = [];
  let consistencySummary: ConsistencySummary | null = null;
  let muscleVolumeSummary: MuscleVolumeSummary | null = null;

  if (profile) {
    const volumeSince = volumeWindowStart();
    const [sessions, instances, measurements, volumeInstances] = await Promise.all([
      getCompletedWorkoutSessionsForProfile(profile.id),
      getRecentExerciseInstancesByName(profile.id, EXERCISE_INSTANCE_HISTORY_LIMIT),
      getRecentBodyMeasurementsForProfile(profile.id, 24),
      getLoggedVolumeInstancesSince(profile.id, volumeSince),
    ]);
    completedSessions = sessions;
    instancesByName = instances;
    bodyMeasurements = measurements;
    consistencySummary = buildConsistencySummary(completedSessions, profile.targetTrainingDaysPerWeek);
    muscleVolumeSummary = buildMuscleVolumeSummary(volumeInstances, { weeksBack: VOLUME_WEEKS_BACK });
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
      muscleVolumeSummary={muscleVolumeSummary}
    />
  );
}
