"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/lib/auth-server";
import { createBodyMeasurementForProfile } from "@/measurements/measurement-repository";
import { parseBodyMeasurementFormData } from "@/measurements/measurement-schema";
import { getAthleteProfileForUser } from "@/profile/profile-repository";

export async function saveBodyMeasurementAction(formData: FormData) {
  const user = await requireCurrentUser();
  const profile = await getAthleteProfileForUser(user.id);

  if (!profile) {
    redirect("/perfil");
  }

  const input = parseBodyMeasurementFormData(formData);
  await createBodyMeasurementForProfile(profile.id, input);

  revalidatePath("/mediciones");
  redirect("/mediciones");
}
