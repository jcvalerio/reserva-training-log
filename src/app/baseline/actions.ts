"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { saveBaselineLiftsForProfile } from "@/baseline/baseline-repository";
import { parseBaselineFormData, type BaselineLiftInput } from "@/baseline/baseline-schema";
import { requireCurrentUser } from "@/lib/auth-server";
import { getAthleteProfileForUser } from "@/profile/profile-repository";

export async function saveBaselineAction(formData: FormData) {
  const user = await requireCurrentUser();
  const profile = await getAthleteProfileForUser(user.id);

  if (!profile) {
    redirect("/perfil");
  }

  let inputs: BaselineLiftInput[];

  try {
    inputs = parseBaselineFormData(formData);
  } catch {
    redirect("/baseline?error=validation");
  }

  await saveBaselineLiftsForProfile(profile.id, inputs);

  revalidatePath("/");
  revalidatePath("/baseline");
  redirect("/baseline?saved=1");
}
