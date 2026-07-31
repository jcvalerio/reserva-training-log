import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { planTemplates } from "@/plans/plan-templates";

import { TemplatesPageContent } from "./templates-page-content";

describe("TemplatesPageContent", () => {
  it("lists every template as a link to its own preview page", () => {
    render(<TemplatesPageContent templates={planTemplates} />);

    expect(screen.getByRole("heading", { name: "Elige una plantilla" })).toBeVisible();

    for (const template of planTemplates) {
      const link = screen.getByRole("link", { name: new RegExp(template.nameEs) });
      expect(link).toHaveAttribute("href", `/plan/templates/${template.id}`);
      expect(screen.getByText(template.objectiveEs)).toBeVisible();
    }
  });
});
