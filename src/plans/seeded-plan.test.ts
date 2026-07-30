import { describe, expect, it } from "vitest";

import { generatedWorkoutPlanSchema } from "./generated-plan-schema";
import { createSeededHypertrophyPlan } from "./seeded-plan";

describe("createSeededHypertrophyPlan", () => {
  it("returns a valid 5-day routine that repeats indefinitely", () => {
    const plan = createSeededHypertrophyPlan();

    expect(() => generatedWorkoutPlanSchema.parse(plan)).not.toThrow();
    expect(plan.daysPerWeek).toBe(5);
    expect(plan.sessions).toHaveLength(5);
    expect(plan.sessions.map((session) => session.dayIndex)).toEqual([1, 2, 3, 4, 5]);
  });
});
