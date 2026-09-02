import { describe, expect, it } from "vitest";

import { computeExerciseImprovement } from "./improvement";
import type { SetLog } from "./workout-repository";

function buildSet(overrides: Partial<SetLog> = {}): SetLog {
  return {
    id: "set-1",
    exerciseLogId: "log-1",
    setNumber: 1,
    side: "bilateral",
    actualWeightKg: "80.00",
    actualReps: 10,
    rir: 2,
    actualDurationSeconds: null,
    painScore: 0,
    painLocation: null,
    notes: null,
    completedAt: new Date("2026-07-20T12:00:00Z"),
    updatedAt: null,
    ...overrides,
  };
}

describe("computeExerciseImprovement", () => {
  it("flags volume_load when total volume increases >=5% and pain stays <=2", () => {
    const previous = [buildSet({ actualWeightKg: "80.00", actualReps: 10, painScore: 0 })]; // 800
    const latest = [buildSet({ actualWeightKg: "84.00", actualReps: 10, painScore: 0 })]; // 840, +5%

    const result = computeExerciseImprovement(latest, previous, false);

    expect(result.signals).toContain("volume_load");
    expect(result.improved).toBe(true);
  });

  it("does not flag volume_load when the increase is under 5%", () => {
    const previous = [buildSet({ actualWeightKg: "80.00", actualReps: 10 })]; // 800
    const latest = [buildSet({ actualWeightKg: "82.00", actualReps: 10 })]; // 820, +2.5%

    const result = computeExerciseImprovement(latest, previous, false);

    expect(result.signals).not.toContain("volume_load");
  });

  it("does not flag volume_load when pain exceeds 2, even with a big volume increase", () => {
    const previous = [buildSet({ actualWeightKg: "80.00", actualReps: 10, painScore: 0 })];
    const latest = [buildSet({ actualWeightKg: "90.00", actualReps: 10, painScore: 3 })];

    const result = computeExerciseImprovement(latest, previous, false);

    expect(result.signals).not.toContain("volume_load");
  });

  it("flags pain improvement when max pain drops by >=2 at a maintained workload", () => {
    const previous = [buildSet({ actualWeightKg: "80.00", actualReps: 10, painScore: 4 })];
    const latest = [buildSet({ actualWeightKg: "80.00", actualReps: 10, painScore: 1 })];

    const result = computeExerciseImprovement(latest, previous, false);

    expect(result.signals).toContain("pain");
    expect(result.improved).toBe(true);
  });

  it("does not flag pain improvement if workload also dropped significantly", () => {
    const previous = [buildSet({ actualWeightKg: "80.00", actualReps: 10, painScore: 4 })]; // 800
    const latest = [buildSet({ actualWeightKg: "50.00", actualReps: 10, painScore: 1 })]; // 500

    const result = computeExerciseImprovement(latest, previous, false);

    expect(result.signals).not.toContain("pain");
  });

  it("returns no signals and does not throw when there is no previous data", () => {
    const result = computeExerciseImprovement([buildSet()], [], false);

    expect(result.improved).toBe(false);
    expect(result.signals).toEqual([]);
    expect(result.previousVolumeLoadKg).toBe(0);
  });

  it("flags reps_at_load when reps increase >=5% at the same load and similar RIR", () => {
    const previous = [buildSet({ actualWeightKg: "80.00", actualReps: 10, rir: 2 })];
    const latest = [buildSet({ actualWeightKg: "80.00", actualReps: 11, rir: 2 })]; // +10% reps, same load

    const result = computeExerciseImprovement(latest, previous, false);

    expect(result.signals).toContain("reps_at_load");
  });

  it("does not flag reps_at_load when the load also changed", () => {
    const previous = [buildSet({ actualWeightKg: "80.00", actualReps: 10, rir: 2 })];
    const latest = [buildSet({ actualWeightKg: "85.00", actualReps: 11, rir: 2 })];

    const result = computeExerciseImprovement(latest, previous, false);

    expect(result.signals).not.toContain("reps_at_load");
  });

  it("does not flag reps_at_load when RIR drifted by more than 1", () => {
    const previous = [buildSet({ actualWeightKg: "80.00", actualReps: 10, rir: 3 })];
    const latest = [buildSet({ actualWeightKg: "80.00", actualReps: 11, rir: 1 })];

    const result = computeExerciseImprovement(latest, previous, false);

    expect(result.signals).not.toContain("reps_at_load");
  });

  it("flags load_at_reps when load increases >=5% at the same-or-higher reps and similar RIR", () => {
    const previous = [buildSet({ actualWeightKg: "80.00", actualReps: 10, rir: 2 })];
    const latest = [buildSet({ actualWeightKg: "85.00", actualReps: 10, rir: 2 })]; // +6.25% load, same reps

    const result = computeExerciseImprovement(latest, previous, false);

    expect(result.signals).toContain("load_at_reps");
  });

  it("does not flag load_at_reps when reps dropped", () => {
    const previous = [buildSet({ actualWeightKg: "80.00", actualReps: 10, rir: 2 })];
    const latest = [buildSet({ actualWeightKg: "88.00", actualReps: 7, rir: 2 })];

    const result = computeExerciseImprovement(latest, previous, false);

    expect(result.signals).not.toContain("load_at_reps");
  });

  describe("estimated 1RM (RIR-adjusted Epley)", () => {
    it("flags estimated_1rm when the RIR-adjusted 1RM increases >=5% at a compatible rep count", () => {
      // previous: 80 * (1 + (10+2)/30) = 112kg
      const previous = [buildSet({ actualWeightKg: "80.00", actualReps: 10, rir: 2, painScore: 0 })];
      // latest: 90 * (1 + (10+2)/30) = 126kg, well over +5%
      const latest = [buildSet({ actualWeightKg: "90.00", actualReps: 10, rir: 2, painScore: 0 })];

      const result = computeExerciseImprovement(latest, previous, false);

      expect(result.signals).toContain("estimated_1rm");
      expect(result.previousEstimated1RmKg).toBeCloseTo(112, 1);
      expect(result.latestEstimated1RmKg).toBeCloseTo(126, 1);
    });

    it("credits a higher RIR with a higher estimated 1RM at the same weight and reps", () => {
      const sets = [buildSet({ actualWeightKg: "80.00", actualReps: 10, rir: 4 })];

      const result = computeExerciseImprovement(sets, sets, false);

      // 80 * (1 + (10+4)/30) = 117.33
      expect(result.latestEstimated1RmKg).toBeCloseTo(117.33, 1);
    });

    it("excludes sets over the reliable rep ceiling from the 1RM estimate", () => {
      const previous = [buildSet({ actualWeightKg: "80.00", actualReps: 10, rir: 2 })];
      const latest = [buildSet({ actualWeightKg: "20.00", actualReps: 20, rir: 2 })];

      const result = computeExerciseImprovement(latest, previous, false);

      expect(result.latestEstimated1RmKg).toBeNull();
      expect(result.signals).not.toContain("estimated_1rm");
    });

    it("does not flag estimated_1rm when the compared rep counts aren't compatible", () => {
      const previous = [buildSet({ actualWeightKg: "40.00", actualReps: 3, rir: 2 })];
      const latest = [buildSet({ actualWeightKg: "40.00", actualReps: 15, rir: 2 })];

      const result = computeExerciseImprovement(latest, previous, false);

      expect(result.signals).not.toContain("estimated_1rm");
    });

    it("uses the best (highest-estimate) set per instance when multiple sets are logged", () => {
      const previous = [
        buildSet({ id: "p1", actualWeightKg: "80.00", actualReps: 8, rir: 1 }),
        buildSet({ id: "p2", actualWeightKg: "80.00", actualReps: 10, rir: 2 }),
      ];
      const latest = [buildSet({ id: "l1", actualWeightKg: "84.00", actualReps: 10, rir: 2 })];

      const result = computeExerciseImprovement(latest, previous, false);

      // p2 (80 * 1.4 = 112) beats p1 (80 * 1.3 = 104) as the previous instance's best set.
      expect(result.previousEstimated1RmKg).toBeCloseTo(112, 1);
    });
  });

  describe("asymmetry improvement (unilateral exercises)", () => {
    it("flags asymmetry_performance when the left/right volume gap shrinks >=5% without more pain", () => {
      const previous = [
        buildSet({ id: "p-l", side: "left", actualWeightKg: "20.00", actualReps: 10, painScore: 0 }), // 200
        buildSet({ id: "p-r", side: "right", actualWeightKg: "20.00", actualReps: 5, painScore: 0 }), // 100, gap 100
      ];
      const latest = [
        buildSet({ id: "l-l", side: "left", actualWeightKg: "20.00", actualReps: 10, painScore: 0 }), // 200
        buildSet({ id: "l-r", side: "right", actualWeightKg: "20.00", actualReps: 9, painScore: 0 }), // 180, gap 20
      ];

      const result = computeExerciseImprovement(latest, previous, true);

      expect(result.signals).toContain("asymmetry_performance");
      expect(result.previousAsymmetryGapKg).toBeCloseTo(100, 1);
      expect(result.latestAsymmetryGapKg).toBeCloseTo(20, 1);
    });

    it("does not read an unequal number of logged sets as an asymmetry", () => {
      // Taken from real history: Prensa unilateral, 3 sets left and 4 right at
      // an identical 20kg. Comparing side totals reported a 140kg gap that was
      // one extra set and nothing about the legs.
      const sets = [
        buildSet({ id: "l-1", side: "left", actualWeightKg: "20.00", actualReps: 7, painScore: 0 }),
        buildSet({ id: "l-2", side: "left", actualWeightKg: "20.00", actualReps: 7, painScore: 0 }),
        buildSet({ id: "l-3", side: "left", actualWeightKg: "20.00", actualReps: 7, painScore: 0 }),
        buildSet({ id: "r-1", side: "right", actualWeightKg: "20.00", actualReps: 7, painScore: 0 }),
        buildSet({ id: "r-2", side: "right", actualWeightKg: "20.00", actualReps: 7, painScore: 0 }),
        buildSet({ id: "r-3", side: "right", actualWeightKg: "20.00", actualReps: 7, painScore: 0 }),
        buildSet({ id: "r-4", side: "right", actualWeightKg: "20.00", actualReps: 7, painScore: 0 }),
      ];

      const result = computeExerciseImprovement(sets, sets, true);

      expect(result.latestAsymmetryGapKg).toBe(0);
    });

    it("still sees a real per-set difference at equal set counts", () => {
      const sets = [
        buildSet({ id: "l-1", side: "left", actualWeightKg: "20.00", actualReps: 5, painScore: 0 }),
        buildSet({ id: "r-1", side: "right", actualWeightKg: "20.00", actualReps: 10, painScore: 0 }),
      ];

      const result = computeExerciseImprovement(sets, sets, true);

      expect(result.latestAsymmetryGapKg).toBeCloseTo(100, 1);
    });

    it("reports no gap when one side logged nothing", () => {
      // An incomplete exercise, not a measured imbalance.
      const sets = [
        buildSet({ id: "l-1", side: "left", actualWeightKg: "20.00", actualReps: 8, painScore: 0 }),
        buildSet({ id: "l-2", side: "left", actualWeightKg: "20.00", actualReps: 8, painScore: 0 }),
      ];

      const result = computeExerciseImprovement(sets, sets, true);

      expect(result.latestAsymmetryGapKg).toBe(0);
    });

    it("does not compute an asymmetry gap for bilateral exercises", () => {
      const sets = [buildSet({ side: "bilateral" })];

      const result = computeExerciseImprovement(sets, sets, false);

      expect(result.latestAsymmetryGapKg).toBeNull();
      expect(result.previousAsymmetryGapKg).toBeNull();
      expect(result.signals).not.toContain("asymmetry_performance");
    });

    it("does not flag asymmetry_performance when pain increased even if the gap shrank", () => {
      const previous = [
        buildSet({ id: "p-l", side: "left", actualWeightKg: "20.00", actualReps: 10, painScore: 0 }),
        buildSet({ id: "p-r", side: "right", actualWeightKg: "20.00", actualReps: 5, painScore: 0 }),
      ];
      const latest = [
        buildSet({ id: "l-l", side: "left", actualWeightKg: "20.00", actualReps: 10, painScore: 3 }),
        buildSet({ id: "l-r", side: "right", actualWeightKg: "20.00", actualReps: 9, painScore: 3 }),
      ];

      const result = computeExerciseImprovement(latest, previous, true);

      expect(result.signals).not.toContain("asymmetry_performance");
    });
  });
});
