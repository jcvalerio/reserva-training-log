import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { getPlanPreviewSummary } from "@/plans/plan-preview";
import type { PlanSessionStats, WorkoutPlan } from "@/plans/plan-repository";
import { createSeededHypertrophyPlan } from "@/plans/seeded-plan";

import { PlanHistoryDetailContent } from "./plan-history-detail-content";

function buildPlan(overrides: Partial<WorkoutPlan> = {}): WorkoutPlan {
  return {
    id: "plan-1",
    athleteProfileId: "profile-1",
    nameEs: "Plan base 5 días — hipertrofia",
    nameEn: null,
    goal: "hypertrophy",
    durationWeeks: 1,
    daysPerWeek: 5,
    sessionDurationMinutes: 60,
    locale: "es",
    safetySummaryEs: "Registra dolor en cada serie.",
    status: "archived",
    activatedAt: new Date("2026-07-01T12:00:00Z"),
    sharePlanGroupId: null,
    createdAt: new Date("2026-07-01T12:00:00Z"),
    updatedAt: new Date("2026-07-01T12:00:00Z"),
    ...overrides,
  };
}

function buildStats(overrides: Partial<PlanSessionStats> = {}): PlanSessionStats {
  return {
    sessionCount: 4,
    firstSessionAt: new Date("2026-07-02T12:00:00Z"),
    lastSessionAt: new Date("2026-07-20T12:00:00Z"),
    ...overrides,
  };
}

const preview = getPlanPreviewSummary(createSeededHypertrophyPlan());

describe("PlanHistoryDetailContent", () => {
  it("shows the plan name, status pill, and session/day stats", () => {
    render(<PlanHistoryDetailContent plan={buildPlan()} stats={buildStats()} preview={preview} previewError={false} />);

    expect(screen.getByRole("heading", { name: "Plan base 5 días — hipertrofia" })).toBeVisible();
    expect(screen.getByText("Archivado")).toBeVisible();
    // "4"/"5" aren't asserted directly — the day-pager's "Día 4"/"Día 5" tabs
    // make bare digit text ambiguous. The labels confirm the tiles render.
    expect(screen.getByText("Sesiones")).toBeVisible();
    expect(screen.getByText("Días/sem")).toBeVisible();
    expect(screen.getByText(/Primera sesión 02-jul · Última 20-jul/)).toBeVisible();
  });

  it("shows a no-sessions message instead of dates when nothing has been logged yet", () => {
    render(
      <PlanHistoryDetailContent
        plan={buildPlan({ status: "draft", activatedAt: null })}
        stats={buildStats({ sessionCount: 0, firstSessionAt: null, lastSessionAt: null })}
        preview={preview}
        previewError={false}
      />,
    );

    expect(screen.getByText("Borrador")).toBeVisible();
    expect(screen.getByText("Sin sesiones registradas todavía.")).toBeVisible();
  });

  it("renders the day pager when a preview is available", () => {
    render(<PlanHistoryDetailContent plan={buildPlan()} stats={buildStats()} preview={preview} previewError={false} />);

    expect(screen.getByRole("tablist", { name: "Días del plan" })).toBeVisible();
  });

  it("shows an error message when the plan failed to preview instead of crashing", () => {
    render(<PlanHistoryDetailContent plan={buildPlan()} stats={buildStats()} preview={null} previewError={true} />);

    expect(screen.getByText(/No se pudo mostrar el detalle día por día/)).toBeVisible();
  });

  it("shows a no-days message for a plan with no sessions defined at all", () => {
    render(<PlanHistoryDetailContent plan={buildPlan()} stats={buildStats()} preview={null} previewError={false} />);

    expect(screen.getByText("Este plan no tiene días definidos.")).toBeVisible();
  });

  it("links back to /plan/historial", () => {
    render(<PlanHistoryDetailContent plan={buildPlan()} stats={buildStats()} preview={preview} previewError={false} />);

    expect(screen.getByRole("link", { name: "← Volver a Tus planes" })).toHaveAttribute("href", "/plan/historial");
  });

  it("routes a draft to the builder, the only screen that can activate or discard it", () => {
    render(
      <PlanHistoryDetailContent
        plan={buildPlan({ status: "draft", activatedAt: null })}
        stats={buildStats({ sessionCount: 0, firstSessionAt: null, lastSessionAt: null })}
        preview={preview}
        previewError={false}
      />,
    );

    // "Tus planes" links a draft here, so this was the screen you reached
    // hunting for a way to discard one — and it offered no action at all,
    // stranding the draft that blocks editing the active plan.
    expect(screen.getByText("Este plan es un borrador")).toBeVisible();
    expect(screen.getByRole("link", { name: "Ir al editor" })).toHaveAttribute("href", "/plan/builder");
  });

  it("does not offer the builder route for plans that are not drafts", () => {
    render(<PlanHistoryDetailContent plan={buildPlan()} stats={buildStats()} preview={preview} previewError={false} />);

    expect(screen.queryByText("Este plan es un borrador")).toBeNull();
    expect(screen.queryByRole("link", { name: "Ir al editor" })).toBeNull();
  });
});
