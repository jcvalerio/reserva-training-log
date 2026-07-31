import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/lib/auth-server";
import { getPlanPreviewSummary } from "@/plans/plan-preview";
import { getActivePlanForProfile } from "@/plans/plan-repository";
import { getPlanTemplateById } from "@/plans/plan-templates";
import { getAthleteProfileForUser } from "@/profile/profile-repository";

import { activatePlanAction } from "../../actions";
import { TemplatePreviewContent } from "./template-preview-content";

type TemplatePreviewPageProps = {
  params: Promise<{ templateId: string }>;
};

export default async function TemplatePreviewPage({ params }: TemplatePreviewPageProps) {
  const { templateId } = await params;

  const user = await requireCurrentUser();
  const profile = await getAthleteProfileForUser(user.id);

  if (!profile) {
    redirect("/perfil");
  }

  const template = getPlanTemplateById(templateId);
  if (!template) {
    redirect("/plan/templates");
  }

  const activePlan = await getActivePlanForProfile(profile.id);
  if (activePlan) {
    redirect("/plan");
  }

  const summary = getPlanPreviewSummary(template.build());

  return (
    <TemplatePreviewContent
      templateId={template.id}
      objectiveEs={template.objectiveEs}
      summary={summary}
      activatePlanAction={activatePlanAction}
    />
  );
}
