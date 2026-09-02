import { requireCurrentUser } from "@/lib/auth-server";
import { getFunctionalTestsForProfile } from "@/measurements/functional-test-repository";
import { getRecentLimbSymmetryTestsForProfile } from "@/measurements/limb-symmetry-repository";
import { getRecentBodyMeasurementsForProfile } from "@/measurements/measurement-repository";
import { buildMeasurementSeries } from "@/measurements/measurement-series";
import { buildBodyMeasurementTrend } from "@/measurements/measurement-trend";
import { getAthleteProfileForUser } from "@/profile/profile-repository";
import { buildConsistencySummary, type ConsistencySummary } from "@/workouts/consistency";
import {
  buildFunctionalCapacitySummary,
  type FunctionalCapacitySummary,
} from "@/workouts/functional-capacity";
import { buildLimbSymmetrySummary, type LimbSymmetrySummary } from "@/workouts/limb-symmetry";
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

// All history, not a trailing window: the "Todo" period view averages over
// every completed week an athlete has trained, and buildMuscleVolumeSummary
// creates its week buckets on demand rather than being capped at
// VOLUME_WEEKS_BACK. With three users this is a few hundred rows.
const VOLUME_HISTORY_START = new Date(0);

export default async function ProgresoPage() {
  const user = await requireCurrentUser();
  const profile = await getAthleteProfileForUser(user.id);

  let completedSessions: CompletedSessionSummary[] = [];
  let instancesByName = new Map<string, ExerciseInstance[]>();
  let bodyMeasurements: Awaited<ReturnType<typeof getRecentBodyMeasurementsForProfile>> = [];
  let consistencySummary: ConsistencySummary | null = null;
  let muscleVolumeSummary: MuscleVolumeSummary | null = null;
  let limbSymmetry: LimbSymmetrySummary = buildLimbSymmetrySummary([], { now: new Date() });
  let functionalCapacity: FunctionalCapacitySummary = buildFunctionalCapacitySummary([], { now: new Date() });

  if (profile) {
    const [sessions, instances, measurements, volumeInstances, symmetryTests, functionalTests] =
      await Promise.all([
      getCompletedWorkoutSessionsForProfile(profile.id),
      getRecentExerciseInstancesByName(profile.id, EXERCISE_INSTANCE_HISTORY_LIMIT),
      getRecentBodyMeasurementsForProfile(profile.id, 24),
      getLoggedVolumeInstancesSince(profile.id, VOLUME_HISTORY_START),
      getRecentLimbSymmetryTestsForProfile(profile.id),
      getFunctionalTestsForProfile(profile.id),
    ]);
    completedSessions = sessions;
    instancesByName = instances;
    bodyMeasurements = measurements;
    consistencySummary = buildConsistencySummary(completedSessions, profile.targetTrainingDaysPerWeek);
    muscleVolumeSummary = buildMuscleVolumeSummary(volumeInstances, { weeksBack: VOLUME_WEEKS_BACK });
    limbSymmetry = buildLimbSymmetrySummary(symmetryTests, { now: new Date() });
    functionalCapacity = buildFunctionalCapacitySummary(functionalTests, { now: new Date() });
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
      limbSymmetry={limbSymmetry}
      functionalCapacity={functionalCapacity}
    />
  );
}
