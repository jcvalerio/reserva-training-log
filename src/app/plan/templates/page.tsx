import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/lib/auth-server";
import { getActivePlanForProfile } from "@/plans/plan-repository";
import { planTemplates } from "@/plans/plan-templates";
import { getAthleteProfileForUser } from "@/profile/profile-repository";

import { TemplatesPageContent } from "./templates-page-content";

export default async function TemplatesPage() {
  const user = await requireCurrentUser();
  const profile = await getAthleteProfileForUser(user.id);

  if (!profile) {
    redirect("/perfil");
  }

  const activePlan = await getActivePlanForProfile(profile.id);
  if (activePlan) {
    redirect("/plan");
  }

  return <TemplatesPageContent templates={planTemplates} />;
}
