import { describe, expect, it } from "vitest";

import { buildProgressionSuggestion, isRepsFirstIncrease, splitPlannedAndBonusSets, suggestNextWeightKg } from "./progression-view";
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
    actualDurationSeconds: null,
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

  it("uses the flat 5%/-5% fallback when unclassified, matching pre-category behavior", () => {
    expect(suggestNextWeightKg("80.00", "increase", null, null)).toBe("84.00");
    expect(suggestNextWeightKg("80.00", "reduce_or_modify", null, null)).toBe("76.00");
  });

  it("uses a smaller +2.5% increase for barbell compound movements", () => {
    expect(suggestNextWeightKg("80.00", "increase", "barbell", true)).toBe("82.00");
  });

  it("uses a +5% increase for machine compound movements", () => {
    expect(suggestNextWeightKg("80.00", "increase", "machine", true)).toBe("84.00");
  });

  it("adds a fixed 2kg step for dumbbell instead of a percentage, regardless of isCompound", () => {
    expect(suggestNextWeightKg("20.00", "increase", "dumbbell", true)).toBe("22.00");
    expect(suggestNextWeightKg("20.00", "increase", "dumbbell", false)).toBe("22.00");
  });

  it("leaves weight unchanged on increase for bodyweight exercises (the app suggests adding a rep instead)", () => {
    expect(suggestNextWeightKg("30.00", "increase", "bodyweight", null)).toBe("30.00");
  });

  it("leaves weight unchanged on increase for any isolation movement, regardless of mechanism", () => {
    expect(suggestNextWeightKg("30.00", "increase", "machine", false)).toBe("30.00");
    expect(suggestNextWeightKg("30.00", "increase", "barbell", false)).toBe("30.00");
  });

  it("falls back to the flat ratio when loadMechanism is set but isCompound is unclassified", () => {
    expect(suggestNextWeightKg("80.00", "increase", "machine", null)).toBe("84.00");
  });

  it("still reduces by 5% regardless of category", () => {
    expect(suggestNextWeightKg("80.00", "reduce_or_modify", "machine", false)).toBe("76.00");
    expect(suggestNextWeightKg("80.00", "reduce_or_modify", "dumbbell", true)).toBe("76.00");
  });
});

describe("isRepsFirstIncrease", () => {
  it("is true for an increase on a bodyweight exercise or any isolation movement", () => {
    expect(isRepsFirstIncrease("increase", "bodyweight", null)).toBe(true);
    expect(isRepsFirstIncrease("increase", "machine", false)).toBe(true);
    expect(isRepsFirstIncrease("increase", "barbell", false)).toBe(true);
    expect(isRepsFirstIncrease("increase", "machine", true)).toBe(false);
    expect(isRepsFirstIncrease("hold", "machine", false)).toBe(false);
    expect(isRepsFirstIncrease("increase", null, null)).toBe(false);
    expect(isRepsFirstIncrease("increase", undefined, undefined)).toBe(false);
  });
});

