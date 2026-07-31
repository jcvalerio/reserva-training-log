import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/lib/auth-server";
import { getPlanPreviewSummary } from "@/plans/plan-preview";
import { getActivePlanForProfile, toGeneratedWorkoutPlan } from "@/plans/plan-repository";
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

  return <PlanDetailContent summary={activePlanPreview} />;
}
