import { getBaselineLiftsForProfile } from "@/baseline/baseline-repository";
import { requireCurrentUser } from "@/lib/auth-server";
import { getRecentBodyMeasurementsForProfile } from "@/measurements/measurement-repository";
import { getM1Readiness } from "@/onboarding/readiness";
import { getNonAiPlanGate } from "@/plans/plan-gate";
import { getPlanPreviewSummary } from "@/plans/plan-preview";
import { getActivePlanForProfile, toGeneratedWorkoutPlan } from "@/plans/plan-repository";
import { createSeededHypertrophyPlan } from "@/plans/seeded-plan";
import { getAthleteProfileForUser } from "@/profile/profile-repository";

import { activatePlanAction, editActivePlanAction } from "./actions";
import { PlanPageContent } from "./plan-page-content";

type PlanPageProps = {
  searchParams?: Promise<{ saved?: string }>;
};

export default async function PlanPage({ searchParams }: PlanPageProps) {
  const user = await requireCurrentUser();
  const profile = await getAthleteProfileForUser(user.id);
  const params = searchParams ? await searchParams : {};

  const [baselineLifts, bodyMeasurements, activePlan] = profile
    ? await Promise.all([
        getBaselineLiftsForProfile(profile.id),
        getRecentBodyMeasurementsForProfile(profile.id, 1),
        getActivePlanForProfile(profile.id),
      ])
    : [[], [], null];

  const readiness = getM1Readiness({
    hasProfile: Boolean(profile),
    baselineLiftCount: baselineLifts.length,
    bodyMeasurementCount: bodyMeasurements.length,
  });
  const gate = getNonAiPlanGate(readiness);
  const seededPreview =
    !activePlan && readiness.foundationReady ? getPlanPreviewSummary(createSeededHypertrophyPlan()) : null;

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

  return (
    <PlanPageContent
      readiness={readiness}
      gate={gate}
      seededPreview={seededPreview}
      activePlanPreview={activePlanPreview}
      activePlanError={activePlanError}
      activatedAt={activePlan?.plan.activatedAt ?? null}
      justSaved={params.saved === "1"}
      activatePlanAction={activatePlanAction}
      editActivePlanAction={editActivePlanAction}
    />
  );
}
