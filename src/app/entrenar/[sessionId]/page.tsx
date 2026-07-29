import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/lib/auth-server";
import { getAthleteProfileForUser } from "@/profile/profile-repository";
import { getSessionRunDetails, getWorkoutSessionForProfile } from "@/workouts/workout-repository";

import { completeSessionAction, saveSetAction } from "../actions";
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

  return (
    <SessionRunner
      session={session}
      template={template}
      exercises={exercises}
      saveSetAction={saveSetAction}
      completeSessionAction={completeSessionAction}
    />
  );
}
