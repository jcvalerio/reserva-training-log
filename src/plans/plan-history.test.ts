import { describe, expect, it } from "vitest";

import type { PlanHistoryRow } from "./plan-history";
import { sortPlanHistoryRows } from "./plan-history";
import type { WorkoutPlan } from "./plan-repository";

function buildPlan(overrides: Partial<WorkoutPlan> = {}): WorkoutPlan {
  return {
    id: "plan-1",
    athleteProfileId: "profile-1",
    nameEs: "Plan",
    nameEn: null,
    goal: "hypertrophy",
    durationWeeks: 1,
    daysPerWeek: 5,
    sessionDurationMinutes: 60,
    locale: "es",
    safetySummaryEs: "Registra dolor.",
    status: "archived",
    activatedAt: null,
    sharePlanGroupId: null,
    createdAt: new Date("2026-07-01T12:00:00Z"),
    updatedAt: new Date("2026-07-01T12:00:00Z"),
    ...overrides,
  };
}

function buildRow(overrides: Partial<WorkoutPlan> = {}, sessionCount = 0): PlanHistoryRow {
  return { plan: buildPlan(overrides), sessionCount };
}

describe("sortPlanHistoryRows", () => {
  it("puts the active plan first regardless of age", () => {
    const rows = [
      buildRow({ id: "old-archived", status: "archived", createdAt: new Date("2026-01-01T12:00:00Z") }),
      buildRow({ id: "active", status: "active", createdAt: new Date("2026-01-01T12:00:00Z") }),
    ];

    const sorted = sortPlanHistoryRows(rows);

    expect(sorted[0]!.plan.id).toBe("active");
  });

  it("puts the draft second, after active but before archived/completed", () => {
    const rows = [
      buildRow({ id: "archived", status: "archived" }),
      buildRow({ id: "completed", status: "completed" }),
      buildRow({ id: "draft", status: "draft" }),
      buildRow({ id: "active", status: "active" }),
    ];

    expect(sortPlanHistoryRows(rows).map((row) => row.plan.id)).toEqual(["active", "draft", "completed", "archived"]);
  });

  it("orders same-status plans newest-first", () => {
    const rows = [
      buildRow({ id: "older", status: "archived", createdAt: new Date("2026-06-01T12:00:00Z") }),
      buildRow({ id: "newer", status: "archived", createdAt: new Date("2026-07-01T12:00:00Z") }),
    ];

    expect(sortPlanHistoryRows(rows).map((row) => row.plan.id)).toEqual(["newer", "older"]);
  });

  it("does not mutate the input array", () => {
    const rows = [buildRow({ id: "a" }), buildRow({ id: "b" })];
    const original = [...rows];

    sortPlanHistoryRows(rows);

    expect(rows).toEqual(original);
  });
});
