"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { MIN_SESSION_EXERCISES } from "@/plans/generated-plan-schema";
import {
  activateDraftPlan,
  CannotRemoveLoggedExerciseError,
  createDraftPlan,
  deleteDraftSession,
  discardDraftPlan,
  forceRemoveExercisePrescriptionWithHistory,
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

  // saveDraftSession updates existing exercisePrescription rows in place by
  // position rather than delete-and-reinsert specifically so logged history
  // survives an edit — but removing a row that already has real sets logged
  // against it still hits exerciseLog's onDelete:"restrict" the moment that
  // row becomes a genuine leftover to delete. The repository reports exactly
  // which exercise(s) blocked it; that's threaded through the redirect so
  // the page can offer a real confirm-and-delete action instead of a dead
  // end, rather than just a bare 500.
  try {
    await saveDraftSession(draftPlanId, dayIndex, sessionInfo, exercises);
  } catch (error) {
    if (error instanceof CannotRemoveLoggedExerciseError) {
      const blocked = encodeURIComponent(JSON.stringify(error.blocked));
      redirect(`/plan/builder/session/${dayIndex}?error=cannot_remove&blocked=${blocked}`);
    }
    redirect(`/plan/builder/session/${dayIndex}?error=cannot_remove`);
  }

  revalidatePath("/plan/builder");
  redirect("/plan/builder?saved=1");
}

/**
 * The confirmed, explicit counterpart to the block above — permanently
 * deletes one exercise's logged history so it can actually be removed from
 * the plan. Only reachable from the "cannot_remove" confirm screen, which
 * only exists because saveSessionAction just refused to do this silently.
 */
export async function forceRemoveExerciseAction(formData: FormData) {
  const user = await requireCurrentUser();
  const profile = await getAthleteProfileForUser(user.id);

  if (!profile) {
    redirect("/perfil");
  }

  const draftPlanId = formData.get("draftPlanId");
  const dayIndex = parseDayIndex(formData.get("dayIndex"));
  const exercisePrescriptionId = formData.get("exercisePrescriptionId");

  if (typeof draftPlanId !== "string" || dayIndex === null || typeof exercisePrescriptionId !== "string") {
    redirect("/plan/builder");
  }

  const draft = await getDraftPlanForProfile(profile.id);
  if (!draft || draft.plan.id !== draftPlanId) {
    redirect("/plan/builder");
  }

  await forceRemoveExercisePrescriptionWithHistory(draftPlanId, dayIndex, exercisePrescriptionId);

  revalidatePath("/plan/builder");
  redirect(`/plan/builder/session/${dayIndex}?saved=1`);
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

export async function discardDraftPlanAction(formData: FormData) {
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

  await discardDraftPlan(profile.id);

  revalidatePath("/plan/builder");
  redirect("/plan/builder");
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
