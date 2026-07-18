import { getBaselineLiftsForProfile } from "@/baseline/baseline-repository";
import { requireCurrentUser } from "@/lib/auth-server";
import { getRecentBodyMeasurementsForProfile } from "@/measurements/measurement-repository";
import { getM1Readiness } from "@/onboarding/readiness";
import { getNonAiPlanGate } from "@/plans/plan-gate";
import { getPlanPreviewSummary } from "@/plans/plan-preview";
import { createSeededHypertrophyPlan } from "@/plans/seeded-plan";
import { getAthleteProfileForUser } from "@/profile/profile-repository";

import { PlanPageContent } from "./plan-page-content";

export default async function PlanPage() {
  const user = await requireCurrentUser();
  const profile = await getAthleteProfileForUser(user.id);

  const [baselineLifts, bodyMeasurements] = profile
    ? await Promise.all([
        getBaselineLiftsForProfile(profile.id),
        getRecentBodyMeasurementsForProfile(profile.id, 1),
      ])
    : [[], []];

  const readiness = getM1Readiness({
    hasProfile: Boolean(profile),
    baselineLiftCount: baselineLifts.length,
    bodyMeasurementCount: bodyMeasurements.length,
  });
  const gate = getNonAiPlanGate(readiness);
  const seededPreview = readiness.foundationReady ? getPlanPreviewSummary(createSeededHypertrophyPlan()) : null;

  return <PlanPageContent readiness={readiness} gate={gate} seededPreview={seededPreview} />;
}
