"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/lib/auth-server";
import { getAthleteProfileForUser } from "@/profile/profile-repository";
import { parseGymInventoryFormData, type GymInventoryFormInput } from "@/training/gym-schema";
import { saveGymInventory } from "@/training/gym-repository";

export async function saveGymInventoryAction(formData: FormData) {
  const user = await requireCurrentUser();
  const profile = await getAthleteProfileForUser(user.id);

  if (!profile) {
    redirect("/perfil");
  }

  let input: GymInventoryFormInput;

  try {
    input = parseGymInventoryFormData(formData);
  } catch {
    redirect("/perfil/gimnasio?error=validation");
  }

  await saveGymInventory(profile.id, input);

  // The inventory changes what /entrenar can suggest, so both caches drop.
  revalidatePath("/perfil/gimnasio");
  revalidatePath("/entrenar");
  redirect("/perfil/gimnasio?saved=1");
}
