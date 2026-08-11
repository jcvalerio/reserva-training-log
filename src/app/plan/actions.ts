"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/lib/auth-server";
import {
  cloneWorkoutPlanToDraft,
  getDraftPlanForProfile,
  revertActivePlanToDraft,
} from "@/plans/plan-builder-repository";
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

  // Checked up front rather than left to revertActivePlanToDraft's throw, so
  // /plan can name the one blocker that is both common and recoverable — a
  // leftover draft — instead of showing the same dead-end message for every
  // failure. An already-open draft is the reason this button does nothing
  // until the draft is finished or discarded.
  const existingDraft = await getDraftPlanForProfile(profile.id);
  if (existingDraft) {
    redirect("/plan?error=draft_exists");
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

  // Same leftover-draft blocker as editActivePlanAction, same reason to name
  // it explicitly — cloneWorkoutPlanToDraft refuses for exactly this case too.
  const existingDraft = await getDraftPlanForProfile(profile.id);
  if (existingDraft) {
    redirect("/plan?error=draft_exists");
  }

  try {
    await cloneWorkoutPlanToDraft(profile.id, active.plan.id);
  } catch {
    redirect("/plan?error=duplicate_active");
  }

  revalidatePath("/plan/builder");
  redirect("/plan/builder");
}