describe("buildProgressionSuggestion", () => {
  it("derives allPlannedSetsCompleted from sets.length >= targetSets and delegates to suggestProgression", () => {
    const sets = [
      buildSet({ setNumber: 1, actualReps: 12, rir: 2, painScore: 0 }),
      buildSet({ id: "set-2", setNumber: 2, actualReps: 12, rir: 2, painScore: 0 }),
    ];

    const suggestion = buildProgressionSuggestion(sets, 12, 2, false);

    expect(suggestion.action).toBe("increase");
    expect(suggestion.riskFlag).toBe("none");
  });

  it("holds instead of increasing when fewer sets were logged than the target", () => {
    const sets = [buildSet({ setNumber: 1, actualReps: 12, rir: 2, painScore: 0 })];

    const suggestion = buildProgressionSuggestion(sets, 12, 2, false);

    expect(suggestion.action).toBe("hold");
  });

  it("flags reduce_or_modify when pain is high", () => {
    const sets = [buildSet({ painScore: 5 })];

    const suggestion = buildProgressionSuggestion(sets, 12, 1, false);

    expect(suggestion.action).toBe("reduce_or_modify");
    expect(suggestion.riskFlag).toBe("pain");
  });

  it("for a unilateral exercise, requires targetSets per side before allowing an increase", () => {
    const lopsided = [
      buildSet({ id: "l1", side: "left", setNumber: 1, actualReps: 12, rir: 2, painScore: 0 }),
      buildSet({ id: "l2", side: "left", setNumber: 2, actualReps: 12, rir: 2, painScore: 0 }),
    ];

    // Both sets are on the left side only — right side has none logged, so
    // this should hold, not increase, even though sets.length already
    // reaches targetSets.
    expect(buildProgressionSuggestion(lopsided, 12, 2, true).action).toBe("hold");

    const evenSides = [
      ...lopsided,
      buildSet({ id: "r1", side: "right", setNumber: 3, actualReps: 12, rir: 2, painScore: 0 }),
      buildSet({ id: "r2", side: "right", setNumber: 4, actualReps: 12, rir: 2, painScore: 0 }),
    ];

    expect(buildProgressionSuggestion(evenSides, 12, 2, true).action).toBe("increase");
  });

  it("a bonus set beyond targetSets doesn't block an increase the planned sets earned", () => {
    const sets = [
      buildSet({ id: "s1", setNumber: 1, actualReps: 12, rir: 2, painScore: 0 }),
      buildSet({ id: "s2", setNumber: 2, actualReps: 12, rir: 2, painScore: 0 }),
      // A bonus 3rd set (target is 2) that's lighter and doesn't reach the
      // rep ceiling — must not veto the increase the first two earned.
      buildSet({ id: "s3", setNumber: 3, actualReps: 6, rir: 4, painScore: 0 }),
    ];

    expect(buildProgressionSuggestion(sets, 12, 2, false).action).toBe("increase");
  });

  it("pain on a bonus set still flags the exercise, even past targetSets", () => {
    const sets = [
      buildSet({ id: "s1", setNumber: 1, actualReps: 12, rir: 2, painScore: 0 }),
      buildSet({ id: "s2", setNumber: 2, actualReps: 12, rir: 2, painScore: 0 }),
      buildSet({ id: "s3", setNumber: 3, actualReps: 10, rir: 1, painScore: 4 }),
    ];

    expect(buildProgressionSuggestion(sets, 12, 2, false)).toMatchObject({
      action: "reduce_or_modify",
      riskFlag: "pain",
    });
  });

  it("for a unilateral exercise, a bonus set on one side only doesn't contaminate the other side's planned signal", () => {
    const sets = [
      buildSet({ id: "l1", side: "left", setNumber: 1, actualReps: 12, rir: 2, painScore: 0 }),
      buildSet({ id: "l2", side: "left", setNumber: 2, actualReps: 12, rir: 2, painScore: 0 }),
      buildSet({ id: "r1", side: "right", setNumber: 3, actualReps: 12, rir: 2, painScore: 0 }),
      buildSet({ id: "r2", side: "right", setNumber: 4, actualReps: 12, rir: 2, painScore: 0 }),
      // A bonus 3rd set on the left side only, well below the rep ceiling.
      buildSet({ id: "l3", side: "left", setNumber: 5, actualReps: 5, rir: 4, painScore: 0 }),
    ];

    expect(buildProgressionSuggestion(sets, 12, 2, true).action).toBe("increase");
  });
});

describe("splitPlannedAndBonusSets", () => {
  it("splits a bilateral exercise's sets at targetSets", () => {
    const sets = [
      buildSet({ id: "s1", setNumber: 1 }),
      buildSet({ id: "s2", setNumber: 2 }),
      buildSet({ id: "s3", setNumber: 3 }),
    ];

    const result = splitPlannedAndBonusSets(sets, 2, false);

    expect(result.planned.map((set) => set.id)).toEqual(["s1", "s2"]);
    expect(result.bonus.map((set) => set.id)).toEqual(["s3"]);
  });

  it("splits a unilateral exercise's sets per side independently", () => {
    const sets = [
      buildSet({ id: "l1", side: "left", setNumber: 1 }),
      buildSet({ id: "r1", side: "right", setNumber: 2 }),
      buildSet({ id: "l2", side: "left", setNumber: 3 }),
      buildSet({ id: "l3", side: "left", setNumber: 4 }),
      buildSet({ id: "r2", side: "right", setNumber: 5 }),
    ];

    const result = splitPlannedAndBonusSets(sets, 2, true);

    expect(result.planned.map((set) => set.id)).toEqual(["l1", "r1", "l2", "r2"]);
    expect(result.bonus.map((set) => set.id)).toEqual(["l3"]);
  });

  it("returns everything as planned when nothing exceeds targetSets", () => {
    const sets = [buildSet({ id: "s1", setNumber: 1 })];

    const result = splitPlannedAndBonusSets(sets, 3, false);

    expect(result.planned).toHaveLength(1);
    expect(result.bonus).toHaveLength(0);
  });
});
