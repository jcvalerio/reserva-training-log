"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/lib/auth-server";
import {
  createSubstituteExercise,
  getActivePlanForProfile,
  updateExercisePrescriptionTargetSets,
} from "@/plans/plan-repository";
import { getAthleteProfileForUser } from "@/profile/profile-repository";
import {
  normalizeSubstituteName,
  substitutionReasonLabelsEs,
  substitutionReasons,
} from "@/workouts/exercise-substitution";
import { parseSessionCompletionFormData } from "@/workouts/session-completion-schema";
import { parseSetLogFormData } from "@/workouts/set-log-schema";
import {
  completeWorkoutSession,
  deleteSetForSession,
  getWorkoutSessionForProfile,
  markExerciseChosenForSession,
  saveSetForSession,
  startOrResumeWorkoutSession,
  updateSetForSession,
} from "@/workouts/workout-repository";

export async function startOrResumeSessionAction(formData: FormData) {
  const user = await requireCurrentUser();
  const profile = await getAthleteProfileForUser(user.id);

  if (!profile) {
    redirect("/perfil");
  }

  const planSessionTemplateId = formData.get("planSessionTemplateId");
  if (typeof planSessionTemplateId !== "string" || !planSessionTemplateId) {
    redirect("/entrenar");
  }

  const activePlan = await getActivePlanForProfile(profile.id);
  const belongsToActivePlan = activePlan?.sessions.some((session) => session.template.id === planSessionTemplateId);

  if (!activePlan || !belongsToActivePlan) {
    redirect("/entrenar");
  }

  const session = await startOrResumeWorkoutSession(profile.id, activePlan.plan.id, planSessionTemplateId);

  revalidatePath("/entrenar");
  redirect(`/entrenar/${session.id}`);
}

export type SaveSetActionState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "saved"; exercisePrescriptionId: string; setNumber: number; painScore: number };

export async function saveSetAction(
  _previousState: SaveSetActionState,
  formData: FormData,
): Promise<SaveSetActionState> {
  const user = await requireCurrentUser();
  const profile = await getAthleteProfileForUser(user.id);

  if (!profile) {
    return { status: "error", message: "No se encontró tu perfil." };
  }

  const workoutSessionId = formData.get("workoutSessionId");
  const exercisePrescriptionId = formData.get("exercisePrescriptionId");

  if (typeof workoutSessionId !== "string" || typeof exercisePrescriptionId !== "string") {
    return { status: "error", message: "Falta información de la sesión o el ejercicio." };
  }

  const session = await getWorkoutSessionForProfile(workoutSessionId, profile.id);
  if (!session || session.status !== "active") {
    return { status: "error", message: "Esta sesión no está disponible para registrar series." };
  }

  let input;
  try {
    input = parseSetLogFormData(formData);
  } catch {
    return { status: "error", message: "Revisa los datos del set: hay valores fuera de rango." };
  }

  const { setNumber } = await saveSetForSession({
    workoutSessionId,
    exercisePrescriptionId,
    ...input,
    notes: input.notes ?? null,
  });

  revalidatePath(`/entrenar/${workoutSessionId}`);

  return { status: "saved", exercisePrescriptionId, setNumber, painScore: input.painScore };
}

export type EditSetActionState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "updated"; setLogId: string }
  | { status: "deleted"; setLogId: string };

/**
 * Unlike saveSetAction, correcting or removing a set is allowed on a
 * *completed* session too, not just an active one: a mislogged weight or a
 * set logged against the wrong exercise is usually noticed after finishing,
 * and every progression read (suggestProgression, the /progreso series)
 * derives from set_log live rather than from a snapshot taken at completion
 * — so a later correction simply makes the next suggestion right.
 */
async function requireEditableSession(workoutSessionId: unknown): Promise<{ profileId: string } | { error: string }> {
  const user = await requireCurrentUser();
  const profile = await getAthleteProfileForUser(user.id);

  if (!profile) {
    return { error: "No se encontró tu perfil." };
  }

  if (typeof workoutSessionId !== "string" || !workoutSessionId) {
    return { error: "Falta información de la sesión." };
  }

  const session = await getWorkoutSessionForProfile(workoutSessionId, profile.id);
  if (!session) {
    return { error: "Esta sesión no está disponible." };
  }

  return { profileId: profile.id };
}

export async function updateSetAction(
  _previousState: EditSetActionState,
  formData: FormData,
): Promise<EditSetActionState> {
  const workoutSessionId = formData.get("workoutSessionId");
  const guard = await requireEditableSession(workoutSessionId);
  if ("error" in guard) {
    return { status: "error", message: guard.error };
  }

  const setLogId = formData.get("setLogId");
  if (typeof setLogId !== "string" || !setLogId) {
    return { status: "error", message: "No se encontró la serie que querés corregir." };
  }

  let input;
  try {
    // Same parser the create path uses — an edit must not accept a value a
    // fresh log couldn't.
    input = parseSetLogFormData(formData);
  } catch {
    return { status: "error", message: "Revisa los datos del set: hay valores fuera de rango." };
  }

  const updated = await updateSetForSession(guard.profileId, setLogId, {
    ...input,
    notes: input.notes ?? null,
  });

  if (!updated) {
    return { status: "error", message: "No se pudo actualizar la serie." };
  }

  revalidatePath(`/entrenar/${workoutSessionId as string}`);
  revalidatePath("/progreso");

  return { status: "updated", setLogId };
}

