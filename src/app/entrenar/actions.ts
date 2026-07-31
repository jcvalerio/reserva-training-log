"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/lib/auth-server";
import { getActivePlanForProfile } from "@/plans/plan-repository";
import { getAthleteProfileForUser } from "@/profile/profile-repository";
import { parseSetLogFormData } from "@/workouts/set-log-schema";
import {
  completeWorkoutSession,
  getWorkoutSessionForProfile,
  saveSetForSession,
  startOrResumeWorkoutSession,
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
    await completeWorkoutSession(session.id);
  }

  revalidatePath("/entrenar");
  redirect("/entrenar?completed=1");
}
