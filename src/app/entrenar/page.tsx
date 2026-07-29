import { requireCurrentUser } from "@/lib/auth-server";
import { getActivePlanForProfile } from "@/plans/plan-repository";
import { getAthleteProfileForUser } from "@/profile/profile-repository";
import { buildEntrenarWeeks } from "@/workouts/session-progress";
import { getWorkoutSessionsForProfile } from "@/workouts/workout-repository";

import { startOrResumeSessionAction } from "./actions";
import { EntrenarPageContent } from "./entrenar-page-content";

type EntrenarPageProps = {
  searchParams?: Promise<{ completed?: string }>;
};

export default async function EntrenarPage({ searchParams }: EntrenarPageProps) {
  const user = await requireCurrentUser();
  const profile = await getAthleteProfileForUser(user.id);
  const params = searchParams ? await searchParams : {};

  const activePlan = profile ? await getActivePlanForProfile(profile.id) : null;
  const workoutSessions = profile ? await getWorkoutSessionsForProfile(profile.id) : [];

  return (
    <EntrenarPageContent
      hasActivePlan={Boolean(activePlan)}
      weeks={activePlan ? buildEntrenarWeeks(activePlan, workoutSessions) : []}
      justCompleted={params.completed === "1"}
      startOrResumeSessionAction={startOrResumeSessionAction}
    />
  );
}
