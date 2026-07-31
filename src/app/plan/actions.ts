"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/lib/auth-server";
import { cloneWorkoutPlanToDraft, revertActivePlanToDraft } from "@/plans/plan-builder-repository";
import { activateSeededPlanForProfile, getActivePlanForProfile } from "@/plans/plan-repository";
import { isPlanTemplateId } from "@/plans/plan-templates";
import { getAthleteProfileForUser } from "@/profile/profile-repository";

export async function activatePlanAction(formData: FormData) {
  const user = await requireCurrentUser();
  const profile = await getAthleteProfileForUser(user.id);

  if (!profile) {
    redirect("/perfil");
  }

  const templateId = formData.get("templateId");
  if (typeof templateId !== "string" || !isPlanTemplateId(templateId)) {
    redirect("/plan/templates");
  }

  await activateSeededPlanForProfile(profile.id, templateId);

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

export async function cloneActivePlanAction() {
  const user = await requireCurrentUser();
  const profile = await getAthleteProfileForUser(user.id);

  if (!profile) {
    redirect("/perfil");
  }

  const active = await getActivePlanForProfile(profile.id);
  if (!active) {
    redirect("/plan");
  }

  try {
    await cloneWorkoutPlanToDraft(profile.id, active.plan.id);
  } catch {
    redirect("/plan?error=duplicate_active");
  }

  revalidatePath("/plan/builder");
  redirect("/plan/builder");
}
