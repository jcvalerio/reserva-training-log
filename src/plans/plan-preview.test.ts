import { describe, expect, it } from "vitest";

import { getPlanPreviewSummary } from "./plan-preview";
import { createSeededHypertrophyPlan } from "./seeded-plan";

describe("getPlanPreviewSummary", () => {
  it("summarizes the seeded plan without mutating or activating it", () => {
    const plan = createSeededHypertrophyPlan();

    const summary = getPlanPreviewSummary(plan);

    expect(summary).toMatchObject({
      nameEs: "Plan base 5 días — hipertrofia",
      durationWeeks: 4,
      daysPerWeek: 5,
      sessionDurationMinutes: 60,
    });
    expect(summary.firstWeekSessions).toHaveLength(5);
    expect(summary.firstWeekExerciseCount).toBe(20);
    expect(summary.firstWeekUnilateralExerciseCount).toBeGreaterThan(0);
    expect(summary.firstWeekPainSensitiveExerciseCount).toBeGreaterThan(0);
  });
});
