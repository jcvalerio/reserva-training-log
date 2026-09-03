"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/lib/auth-server";
import { createFunctionalTestForProfile } from "@/measurements/functional-test-repository";
import {
  parseFunctionalTestFormData,
  type FunctionalTestInput,
} from "@/measurements/functional-test-schema";
import { createLimbSymmetryTestForProfile } from "@/measurements/limb-symmetry-repository";
import {
  parseLimbSymmetryTestFormData,
  type LimbSymmetryTestInput,
} from "@/measurements/limb-symmetry-schema";
import { createBodyMeasurementForProfile } from "@/measurements/measurement-repository";
import { parseBodyMeasurementFormData, type BodyMeasurementInput } from "@/measurements/measurement-schema";
import { getAthleteProfileForUser } from "@/profile/profile-repository";

export async function saveBodyMeasurementAction(formData: FormData) {
  const user = await requireCurrentUser();
  const profile = await getAthleteProfileForUser(user.id);

  if (!profile) {
    redirect("/perfil");
  }

  let input: BodyMeasurementInput;

  try {
    input = parseBodyMeasurementFormData(formData);
  } catch {
    redirect("/mediciones?error=validation");
  }

  await createBodyMeasurementForProfile(profile.id, input);

  revalidatePath("/");
  revalidatePath("/mediciones");
  redirect("/mediciones?saved=1");
}

/**
 * Records an uncapped single-side capacity test.
 *
 * Deliberately writes to limb_symmetry_test rather than logging two sets: the
 * strong side runs uncapped here, which is the opposite of how the plan tells
 * the athlete to train, and letting a maximal-rep pair into setLog would
 * inflate weekly volume, progression suggestions and personal records.
 */
export async function saveLimbSymmetryTestAction(formData: FormData) {
  const user = await requireCurrentUser();
  const profile = await getAthleteProfileForUser(user.id);

  if (!profile) {
    redirect("/perfil");
  }

  let input: LimbSymmetryTestInput;

  try {
    input = parseLimbSymmetryTestFormData(formData);
  } catch {
    redirect("/mediciones?error=simetria");
  }

  await createLimbSymmetryTestForProfile(profile.id, input);

  revalidatePath("/mediciones");
  revalidatePath("/progreso");
  redirect("/mediciones?saved=simetria");
}

/**
 * Records a functional-capacity test — the mobility half of the stated goal,
 * which had no measure at all until now.
 */
export async function saveFunctionalTestAction(formData: FormData) {
  const user = await requireCurrentUser();
  const profile = await getAthleteProfileForUser(user.id);

  if (!profile) {
    redirect("/perfil");
  }

  let input: FunctionalTestInput;

  try {
    input = parseFunctionalTestFormData(formData);
  } catch {
    redirect("/mediciones?error=funcional");
  }

  await createFunctionalTestForProfile(profile.id, input);

  revalidatePath("/mediciones");
  revalidatePath("/progreso");
  redirect("/mediciones?saved=funcional");
}
