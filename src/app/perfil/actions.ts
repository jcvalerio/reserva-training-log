"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/lib/auth-server";
import { saveAthleteProfileForUser } from "@/profile/profile-repository";
import { parseAthleteProfileFormData } from "@/profile/profile-schema";

export async function saveAthleteProfileAction(formData: FormData) {
  const user = await requireCurrentUser();
  const input = parseAthleteProfileFormData(formData);

  await saveAthleteProfileForUser(user.id, input);

  revalidatePath("/perfil");
  redirect("/perfil");
}
