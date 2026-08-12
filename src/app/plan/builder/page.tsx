import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/lib/auth-server";
import { getDraftPlanForProfile } from "@/plans/plan-builder-repository";
import { getPrimaryMuscleGroupsByExerciseIds } from "@/plans/plan-repository";
import { classifySessionMuscleGroups } from "@/plans/session-muscle-groups";
import { getAthleteProfileForUser } from "@/profile/profile-repository";

import {
  activateDraftPlanAction,
  createDraftPlanAction,
  deleteSessionAction,
  discardDraftPlanAction,
  updatePlanDetailsAction,
} from "./actions";
import { BuilderPageContent, type DraftPlanSummary } from "./builder-page-content";

type BuilderPageProps = {
  searchParams?: Promise<{ saved?: string; error?: string }>;
};

export default async function PlanBuilderPage({ searchParams }: BuilderPageProps) {
  const user = await requireCurrentUser();
  const profile = await getAthleteProfileForUser(user.id);
  const params = searchParams ? await searchParams : {};

  if (!profile) {
    redirect("/perfil");
  }

  const draftPlan = await getDraftPlanForProfile(profile.id);
  let draft: DraftPlanSummary | null = null;
  if (draftPlan) {
    const exerciseIds = draftPlan.sessions.flatMap((session) =>
      session.exercises.flatMap((prescription) => (prescription.exerciseId ? [prescription.exerciseId] : [])),
    );
    const linkedMuscleGroupByExerciseId = await getPrimaryMuscleGroupsByExerciseIds(exerciseIds);
    draft = {
      id: draftPlan.plan.id,
      nameEs: draftPlan.plan.nameEs,
      daysPerWeek: draftPlan.plan.daysPerWeek,
      sessions: draftPlan.sessions.map((session) => ({
        dayIndex: session.template.dayIndex,
        nameEs: session.template.nameEs,
        exerciseCount: session.exercises.length,
        muscleGroups: classifySessionMuscleGroups(session.exercises, linkedMuscleGroupByExerciseId),
      })),
    };
  }

  const errorType =
    params.error === "validation" || params.error === "incomplete" || params.error === "activation"
      ? params.error
      : null;

  return (
    <BuilderPageContent
      draft={draft}
      justSaved={params.saved === "1"}
      errorType={errorType}
      createDraftPlanAction={createDraftPlanAction}
      updatePlanDetailsAction={updatePlanDetailsAction}
      deleteSessionAction={deleteSessionAction}
      discardDraftPlanAction={discardDraftPlanAction}
      activateDraftPlanAction={activateDraftPlanAction}
    />
  );
}
