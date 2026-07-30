import { describe, expect, it } from "vitest";

import { buildProgressionSuggestion, isRepsFirstIncrease, suggestNextWeightKg } from "./progression-view";
import type { SetLog } from "./workout-repository";

function buildSet(overrides: Partial<SetLog> = {}): SetLog {
  return {
    id: "set-1",
    exerciseLogId: "log-1",
    setNumber: 1,
    side: "bilateral",
    actualWeightKg: "80.00",
    actualReps: 12,
    rir: 2,
    painScore: 0,
    notes: null,
    completedAt: new Date("2026-07-20T12:00:00Z"),
    ...overrides,
  };
}

describe("suggestNextWeightKg", () => {
  it("adds 5% and rounds to the nearest 0.5 on increase", () => {
    expect(suggestNextWeightKg("80.00", "increase")).toBe("84.00");
  });

  it("subtracts 5% and rounds to the nearest 0.5 on reduce_or_modify", () => {
    expect(suggestNextWeightKg("80.00", "reduce_or_modify")).toBe("76.00");
  });

  it("keeps the same weight on hold", () => {
    expect(suggestNextWeightKg("80.00", "hold")).toBe("80.00");
  });

  it("rounds an awkward increase to the nearest half kilo", () => {
    // 27.5 * 1.05 = 28.875 -> rounds to 29.0
    expect(suggestNextWeightKg("27.50", "increase")).toBe("29.00");
  });

  it("uses the flat 5%/-5% fallback when no category is given, matching pre-category behavior", () => {
    expect(suggestNextWeightKg("80.00", "increase", null)).toBe("84.00");
    expect(suggestNextWeightKg("80.00", "reduce_or_modify", null)).toBe("76.00");
  });

  it("uses a smaller +2.5% increase for upper_compound", () => {
    expect(suggestNextWeightKg("80.00", "increase", "upper_compound")).toBe("82.00");
  });

  it("uses a +5% increase for machine_or_lower_body", () => {
    expect(suggestNextWeightKg("80.00", "increase", "machine_or_lower_body")).toBe("84.00");
  });

  it("adds a fixed 2kg step for dumbbell instead of a percentage", () => {
    expect(suggestNextWeightKg("20.00", "increase", "dumbbell")).toBe("22.00");
  });

  it("leaves isolation weight unchanged on increase (the app suggests adding a rep instead)", () => {
    expect(suggestNextWeightKg("30.00", "increase", "isolation")).toBe("30.00");
  });

  it("still reduces by 5% regardless of category", () => {
    expect(suggestNextWeightKg("80.00", "reduce_or_modify", "isolation")).toBe("76.00");
    expect(suggestNextWeightKg("80.00", "reduce_or_modify", "dumbbell")).toBe("76.00");
  });
});

describe("isRepsFirstIncrease", () => {
  it("is true only for an increase on an isolation exercise", () => {
    expect(isRepsFirstIncrease("increase", "isolation")).toBe(true);
    expect(isRepsFirstIncrease("increase", "machine_or_lower_body")).toBe(false);
    expect(isRepsFirstIncrease("hold", "isolation")).toBe(false);
    expect(isRepsFirstIncrease("increase", null)).toBe(false);
    expect(isRepsFirstIncrease("increase", undefined)).toBe(false);
  });
});

describe("buildProgressionSuggestion", () => {
  it("derives allPlannedSetsCompleted from sets.length >= targetSets and delegates to suggestProgression", () => {
    const sets = [
      buildSet({ setNumber: 1, actualReps: 12, rir: 2, painScore: 0 }),
      buildSet({ id: "set-2", setNumber: 2, actualReps: 12, rir: 2, painScore: 0 }),
    ];

    const suggestion = buildProgressionSuggestion(sets, 12, 2);

    expect(suggestion.action).toBe("increase");
    expect(suggestion.riskFlag).toBe("none");
  });

  it("holds instead of increasing when fewer sets were logged than the target", () => {
    const sets = [buildSet({ setNumber: 1, actualReps: 12, rir: 2, painScore: 0 })];

    const suggestion = buildProgressionSuggestion(sets, 12, 2);

    expect(suggestion.action).toBe("hold");
  });

  it("flags reduce_or_modify when pain is high", () => {
    const sets = [buildSet({ painScore: 5 })];

    const suggestion = buildProgressionSuggestion(sets, 12, 1);

    expect(suggestion.action).toBe("reduce_or_modify");
    expect(suggestion.riskFlag).toBe("pain");
  });
});
