import { describe, expect, it } from "vitest";

import { generatedWorkoutPlanSchema } from "./generated-plan-schema";
import { createSeededHypertrophyPlan } from "./seeded-plan";

describe("createSeededHypertrophyPlan", () => {
  it("returns a valid 4-week, 5-day fallback plan", () => {
    const plan = createSeededHypertrophyPlan();

    expect(() => generatedWorkoutPlanSchema.parse(plan)).not.toThrow();
    expect(plan.durationWeeks).toBe(4);
    expect(plan.daysPerWeek).toBe(5);
    expect(plan.weeks).toHaveLength(4);
    expect(plan.weeks[0]?.sessions).toHaveLength(5);
  });
});
