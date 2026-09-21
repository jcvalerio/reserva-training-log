import { requireCurrentUser } from "@/lib/auth-server";
import { getAthleteProfileForUser } from "@/profile/profile-repository";
import { getCompletedWorkoutSessionsForProfile } from "@/workouts/workout-repository";

import { SessionHistoryContent } from "./session-history-content";

export default async function SessionHistoryPage() {
  const user = await requireCurrentUser();
  const profile = await getAthleteProfileForUser(user.id);
  const sessions = profile ? await getCompletedWorkoutSessionsForProfile(profile.id) : [];
  return <SessionHistoryContent sessions={sessions} />;
}
