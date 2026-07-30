import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/lib/auth-server";
import { getDraftPlanForProfile } from "@/plans/plan-builder-repository";
import { getAthleteProfileForUser } from "@/profile/profile-repository";

import { activateDraftPlanAction, createDraftPlanAction, deleteSessionAction } from "./actions";
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
  const draft: DraftPlanSummary | null = draftPlan
    ? {
        id: draftPlan.plan.id,
        nameEs: draftPlan.plan.nameEs,
        daysPerWeek: draftPlan.plan.daysPerWeek,
        sessions: draftPlan.sessions.map((session) => ({
          dayIndex: session.template.dayIndex,
          nameEs: session.template.nameEs,
          exerciseCount: session.exercises.length,
        })),
      }
    : null;

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
      deleteSessionAction={deleteSessionAction}
      activateDraftPlanAction={activateDraftPlanAction}
    />
  );
}
