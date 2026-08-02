"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/lib/auth-server";
import { getAthleteProfileForUser } from "@/profile/profile-repository";
import { resetAthleteProfileData } from "@/profile/profile-reset";

import { RESET_CONFIRM_TEXT } from "./reset-confirm-text";

export async function resetProfileDataAction(formData: FormData) {
  const user = await requireCurrentUser();
  const profile = await getAthleteProfileForUser(user.id);

  if (!profile) {
    redirect("/perfil");
  }

  // Re-checked server-side, not just gated by the disabled submit button —
  // the client-side match is a UX nudge, not the actual safety boundary.
  const confirmText = formData.get("confirmText");
  if (confirmText !== RESET_CONFIRM_TEXT) {
    redirect("/perfil/reiniciar?error=confirm");
  }

  const keepMeasurements = formData.get("keepMeasurements") === "keep";
  await resetAthleteProfileData(profile.id, { keepMeasurements });

  revalidatePath("/");
  revalidatePath("/plan");
  revalidatePath("/entrenar");
  revalidatePath("/progreso");
  revalidatePath("/perfil");
  redirect(`/perfil?reset=1&keptMeasurements=${keepMeasurements ? "1" : "0"}`);
}
