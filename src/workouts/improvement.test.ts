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
    notes: null,
    completedAt: new Date("2026-07-20T12:00:00Z"),
    ...overrides,
  };
}

describe("computeExerciseImprovement", () => {
  it("flags volume_load when total volume increases >=5% and pain stays <=2", () => {
    const previous = [buildSet({ actualWeightKg: "80.00", actualReps: 10, painScore: 0 })]; // 800
    const latest = [buildSet({ actualWeightKg: "84.00", actualReps: 10, painScore: 0 })]; // 840, +5%

    const result = computeExerciseImprovement(latest, previous);

    expect(result.signals).toContain("volume_load");
    expect(result.improved).toBe(true);
  });

  it("does not flag volume_load when the increase is under 5%", () => {
    const previous = [buildSet({ actualWeightKg: "80.00", actualReps: 10 })]; // 800
    const latest = [buildSet({ actualWeightKg: "82.00", actualReps: 10 })]; // 820, +2.5%

    const result = computeExerciseImprovement(latest, previous);

    expect(result.signals).not.toContain("volume_load");
  });

  it("does not flag volume_load when pain exceeds 2, even with a big volume increase", () => {
    const previous = [buildSet({ actualWeightKg: "80.00", actualReps: 10, painScore: 0 })];
    const latest = [buildSet({ actualWeightKg: "90.00", actualReps: 10, painScore: 3 })];

    const result = computeExerciseImprovement(latest, previous);

    expect(result.signals).not.toContain("volume_load");
  });

  it("flags pain improvement when max pain drops by >=2 at a maintained workload", () => {
    const previous = [buildSet({ actualWeightKg: "80.00", actualReps: 10, painScore: 4 })];
    const latest = [buildSet({ actualWeightKg: "80.00", actualReps: 10, painScore: 1 })];

    const result = computeExerciseImprovement(latest, previous);

    expect(result.signals).toContain("pain");
    expect(result.improved).toBe(true);
  });

  it("does not flag pain improvement if workload also dropped significantly", () => {
    const previous = [buildSet({ actualWeightKg: "80.00", actualReps: 10, painScore: 4 })]; // 800
    const latest = [buildSet({ actualWeightKg: "50.00", actualReps: 10, painScore: 1 })]; // 500

    const result = computeExerciseImprovement(latest, previous);

    expect(result.signals).not.toContain("pain");
  });

  it("returns no signals and does not throw when there is no previous data", () => {
    const result = computeExerciseImprovement([buildSet()], []);

    expect(result.improved).toBe(false);
    expect(result.signals).toEqual([]);
    expect(result.previousVolumeLoadKg).toBe(0);
  });

  it("flags reps_at_load when reps increase >=5% at the same load and similar RIR", () => {
    const previous = [buildSet({ actualWeightKg: "80.00", actualReps: 10, rir: 2 })];
    const latest = [buildSet({ actualWeightKg: "80.00", actualReps: 11, rir: 2 })]; // +10% reps, same load

    const result = computeExerciseImprovement(latest, previous);

    expect(result.signals).toContain("reps_at_load");
  });

  it("does not flag reps_at_load when the load also changed", () => {
    const previous = [buildSet({ actualWeightKg: "80.00", actualReps: 10, rir: 2 })];
    const latest = [buildSet({ actualWeightKg: "85.00", actualReps: 11, rir: 2 })];

    const result = computeExerciseImprovement(latest, previous);

    expect(result.signals).not.toContain("reps_at_load");
  });

  it("does not flag reps_at_load when RIR drifted by more than 1", () => {
    const previous = [buildSet({ actualWeightKg: "80.00", actualReps: 10, rir: 3 })];
    const latest = [buildSet({ actualWeightKg: "80.00", actualReps: 11, rir: 1 })];

    const result = computeExerciseImprovement(latest, previous);

    expect(result.signals).not.toContain("reps_at_load");
  });

  it("flags load_at_reps when load increases >=5% at the same-or-higher reps and similar RIR", () => {
    const previous = [buildSet({ actualWeightKg: "80.00", actualReps: 10, rir: 2 })];
    const latest = [buildSet({ actualWeightKg: "85.00", actualReps: 10, rir: 2 })]; // +6.25% load, same reps

    const result = computeExerciseImprovement(latest, previous);

    expect(result.signals).toContain("load_at_reps");
  });

  it("does not flag load_at_reps when reps dropped", () => {
    const previous = [buildSet({ actualWeightKg: "80.00", actualReps: 10, rir: 2 })];
    const latest = [buildSet({ actualWeightKg: "88.00", actualReps: 7, rir: 2 })];

    const result = computeExerciseImprovement(latest, previous);

    expect(result.signals).not.toContain("load_at_reps");
  });
});
