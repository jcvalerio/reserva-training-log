import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/lib/auth-server";
import { getRecentBodyMeasurementsForProfile } from "@/measurements/measurement-repository";
import { determineSmallerSide } from "@/measurements/measurement-schema";
import { getAthleteProfileForUser } from "@/profile/profile-repository";
import { getSessionRunDetails, getWorkoutSessionForProfile } from "@/workouts/workout-repository";

import { completeSessionAction, saveSetAction, updateTargetSetsAction } from "../actions";
import { SessionRunner } from "./session-runner";

export default async function SessionRunPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const user = await requireCurrentUser();
  const profile = await getAthleteProfileForUser(user.id);

  if (!profile) {
    redirect("/perfil");
  }

  const session = await getWorkoutSessionForProfile(sessionId, profile.id);
  if (!session) {
    redirect("/entrenar");
  }

  const { template, exercises } = await getSessionRunDetails(session);
  const [latestMeasurement] = await getRecentBodyMeasurementsForProfile(profile.id, 1);
  const smallerSideHint = latestMeasurement ? determineSmallerSide(latestMeasurement) : null;

  return (
    <SessionRunner
      session={session}
      template={template}
      exercises={exercises}
      saveSetAction={saveSetAction}
      completeSessionAction={completeSessionAction}
      updateTargetSetsAction={updateTargetSetsAction}
      smallerSideHint={smallerSideHint}
    />
  );
}
