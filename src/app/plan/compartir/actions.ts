"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/lib/auth-server";
import { getActivePlanForProfile } from "@/plans/plan-repository";
import { createPlanShare, redeemPlanShare, PlanShareValidationError } from "@/plans/plan-share-repository";
import { parsePlanShareFormData } from "@/plans/plan-share-schema";
import { getAthleteProfileForUser } from "@/profile/profile-repository";

export async function createPlanShareAction(formData: FormData) {
  const user = await requireCurrentUser();
  const profile = await getAthleteProfileForUser(user.id);

  if (!profile) {
    redirect("/perfil");
  }

  const active = await getActivePlanForProfile(profile.id);
  if (!active) {
    redirect("/plan");
  }

  let input;
  try {
    input = parsePlanShareFormData(formData);
  } catch {
    redirect("/plan/compartir?error=validation");
  }

  let code: string;
  try {
    const invite = await createPlanShare(profile.id, active.plan.id, input.recipientEmail);
    code = invite.code;
  } catch (error) {
    if (error instanceof PlanShareValidationError) {
      redirect(`/plan/compartir?error=${error.code}`);
    }
    redirect("/plan/compartir?error=unknown");
  }

  revalidatePath("/plan/compartir");
  redirect(`/plan/compartir?created=${code}`);
}

export async function redeemPlanShareAction(formData: FormData) {
  const user = await requireCurrentUser();
  const profile = await getAthleteProfileForUser(user.id);

  if (!profile) {
    redirect("/perfil");
  }

  const code = formData.get("code");
  if (typeof code !== "string" || !code) {
    redirect("/plan");
  }

  const result = await redeemPlanShare(code, user.email, profile.id);

  if (result.status !== "redeemed") {
    redirect(`/plan/compartir/${code}?error=${result.status}`);
  }

  revalidatePath("/");
  revalidatePath("/plan");
  revalidatePath("/plan/builder");
  redirect("/plan/builder");
}
