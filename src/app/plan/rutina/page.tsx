import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/lib/auth-server";
import { getPlanPreviewSummary } from "@/plans/plan-preview";
import { getActivePlanForProfile, getPrimaryMuscleGroupsByExerciseIds, toGeneratedWorkoutPlan } from "@/plans/plan-repository";
import { classifySessionMuscleGroups } from "@/plans/session-muscle-groups";
import { getAthleteProfileForUser } from "@/profile/profile-repository";

import { PlanDetailContent } from "./plan-detail-content";

export default async function PlanDetailPage() {
  const user = await requireCurrentUser();
  const profile = await getAthleteProfileForUser(user.id);
  const activePlan = profile ? await getActivePlanForProfile(profile.id) : null;

  if (!activePlan) {
    redirect("/plan");
  }

  let activePlanPreview;
  try {
    activePlanPreview = getPlanPreviewSummary(toGeneratedWorkoutPlan(activePlan));
  } catch {
    redirect("/plan");
  }

  // Same week-1-is-meaningful filter toGeneratedWorkoutPlan applies — plans
  // repeat indefinitely, so a plan activated before that model existed can
  // still carry real weekNumber 2-4 template rows that would otherwise
  // collide with week 1's dayIndex keys below.
  const weekOneSessions = activePlan.sessions.filter((session) => session.template.weekNumber === 1);
  const exerciseIds = weekOneSessions.flatMap((session) =>
    session.exercises.flatMap((prescription) => (prescription.exerciseId ? [prescription.exerciseId] : [])),
  );
  const linkedMuscleGroupByExerciseId = await getPrimaryMuscleGroupsByExerciseIds(exerciseIds);
  const muscleGroupsByDayIndex = new Map(
    weekOneSessions.map((session) => [
      session.template.dayIndex,
      classifySessionMuscleGroups(session.exercises, linkedMuscleGroupByExerciseId),
    ]),
  );

  return <PlanDetailContent summary={activePlanPreview} muscleGroupsByDayIndex={muscleGroupsByDayIndex} />;
}
