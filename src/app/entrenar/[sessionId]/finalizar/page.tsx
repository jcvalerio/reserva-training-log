import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/lib/auth-server";
import { getAthleteProfileForUser } from "@/profile/profile-repository";
import { buildFinishSummary } from "@/workouts/session-finish";
import { getSessionRunDetails, getWorkoutSessionForProfile } from "@/workouts/workout-repository";

import { completeSessionAction } from "../../actions";
import { FinishSessionView } from "./finish-session-view";

/**
 * The deliberate pause between "I'm done" and the session actually ending.
 *
 * A real route rather than a modal or an in-place view swap, and that is the
 * load-bearing choice: the iOS back-swipe and the shell's own back link both
 * become working "cancel" affordances for free. A modal has one exit; a view
 * swap makes Back leave the session entirely. For a screen whose entire job is
 * "are you sure", the exits are the feature.
 *
 * It also earns its extra tap rather than merely nagging — it is the only
 * screen in the app that can say what you are about to leave unfinished, and
 * let you tap straight back into it.
 */
export default async function FinishSessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ volver?: string }>;
}) {
  const { sessionId } = await params;
  const { volver } = await searchParams;
  const user = await requireCurrentUser();
  const profile = await getAthleteProfileForUser(user.id);

  if (!profile) {
    redirect("/perfil");
  }

  const session = await getWorkoutSessionForProfile(sessionId, profile.id);
  if (!session) {
    redirect("/entrenar");
  }

  // Already finished (or reopened and finished elsewhere, or a stale tab):
  // there is nothing to confirm, and the completed summary is the honest
  // destination rather than a confirmation for an action already taken.
  if (session.status !== "active") {
    redirect(`/entrenar/${sessionId}`);
  }

  const { template, exercises } = await getSessionRunDetails(session);
  const summary = buildFinishSummary(exercises, session.startedAt, new Date());

  return (
    <FinishSessionView
      sessionId={session.id}
      template={template}
      summary={summary}
      returnToExerciseId={volver ?? null}
      completeSessionAction={completeSessionAction}
    />
  );
}
