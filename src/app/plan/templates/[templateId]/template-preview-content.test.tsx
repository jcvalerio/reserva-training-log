import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { getPlanPreviewSummary } from "@/plans/plan-preview";
import { getPlanTemplateById } from "@/plans/plan-templates";

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
});
