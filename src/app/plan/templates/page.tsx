import { redirect } from "next/navigation";

import { getBaselineLiftsForProfile } from "@/baseline/baseline-repository";
import { requireCurrentUser } from "@/lib/auth-server";
import { getRecentBodyMeasurementsForProfile } from "@/measurements/measurement-repository";
import { getM1Readiness } from "@/onboarding/readiness";
import { getActivePlanForProfile } from "@/plans/plan-repository";
import { planTemplates } from "@/plans/plan-templates";
import { getAthleteProfileForUser } from "@/profile/profile-repository";

import { TemplatesPageContent } from "./templates-page-content";

export default async function TemplatesPage() {
  const user = await requireCurrentUser();
  const profile = await getAthleteProfileForUser(user.id);

  if (!profile) {
    redirect("/perfil");
  }

  const [baselineLifts, bodyMeasurements, activePlan] = await Promise.all([
    getBaselineLiftsForProfile(profile.id),
    getRecentBodyMeasurementsForProfile(profile.id, 1),
    getActivePlanForProfile(profile.id),
  ]);

  const readiness = getM1Readiness({
    hasProfile: true,
    baselineLiftCount: baselineLifts.length,
    bodyMeasurementCount: bodyMeasurements.length,
  });

  if (!readiness.foundationReady || activePlan) {
    redirect("/plan");
  }

  return <TemplatesPageContent templates={planTemplates} />;
}
