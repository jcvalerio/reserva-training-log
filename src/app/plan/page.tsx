import { getBaselineLiftsForProfile } from "@/baseline/baseline-repository";
import { requireCurrentUser } from "@/lib/auth-server";
import { getRecentBodyMeasurementsForProfile } from "@/measurements/measurement-repository";
import { getM1Readiness } from "@/onboarding/readiness";
import { getNonAiPlanGate } from "@/plans/plan-gate";
import { getPlanPreviewSummary } from "@/plans/plan-preview";
import { getActivePlanForProfile, toGeneratedWorkoutPlan } from "@/plans/plan-repository";
import { createSeededHypertrophyPlan } from "@/plans/seeded-plan";
import { getAthleteProfileForUser } from "@/profile/profile-repository";

import { activatePlanAction } from "./actions";
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
  const activePlanPreview = activePlan ? getPlanPreviewSummary(toGeneratedWorkoutPlan(activePlan)) : null;

  return (
    <PlanPageContent
      readiness={readiness}
      gate={gate}
      seededPreview={seededPreview}
      activePlanPreview={activePlanPreview}
      activatedAt={activePlan?.plan.activatedAt ?? null}
      justSaved={params.saved === "1"}
      activatePlanAction={activatePlanAction}
    />
  );
}
