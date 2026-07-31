"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { MIN_SESSION_EXERCISES } from "@/plans/generated-plan-schema";
import {
  activateDraftPlan,
  createDraftPlan,
  deleteDraftSession,
  getDraftPlanForProfile,
  saveDraftSession,
  updateDraftPlanDetails,
} from "@/plans/plan-builder-repository";
import {
  parsePlanBuilderSessionFormData,
  parsePlanBuilderSessionInfoFormData,
  parsePlanBuilderSetupFormData,
  type PlanBuilderExerciseInput,
  type PlanBuilderSessionInfoInput,
} from "@/plans/plan-builder-schema";
import { requireCurrentUser } from "@/lib/auth-server";
import { getAthleteProfileForUser } from "@/profile/profile-repository";

export async function createDraftPlanAction(formData: FormData) {
  const user = await requireCurrentUser();
  const profile = await getAthleteProfileForUser(user.id);

  if (!profile) {
    redirect("/perfil");
  }

  let input;
  try {
    input = parsePlanBuilderSetupFormData(formData);
  } catch {
    redirect("/plan/builder?error=validation");
  }

  await createDraftPlan(profile.id, input);

  revalidatePath("/plan/builder");
  redirect("/plan/builder?saved=1");
}

export async function updatePlanDetailsAction(formData: FormData) {
  const user = await requireCurrentUser();
  const profile = await getAthleteProfileForUser(user.id);

  if (!profile) {
    redirect("/perfil");
  }

  const draftPlanId = formData.get("draftPlanId");
  if (typeof draftPlanId !== "string") {
    redirect("/plan/builder");
  }

  const draft = await getDraftPlanForProfile(profile.id);
  if (!draft || draft.plan.id !== draftPlanId) {
    redirect("/plan/builder");
  }

  let input;
  try {
    input = parsePlanBuilderSetupFormData(formData);
  } catch {
    redirect("/plan/builder?error=validation");
  }

  await updateDraftPlanDetails(profile.id, draftPlanId, input);

  revalidatePath("/plan/builder");
  redirect("/plan/builder?saved=1");
}

export async function saveSessionAction(formData: FormData) {
  const user = await requireCurrentUser();
  const profile = await getAthleteProfileForUser(user.id);

  if (!profile) {
    redirect("/perfil");
  }

  const draftPlanId = formData.get("draftPlanId");
  const dayIndex = parseDayIndex(formData.get("dayIndex"));

  if (typeof draftPlanId !== "string" || dayIndex === null) {
    redirect("/plan/builder");
  }

  const draft = await getDraftPlanForProfile(profile.id);
  if (!draft || draft.plan.id !== draftPlanId) {
    redirect("/plan/builder");
  }

  let sessionInfo: PlanBuilderSessionInfoInput;
  let exercises: PlanBuilderExerciseInput[];
  try {
    sessionInfo = parsePlanBuilderSessionInfoFormData(formData);
    exercises = parsePlanBuilderSessionFormData(formData);
  } catch {
    redirect(`/plan/builder/session/${dayIndex}?error=validation`);
  }

  await saveDraftSession(draftPlanId, dayIndex, sessionInfo, exercises);

  revalidatePath("/plan/builder");
  redirect("/plan/builder?saved=1");
}

export async function deleteSessionAction(formData: FormData) {
  const user = await requireCurrentUser();
  const profile = await getAthleteProfileForUser(user.id);

  if (!profile) {
    redirect("/perfil");
  }

  const draftPlanId = formData.get("draftPlanId");
  const dayIndex = parseDayIndex(formData.get("dayIndex"));

  if (typeof draftPlanId !== "string" || dayIndex === null) {
    redirect("/plan/builder");
  }

  const draft = await getDraftPlanForProfile(profile.id);
  if (!draft || draft.plan.id !== draftPlanId) {
    redirect("/plan/builder");
  }

  await deleteDraftSession(draftPlanId, dayIndex);

  revalidatePath("/plan/builder");
  redirect("/plan/builder?saved=1");
}

export async function activateDraftPlanAction(formData: FormData) {
  const user = await requireCurrentUser();
  const profile = await getAthleteProfileForUser(user.id);

  if (!profile) {
    redirect("/perfil");
  }

  const draftPlanId = formData.get("draftPlanId");
  if (typeof draftPlanId !== "string") {
    redirect("/plan/builder");
  }

  const draft = await getDraftPlanForProfile(profile.id);
  if (!draft || draft.plan.id !== draftPlanId) {
    redirect("/plan/builder");
  }

  const exerciseCountByDayIndex = new Map(
    draft.sessions.map((session) => [session.template.dayIndex, session.exercises.length]),
  );
  const isComplete = Array.from({ length: draft.plan.daysPerWeek }, (_, index) => index + 1).every(
    (dayIndex) => (exerciseCountByDayIndex.get(dayIndex) ?? 0) >= MIN_SESSION_EXERCISES,
  );

  if (!isComplete) {
    redirect("/plan/builder?error=incomplete");
  }

  try {
    await activateDraftPlan(profile.id, draftPlanId);
  } catch {
    redirect("/plan/builder?error=activation");
  }

  revalidatePath("/");
  revalidatePath("/plan");
  revalidatePath("/entrenar");
  redirect("/plan?saved=1");
}

function parseDayIndex(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }
  const dayIndex = Number(value);
  return Number.isInteger(dayIndex) && dayIndex >= 1 && dayIndex <= 7 ? dayIndex : null;
}
