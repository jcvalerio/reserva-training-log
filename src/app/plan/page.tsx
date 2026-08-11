import { requireCurrentUser } from "@/lib/auth-server";
import { getM1Readiness } from "@/onboarding/readiness";
import { getDraftPlanForProfile } from "@/plans/plan-builder-repository";
import { getNonAiPlanGate } from "@/plans/plan-gate";
import { getPlanPreviewSummary } from "@/plans/plan-preview";
import { getActivePlanForProfile, toGeneratedWorkoutPlan } from "@/plans/plan-repository";
import { getAthleteProfileForUser } from "@/profile/profile-repository";

import { cloneActivePlanAction, editActivePlanAction } from "./actions";
import { PlanPageContent, type PlanActionErrorType } from "./plan-page-content";

type PlanPageProps = {
  searchParams?: Promise<{ saved?: string; error?: string }>;
};

export default async function PlanPage({ searchParams }: PlanPageProps) {
  const user = await requireCurrentUser();
  const profile = await getAthleteProfileForUser(user.id);
  const params = searchParams ? await searchParams : {};

  const activePlan = profile ? await getActivePlanForProfile(profile.id) : null;
  // A draft blocks both "Editar mi plan" and "Duplicar como borrador", so
  // /plan has to say one exists. Until it did, the only entry point to the
  // builder was labelled "Crear mi propio plan" — which reads as starting
  // something new, not as resuming the draft that is holding everything up.
  const draftPlan = profile ? await getDraftPlanForProfile(profile.id) : null;

  const readiness = getM1Readiness({ hasProfile: Boolean(profile), hasActivePlan: Boolean(activePlan) });
  const gate = getNonAiPlanGate(readiness);
  const showStartFork = !activePlan && readiness.foundationReady;

  // A custom plan built through /plan/builder can activate without every
  // session meeting toGeneratedWorkoutPlan's stricter read-side schema (e.g.
  // minimum exercises per day) if the builder's own checks ever drift out of
  // sync with it again. Guard against that here so a bad active plan shows a
  // recoverable error instead of crashing the whole page on every visit.
  let activePlanPreview = null;
  let activePlanError = false;
  if (activePlan) {
    try {
      activePlanPreview = getPlanPreviewSummary(toGeneratedWorkoutPlan(activePlan));
    } catch {
      activePlanError = true;
    }
  }

  const errorType: PlanActionErrorType | null =
    params.error === "draft_exists" || params.error === "edit_active" || params.error === "duplicate_active"
      ? params.error
      : null;

  return (
    <PlanPageContent
      readiness={readiness}
      gate={gate}
      showStartFork={showStartFork}
      activePlanPreview={activePlanPreview}
      activePlanError={activePlanError}
      activatedAt={activePlan?.plan.activatedAt ?? null}
      justSaved={params.saved === "1"}
      errorType={errorType}
      draftName={draftPlan?.plan.nameEs ?? null}
      editActivePlanAction={editActivePlanAction}
      cloneActivePlanAction={cloneActivePlanAction}
    />
  );
}
