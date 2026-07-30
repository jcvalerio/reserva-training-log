"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getBaselineLiftsForProfile } from "@/baseline/baseline-repository";
import { requireCurrentUser } from "@/lib/auth-server";
import { getRecentBodyMeasurementsForProfile } from "@/measurements/measurement-repository";
import { getM1Readiness } from "@/onboarding/readiness";
import { revertActivePlanToDraft } from "@/plans/plan-builder-repository";
import { activateSeededPlanForProfile } from "@/plans/plan-repository";
import { getAthleteProfileForUser } from "@/profile/profile-repository";

export async function activatePlanAction() {
  const user = await requireCurrentUser();
  const profile = await getAthleteProfileForUser(user.id);

  if (!profile) {
    redirect("/perfil");
  }

  const [baselineLifts, bodyMeasurements] = await Promise.all([
    getBaselineLiftsForProfile(profile.id),
    getRecentBodyMeasurementsForProfile(profile.id, 1),
  ]);

  const readiness = getM1Readiness({
    hasProfile: true,
    baselineLiftCount: baselineLifts.length,
    bodyMeasurementCount: bodyMeasurements.length,
  });

  if (!readiness.foundationReady) {
    redirect("/plan");
  }

  await activateSeededPlanForProfile(profile.id);

  revalidatePath("/");
  revalidatePath("/plan");
  redirect("/plan?saved=1");
}

export async function editActivePlanAction() {
  const user = await requireCurrentUser();
  const profile = await getAthleteProfileForUser(user.id);

  if (!profile) {
    redirect("/perfil");
  }

  try {
    await revertActivePlanToDraft(profile.id);
  } catch {
    redirect("/plan?error=edit_active");
  }

  revalidatePath("/");
  revalidatePath("/plan");
  revalidatePath("/plan/builder");
  redirect("/plan/builder");
}
