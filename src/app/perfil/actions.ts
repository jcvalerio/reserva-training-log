"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/lib/auth-server";
import { saveAthleteProfileForUser } from "@/profile/profile-repository";
import { parseAthleteProfileFormData, type AthleteProfileInput } from "@/profile/profile-schema";

export async function saveAthleteProfileAction(formData: FormData) {
  const user = await requireCurrentUser();
  let input: AthleteProfileInput;

  try {
    input = parseAthleteProfileFormData(formData);
  } catch {
    redirect("/perfil?error=validation");
  }

  await saveAthleteProfileForUser(user.id, input);

  revalidatePath("/");
  revalidatePath("/perfil");
  redirect("/perfil?saved=1");
}
