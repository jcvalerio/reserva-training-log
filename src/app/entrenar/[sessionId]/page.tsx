import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/lib/auth-server";
import { getRecentBodyMeasurementsForProfile } from "@/measurements/measurement-repository";
import { determineSmallerSide } from "@/measurements/measurement-schema";
import { getAthleteProfileForUser } from "@/profile/profile-repository";
import { buildExerciseImprovements } from "@/workouts/improvement";
import { buildSessionRecap, type SessionRecap } from "@/workouts/session-recap";
import {
  getPriorStrengthInstancesForNames,
  getRecentExerciseInstancesByName,
  getSessionRunDetails,
  getWorkoutSessionForProfile,
} from "@/workouts/workout-repository";

import {
  deleteSetAction,
  reassignExerciseAction,
  reopenSessionAction,
  saveSetAction,
  substituteExerciseAction,
  updateSetAction,
  updateTargetSetsAction,
} from "../actions";
import { SessionRunner } from "./session-runner";

export default async function SessionRunPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  // Set by /finalizar's "Volver al entrenamiento" and by its unfinished-list
  // rows, so returning here lands on the exercise you meant rather than on
  // whatever the first-incomplete heuristic picks.
  searchParams: Promise<{ ejercicio?: string }>;
}) {
  const { sessionId } = await params;
  const { ejercicio } = await searchParams;
  const user = await requireCurrentUser();
  const profile = await getAthleteProfileForUser(user.id);

  if (!profile) {
    redirect("/perfil");
  }

  const session = await getWorkoutSessionForProfile(sessionId, profile.id);
  if (!session) {
    redirect("/entrenar");
  }

  const { template, exercises, substitutesByExerciseId, planSubstituteChoices } =
    await getSessionRunDetails(session);
  const [latestMeasurement] = await getRecentBodyMeasurementsForProfile(profile.id, 1);
  const smallerSideHint = latestMeasurement ? determineSmallerSide(latestMeasurement) : null;

  // Only needed once the session is actually done — mid-workout renders never
  // reach CompletedSessionSummary, so there's nothing to gain fetching this
  // history query while sets are still being logged.
  let recap: SessionRecap | null = null;
  if (session.status === "completed") {
    const instancesByName = await getRecentExerciseInstancesByName(profile.id);
    const improvementRows = buildExerciseImprovements(instancesByName);
    const strengthExerciseNames = exercises
      .filter((exercise) => exercise.prescriptionType === "strength")
      .map((exercise) => exercise.exerciseNameEs);
    const priorInstancesByName = await getPriorStrengthInstancesForNames(
      profile.id,
      strengthExerciseNames,
      session.id,
    );
    recap = buildSessionRecap(exercises, session, improvementRows, priorInstancesByName);
  }

  return (
    <SessionRunner
      session={session}
      template={template}
      exercises={exercises}
      recap={recap}
      saveSetAction={saveSetAction}
      reopenSessionAction={reopenSessionAction}
      reassignExerciseAction={reassignExerciseAction}
      initialExerciseId={ejercicio ?? null}
      updateTargetSetsAction={updateTargetSetsAction}
      updateSetAction={updateSetAction}
      deleteSetAction={deleteSetAction}
      substituteExerciseAction={substituteExerciseAction}
      substitutesByExerciseId={substitutesByExerciseId}
      planSubstituteChoices={planSubstituteChoices}
      smallerSideHint={smallerSideHint}
    />
  );
}
