import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { getPlanPreviewSummary } from "@/plans/plan-preview";
import { createSeededHypertrophyPlan } from "@/plans/seeded-plan";

import { PlanDetailContent } from "./plan-detail-content";

describe("PlanDetailContent", () => {
  it("shows the first day's exercises fully expanded with no tap-to-expand step", () => {
    const summary = getPlanPreviewSummary(createSeededHypertrophyPlan());
    const firstSession = summary.sessions[0]!;
    const firstExercise = firstSession.exercises[0]!;

    render(<PlanDetailContent summary={summary} />);

    expect(screen.getByRole("heading", { name: summary.nameEs })).toBeVisible();
    expect(screen.getByRole("link", { name: /Volver a Tu plan/ })).toHaveAttribute("href", "/plan");
    expect(screen.getByRole("heading", { name: firstSession.nameEs })).toBeVisible();
    expect(screen.getByText(firstExercise.nameEs)).toBeVisible();
    expect(screen.getAllByText(firstExercise.notesEs)[0]).toBeVisible();
    expect(screen.queryByText("Ver ejercicios y objetivos")).toBeNull();
  });

  it("switches to another day when its pill is tapped, without navigating away", () => {
    const summary = getPlanPreviewSummary(createSeededHypertrophyPlan());
    const secondSession = summary.sessions[1]!;

    render(<PlanDetailContent summary={summary} />);

    fireEvent.click(screen.getByRole("tab", { name: `Día ${secondSession.dayIndex}` }));

    expect(screen.getByRole("heading", { name: secondSession.nameEs })).toBeVisible();
    expect(screen.getByText(secondSession.exercises[0]!.nameEs)).toBeVisible();
  });

  it("steps through days with Anterior/Siguiente día, disabling at the edges", () => {
    const summary = getPlanPreviewSummary(createSeededHypertrophyPlan());

    render(<PlanDetailContent summary={summary} />);

    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Siguiente día" }));

    expect(screen.getByRole("heading", { name: summary.sessions[1]!.nameEs })).toBeVisible();
    expect(screen.getByRole("button", { name: "Anterior" })).not.toBeDisabled();
  });
});