export async function deleteSetAction(
  _previousState: EditSetActionState,
  formData: FormData,
): Promise<EditSetActionState> {
  const workoutSessionId = formData.get("workoutSessionId");
  const guard = await requireEditableSession(workoutSessionId);
  if ("error" in guard) {
    return { status: "error", message: guard.error };
  }

  const setLogId = formData.get("setLogId");
  if (typeof setLogId !== "string" || !setLogId) {
    return { status: "error", message: "No se encontró la serie que querés borrar." };
  }

  const deleted = await deleteSetForSession(guard.profileId, setLogId);
  if (!deleted) {
    return { status: "error", message: "No se pudo borrar la serie." };
  }

  revalidatePath(`/entrenar/${workoutSessionId as string}`);
  revalidatePath("/progreso");

  return { status: "deleted", setLogId };
}

export type SubstituteExerciseActionState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "substituted"; originalPrescriptionId: string; exerciseNameEs: string };

/**
 * Swaps the current exercise for another one — the busy/broken machine case,
 * or a movement that doesn't feel right today.
 *
 * The reason is stored rather than discarded because the reasons aren't
 * clinically equivalent: equipment problems are logistics, but "no me sentí
 * bien" is a symptom report, and the original ends the session with no logged
 * sets, so nothing else would record that anything was wrong.
 */
export async function substituteExerciseAction(
  _previousState: SubstituteExerciseActionState,
  formData: FormData,
): Promise<SubstituteExerciseActionState> {
  const workoutSessionId = formData.get("workoutSessionId");
  const guard = await requireEditableSession(workoutSessionId);
  if ("error" in guard) {
    return { status: "error", message: guard.error };
  }

  const originalPrescriptionId = formData.get("originalPrescriptionId");
  if (typeof originalPrescriptionId !== "string" || !originalPrescriptionId) {
    return { status: "error", message: "No se encontró el ejercicio que querés cambiar." };
  }

  // Either a name picked from the plan / an existing alternative, or one typed
  // in — both arrive here as plain text and go through the same normaliser.
  const rawName = formData.get("exerciseNameEs");
  const exerciseNameEs = typeof rawName === "string" ? normalizeSubstituteName(rawName) : null;
  if (!exerciseNameEs) {
    return { status: "error", message: "Escribe o elige el nombre del ejercicio que vas a hacer." };
  }

  const rawReason = formData.get("reason");
  const reason = substitutionReasons.find((value) => value === rawReason) ?? null;
  const reasonEs = reason ? substitutionReasonLabelsEs[reason] : null;

  const created = await createSubstituteExercise(guard.profileId, {
    originalPrescriptionId,
    exerciseNameEs,
    reasonEs,
  });

  if (!created) {
    return { status: "error", message: "No se pudo cambiar el ejercicio." };
  }

  // Puts the alternative into this session's running order straight away —
  // it has no sets yet, and it has to be on screen before you can log one.
  await markExerciseChosenForSession(workoutSessionId as string, created.id);

  revalidatePath(`/entrenar/${workoutSessionId as string}`);
  revalidatePath("/plan/rutina");

  return { status: "substituted", originalPrescriptionId, exerciseNameEs };
}

export type UpdateTargetSetsActionState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "updated"; exercisePrescriptionId: string; targetSets: number };

const MAX_TARGET_SETS = 6;

export async function updateTargetSetsAction(
  _previousState: UpdateTargetSetsActionState,
  formData: FormData,
): Promise<UpdateTargetSetsActionState> {
  const user = await requireCurrentUser();
  const profile = await getAthleteProfileForUser(user.id);

  if (!profile) {
    return { status: "error", message: "No se encontró tu perfil." };
  }

  const exercisePrescriptionId = formData.get("exercisePrescriptionId");
  const workoutSessionId = formData.get("workoutSessionId");
  const targetSets = Number(formData.get("targetSets"));

  if (
    typeof exercisePrescriptionId !== "string" ||
    typeof workoutSessionId !== "string" ||
    !Number.isInteger(targetSets) ||
    targetSets < 1 ||
    targetSets > MAX_TARGET_SETS
  ) {
    return { status: "error", message: "No se pudo actualizar el objetivo del ejercicio." };
  }

  const updated = await updateExercisePrescriptionTargetSets(profile.id, exercisePrescriptionId, targetSets);
  if (!updated) {
    return { status: "error", message: "No se pudo actualizar el objetivo del ejercicio." };
  }

  revalidatePath(`/entrenar/${workoutSessionId}`);

  return { status: "updated", exercisePrescriptionId, targetSets };
}

export async function completeSessionAction(formData: FormData) {
  const user = await requireCurrentUser();
  const profile = await getAthleteProfileForUser(user.id);

  if (!profile) {
    redirect("/perfil");
  }

  const workoutSessionId = formData.get("workoutSessionId");
  if (typeof workoutSessionId !== "string" || !workoutSessionId) {
    redirect("/entrenar");
  }

  const session = await getWorkoutSessionForProfile(workoutSessionId, profile.id);
  if (session) {
    let input;
    try {
      input = parseSessionCompletionFormData(formData);
    } catch {
      input = { notes: undefined, sessionRpe: undefined };
    }
    await completeWorkoutSession(session.id, {
      notes: input.notes ?? null,
      sessionRpe: input.sessionRpe ?? null,
    });
  }

  revalidatePath("/entrenar");
  revalidatePath("/progreso");
  redirect("/entrenar?completed=1");
}
