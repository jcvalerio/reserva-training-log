import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/lib/auth-server";
import { getPlanPreviewSummary } from "@/plans/plan-preview";
import { getActivePlanForProfile } from "@/plans/plan-repository";
import { getPlanTemplateById } from "@/plans/plan-templates";
import { classifySessionMuscleGroups } from "@/plans/session-muscle-groups";
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

  const plan = template.build();
  const summary = getPlanPreviewSummary(plan);
  // Templates are static, in-memory plan definitions built before any
  // athlete profile (and its own seeded exercise rows) exists — exerciseId
  // is never populated, so classification always falls through to the
  // free-text name (no catalog-link query needed here, unlike an active or
  // draft plan's real ExercisePrescription rows).
  const muscleGroupsByDayIndex = new Map(
    plan.sessions.map((session) => [
      session.dayIndex,
      classifySessionMuscleGroups(
        session.exercises.map((exercise) => ({
          exerciseId: exercise.exerciseId ?? null,
          exerciseNameEs: exercise.exerciseNameEs,
        })),
        new Map(),
      ),
    ]),
  );

  return (
    <TemplatePreviewContent
      templateId={template.id}
      objectiveEs={template.objectiveEs}
      summary={summary}
      muscleGroupsByDayIndex={muscleGroupsByDayIndex}
      activatePlanAction={activatePlanAction}
    />
  );
}
