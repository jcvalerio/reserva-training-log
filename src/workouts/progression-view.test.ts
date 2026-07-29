import { describe, expect, it } from "vitest";

import { buildProgressionSuggestion, suggestNextWeightKg } from "./progression-view";
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
