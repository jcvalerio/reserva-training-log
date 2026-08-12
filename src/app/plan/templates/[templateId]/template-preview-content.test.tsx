import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { getPlanPreviewSummary } from "@/plans/plan-preview";
import { getPlanTemplateById } from "@/plans/plan-templates";
import { classifySessionMuscleGroups } from "@/plans/session-muscle-groups";

import { TemplatePreviewContent } from "./template-preview-content";

const noopActivatePlanAction = vi.fn(async () => {});

describe("TemplatePreviewContent", () => {
  it("shows the full read-only preview and an activate form carrying the template id", () => {
    const template = getPlanTemplateById("fat_loss")!;
    const summary = getPlanPreviewSummary(template.build());

    render(
      <TemplatePreviewContent
        templateId={template.id}
        objectiveEs={template.objectiveEs}
        summary={summary}
        activatePlanAction={noopActivatePlanAction}
      />,
    );

    expect(screen.getByRole("heading", { name: summary.nameEs })).toBeVisible();
    expect(screen.getByText(template.objectiveEs)).toBeVisible();

    for (const boundary of ["Solo lectura", "Aún no activado"]) {
      expect(screen.getByText(boundary)).toBeVisible();
    }

    expect(screen.getByText(summary.safetySummaryEs)).toBeVisible();
    expect(screen.getByRole("link", { name: /Volver a plantillas/ })).toHaveAttribute("href", "/plan/templates");

    const activateButton = screen.getByRole("button", { name: "Activar este plan" });
    expect(activateButton).toBeVisible();

    const form = activateButton.closest("form");
    const hiddenInput = form?.querySelector('input[name="templateId"]');
    expect(hiddenInput).toHaveValue(template.id);
  });

  it("shows the first day's body-map thumbnail when muscleGroupsByDayIndex is passed", () => {
    const template = getPlanTemplateById("fat_loss")!;
    const plan = template.build();
    const summary = getPlanPreviewSummary(plan);
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

    render(
      <TemplatePreviewContent
        templateId={template.id}
        objectiveEs={template.objectiveEs}
        summary={summary}
        muscleGroupsByDayIndex={muscleGroupsByDayIndex}
        activatePlanAction={noopActivatePlanAction}
      />,
    );

    expect(screen.getByRole("img")).toBeVisible();
  });

  it("shows no body-map thumbnail when muscleGroupsByDayIndex is not passed", () => {
    const template = getPlanTemplateById("fat_loss")!;
    const summary = getPlanPreviewSummary(template.build());

    render(
      <TemplatePreviewContent
        templateId={template.id}
        objectiveEs={template.objectiveEs}
        summary={summary}
        activatePlanAction={noopActivatePlanAction}
      />,
    );

    expect(screen.queryByRole("img")).toBeNull();
  });
});
