import { describe, expect, it } from "vitest";

import type { ExerciseImprovement, ExerciseImprovementRow } from "@/workouts/improvement";

import { buildTopExerciseRows } from "./top-exercises-list";

function buildImprovement(overrides: Partial<ExerciseImprovement> = {}): ExerciseImprovement {
  return {
    improved: true,
    signals: [],
    latestVolumeLoadKg: 800,
    previousVolumeLoadKg: 800,
    latestMaxPain: 0,
    previousMaxPain: 0,
    latestAvgWeightKg: 80,
    previousAvgWeightKg: 80,
    latestAvgReps: 10,
    previousAvgReps: 10,
    latestEstimated1RmKg: null,
    previousEstimated1RmKg: null,
    latestAsymmetryGapKg: null,
    previousAsymmetryGapKg: null,
    ...overrides,
  };
}

function buildRow(exerciseNameEs: string, improvement: Partial<ExerciseImprovement>): ExerciseImprovementRow {
  return { exerciseNameEs, latestCompletedAt: null, improvement: buildImprovement(improvement) };
}

describe("buildTopExerciseRows", () => {
  it("skips an exercise with no signals at all", () => {
    const rows = buildTopExerciseRows([buildRow("Sin cambios", { signals: [] })]);
    expect(rows).toEqual([]);
  });

  it("formats a volume_load improvement as a positive percentage", () => {
    const rows = buildTopExerciseRows([
      buildRow("Prensa de piernas", {
        signals: ["volume_load"],
        latestVolumeLoadKg: 840,
        previousVolumeLoadKg: 800, // +5%
      }),
    ]);

    expect(rows).toEqual([
      { exerciseNameEs: "Prensa de piernas", signal: "volume_load", labelEs: "Volumen", displayEs: "+5.0%", magnitude: 5 },
    ]);
  });

  it("prefers estimated_1rm over volume_load when both signals fired for the same exercise", () => {
    const rows = buildTopExerciseRows([
      buildRow("Sentadilla", {
        signals: ["volume_load", "estimated_1rm"],
        latestVolumeLoadKg: 840,
        previousVolumeLoadKg: 800,
        latestEstimated1RmKg: 110,
        previousEstimated1RmKg: 100, // +10%
      }),
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]!.signal).toBe("estimated_1rm");
    expect(rows[0]!.displayEs).toBe("+10.0%");
  });

  it("formats a pain improvement as a point drop, not a percentage", () => {
    const rows = buildTopExerciseRows([
      buildRow("Press de hombro", { signals: ["pain"], previousMaxPain: 5, latestMaxPain: 2 }),
    ]);

    expect(rows[0]!.labelEs).toBe("Dolor");
    expect(rows[0]!.displayEs).toBe("−3");
  });

  it("formats an asymmetry improvement as the percentage of the gap closed", () => {
    const rows = buildTopExerciseRows([
      buildRow("Prensa unilateral", {
        signals: ["asymmetry_performance"],
        previousAsymmetryGapKg: 20,
        latestAsymmetryGapKg: 10, // gap halved
      }),
    ]);

    expect(rows[0]!.labelEs).toBe("Asimetría");
    expect(rows[0]!.displayEs).toBe("−50%");
  });

  it("sorts by the magnitude of each row's own headline signal, biggest first", () => {
    const rows = buildTopExerciseRows([
      buildRow("Pequeña mejora", { signals: ["volume_load"], previousVolumeLoadKg: 800, latestVolumeLoadKg: 848 }), // +6%
      buildRow("Gran mejora", { signals: ["volume_load"], previousVolumeLoadKg: 800, latestVolumeLoadKg: 1000 }), // +25%
    ]);

    expect(rows.map((row) => row.exerciseNameEs)).toEqual(["Gran mejora", "Pequeña mejora"]);
  });

  it("respects the limit parameter", () => {
    const rows = buildTopExerciseRows(
      [
        buildRow("A", { signals: ["volume_load"], previousVolumeLoadKg: 800, latestVolumeLoadKg: 900 }),
        buildRow("B", { signals: ["volume_load"], previousVolumeLoadKg: 800, latestVolumeLoadKg: 900 }),
        buildRow("C", { signals: ["volume_load"], previousVolumeLoadKg: 800, latestVolumeLoadKg: 900 }),
      ],
      2,
    );

    expect(rows).toHaveLength(2);
  });
});
