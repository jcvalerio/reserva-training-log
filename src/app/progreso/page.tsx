import { requireCurrentUser } from "@/lib/auth-server";
import { getAthleteProfileForUser } from "@/profile/profile-repository";
import { buildConsistencySummary } from "@/workouts/consistency";
import { toExerciseSeriesGroups } from "@/workouts/exercise-series";
import { buildExerciseImprovements } from "@/workouts/improvement";
import { buildMuscleVolumeSummary } from "@/workouts/muscle-volume";
import {
  getCompletedWorkoutSessionsForProfile,
  getLoggedVolumeInstancesSince,
  getRecentExerciseInstancesByName,
} from "@/workouts/workout-repository";

import { ProgresoPageContent } from "./progreso-page-content";

export default async function ProgresoPage() {
  const user = await requireCurrentUser();
  const profile = await getAthleteProfileForUser(user.id);
  const [completedSessions, instances, volumeInstances] = profile
    ? await Promise.all([
        getCompletedWorkoutSessionsForProfile(profile.id),
        getRecentExerciseInstancesByName(profile.id, 12),
        // The Todo view needs every completed week, including rest weeks.
        getLoggedVolumeInstancesSince(profile.id, new Date(0)),
      ])
    : [[], new Map(), []];

  return (
    <ProgresoPageContent
      hasProfile={Boolean(profile)}
      completedSessions={completedSessions}
      improvements={buildExerciseImprovements(instances)}
      exerciseSeriesGroups={toExerciseSeriesGroups(instances)}
      consistencySummary={profile ? buildConsistencySummary(completedSessions, profile.targetTrainingDaysPerWeek) : null}
      muscleVolumeSummary={profile ? buildMuscleVolumeSummary(volumeInstances, { weeksBack: 8 }) : null}
    />
  );
}
