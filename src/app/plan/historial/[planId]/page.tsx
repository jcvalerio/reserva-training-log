import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/lib/auth-server";
import { getDraftPlanSessions } from "@/plans/plan-builder-repository";
import { getPlanPreviewSummary, type PlanPreviewSummary } from "@/plans/plan-preview";
import {
  getPlanForProfile,
  getPlanSessionStats,
  getPrimaryMuscleGroupsByExerciseIds,
  toGeneratedWorkoutPlan,
} from "@/plans/plan-repository";
import { classifySessionMuscleGroups } from "@/plans/session-muscle-groups";
import { getAthleteProfileForUser } from "@/profile/profile-repository";
import type { MuscleGroup } from "@/training/muscle-taxonomy";

import { PlanHistoryDetailContent } from "./plan-history-detail-content";

type PlanHistorialDetailPageProps = {
  params: Promise<{ planId: string }>;
};

export default async function PlanHistorialDetailPage({ params }: PlanHistorialDetailPageProps) {
  const { planId } = await params;
  const user = await requireCurrentUser();
  const profile = await getAthleteProfileForUser(user.id);

  if (!profile) {
    redirect("/perfil");
  }

  const plan = await getPlanForProfile(profile.id, planId);
  if (!plan) {
    redirect("/plan/historial");
  }

  const [{ sessions }, stats] = await Promise.all([getDraftPlanSessions(plan), getPlanSessionStats(plan.id)]);

  let preview: PlanPreviewSummary | null = null;
  let previewError = false;
  let muscleGroupsByDayIndex: Map<number, MuscleGroup[]> | undefined;
  if (sessions.length > 0) {
    try {
      preview = getPlanPreviewSummary(toGeneratedWorkoutPlan({ plan, sessions }));
      const exerciseIds = sessions.flatMap((session) =>
        session.exercises.flatMap((prescription) => (prescription.exerciseId ? [prescription.exerciseId] : [])),
      );
      const linkedMuscleGroupByExerciseId = await getPrimaryMuscleGroupsByExerciseIds(exerciseIds);
      muscleGroupsByDayIndex = new Map(
        sessions.map((session) => [
          session.template.dayIndex,
          classifySessionMuscleGroups(session.exercises, linkedMuscleGroupByExerciseId),
        ]),
      );
    } catch {
      previewError = true;
    }
  }

  return (
    <PlanHistoryDetailContent
      plan={plan}
      stats={stats}
      preview={preview}
      previewError={previewError}
      muscleGroupsByDayIndex={muscleGroupsByDayIndex}
    />
  );
}
