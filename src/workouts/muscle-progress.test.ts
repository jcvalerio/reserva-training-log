import { describe, expect, it } from "vitest";

import type { ExerciseSeriesGroup } from "./exercise-series";
import type { ExerciseImprovement, ExerciseImprovementRow } from "./improvement";
import { buildMuscleProgressRows, hasPainFlag } from "./muscle-progress";
import type { VolumeView } from "./muscle-volume";

const LATEST = new Date("2026-08-10T12:00:00");

function buildImprovement(overrides: Partial<ExerciseImprovement> = {}): ExerciseImprovement {
  return {
    improved: false,
    signals: [],
    latestVolumeLoadKg: 480,
    previousVolumeLoadKg: 480,
    latestMaxPain: 0,
    previousMaxPain: 0,
    latestAvgWeightKg: 60,
    previousAvgWeightKg: 60,
    latestAvgReps: 8,
    previousAvgReps: 8,
    latestEstimated1RmKg: null,
    previousEstimated1RmKg: null,
    latestAsymmetryGapKg: null,
    previousAsymmetryGapKg: null,
    ...overrides,
  };
}

function buildImprovementRow(
  exerciseNameEs: string,
  overrides: Partial<ExerciseImprovement> = {},
  latestCompletedAt: Date | null = LATEST,
): ExerciseImprovementRow {
  return { exerciseNameEs, improvement: buildImprovement(overrides), latestCompletedAt };
}

function buildSeriesGroup(
  exerciseNameEs: string,
  primaryMuscleGroup: ExerciseSeriesGroup["primaryMuscleGroup"],
): ExerciseSeriesGroup {
  return {
    exerciseNameEs,
    isUnilateral: false,
    primaryMuscleGroup,
    isClassified: primaryMuscleGroup !== null,
    substitutedForNameEs: null,
    points: [],
  };
}

function buildView(byMuscleGroup: VolumeView["byMuscleGroup"]): VolumeView {
  return {
    key: "four_weeks",
    labelEs: "4 semanas",
    byMuscleGroup,
    weeksCounted: 4,
    isAverage: true,
    comparison: null,
  };
}

describe("buildMuscleProgressRows", () => {
  // pecho's reference band is 10-20 sets/week.

  it("reads enough sets plus a moving exercise as growing", () => {
    const rows = buildMuscleProgressRows(
      buildView([{ muscleGroup: "pecho", effectiveSets: 13 }]),
      [buildSeriesGroup("Press de banca", "pecho")],
      [buildImprovementRow("Press de banca", { improved: true, signals: ["load_at_reps"], latestAvgWeightKg: 65 })],
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ muscleGroup: "pecho", verdict: "growing", bandPosition: "within" });
  });

  // The distinction the whole report exists to make: identical set counts,
  // opposite corrections, because only one of them is producing anything.
  it("reads enough sets with nothing moving as stalled, not as growing", () => {
    const rows = buildMuscleProgressRows(
      buildView([{ muscleGroup: "pecho", effectiveSets: 13 }]),
      [buildSeriesGroup("Press de banca", "pecho")],
      [buildImprovementRow("Press de banca")],
    );

    expect(rows[0]?.verdict).toBe("stalled");
    expect(rows[0]?.improvedExerciseCount).toBe(0);
    expect(rows[0]?.comparedExerciseCount).toBe(1);
  });

  it("reads too few sets as under_stimulus even when an exercise is flat", () => {
    const rows = buildMuscleProgressRows(
      buildView([{ muscleGroup: "pecho", effectiveSets: 4 }]),
      [buildSeriesGroup("Press de banca", "pecho")],
      [buildImprovementRow("Press de banca")],
    );

    expect(rows[0]).toMatchObject({ verdict: "under_stimulus", bandPosition: "below" });
  });

  it("reads past-ceiling sets with nothing moving as overreaching", () => {
    const rows = buildMuscleProgressRows(
      buildView([{ muscleGroup: "pecho", effectiveSets: 26 }]),
      [buildSeriesGroup("Press de banca", "pecho")],
      [buildImprovementRow("Press de banca")],
    );

    expect(rows[0]).toMatchObject({ verdict: "overreaching", bandPosition: "above" });
  });

  // Progression outranks the band: work that is still producing results is not
  // a problem to correct, however high the set count reads.
  it("stays growing above the ceiling when an exercise is still improving", () => {
    const rows = buildMuscleProgressRows(
      buildView([{ muscleGroup: "pecho", effectiveSets: 26 }]),
      [buildSeriesGroup("Press de banca", "pecho")],
      [buildImprovementRow("Press de banca", { improved: true, signals: ["volume_load"] })],
    );

    expect(rows[0]?.verdict).toBe("growing");
  });

  it("reads a trained group with nothing to compare as no_data", () => {
    const rows = buildMuscleProgressRows(
      buildView([{ muscleGroup: "pecho", effectiveSets: 12 }]),
      [buildSeriesGroup("Press de banca", "pecho")],
      [],
    );

    expect(rows[0]).toMatchObject({ verdict: "no_data", comparedExerciseCount: 0, bestLift: null });
  });

  // A short dose is a statement about the input, which needs no trend data.
  it("still reports under_stimulus with nothing to compare when sets are below the floor", () => {
    const rows = buildMuscleProgressRows(
      buildView([{ muscleGroup: "pecho", effectiveSets: 3 }]),
      [buildSeriesGroup("Press de banca", "pecho")],
      [],
    );

    expect(rows[0]?.verdict).toBe("under_stimulus");
  });

  it("omits the unclassified bucket and zero-set groups", () => {
    const rows = buildMuscleProgressRows(
      buildView([
        { muscleGroup: "sin_clasificar", effectiveSets: 9 },
        { muscleGroup: "pecho", effectiveSets: 0 },
        { muscleGroup: "dorsal", effectiveSets: 12 },
      ]),
      [],
      [],
    );

    expect(rows.map((row) => row.muscleGroup)).toEqual(["dorsal"]);
  });

  // Secondary credit inflates the sets column but must never mark a group as
  // growing: a remo getting stronger is evidence about the back, not the arm.
  it("credits progression only to the exercise's primary muscle group", () => {
    const rows = buildMuscleProgressRows(
      buildView([
        { muscleGroup: "dorsal", effectiveSets: 12 },
        { muscleGroup: "biceps", effectiveSets: 12 },
      ]),
      [buildSeriesGroup("Remo con barra", "dorsal")],
      [buildImprovementRow("Remo con barra", { improved: true, signals: ["load_at_reps"] })],
    );

    const byGroup = new Map(rows.map((row) => [row.muscleGroup, row]));
    expect(byGroup.get("dorsal")?.verdict).toBe("growing");
    expect(byGroup.get("biceps")).toMatchObject({ verdict: "no_data", comparedExerciseCount: 0 });
  });

  it("ignores improvements for exercises with no resolved muscle group", () => {
    const rows = buildMuscleProgressRows(
      buildView([{ muscleGroup: "pecho", effectiveSets: 13 }]),
      [buildSeriesGroup("Ejercicio raro", null)],
      [buildImprovementRow("Ejercicio raro", { improved: true, signals: ["volume_load"] })],
    );

    expect(rows[0]).toMatchObject({ verdict: "no_data", comparedExerciseCount: 0 });
  });

  describe("bestLift", () => {
    it("prefers an improved exercise over a flat one with a bigger absolute load", () => {
      const rows = buildMuscleProgressRows(
        buildView([{ muscleGroup: "pecho", effectiveSets: 13 }]),
        [buildSeriesGroup("Press de banca", "pecho"), buildSeriesGroup("Aperturas", "pecho")],
        [
          buildImprovementRow("Press de banca", { latestAvgWeightKg: 100, previousAvgWeightKg: 100 }),
          buildImprovementRow("Aperturas", {
            improved: true,
            signals: ["reps_at_load"],
            latestAvgWeightKg: 20,
            previousAvgWeightKg: 20,
            latestAvgReps: 12,
            previousAvgReps: 10,
          }),
        ],
      );

      expect(rows[0]?.bestLift).toMatchObject({ exerciseNameEs: "Aperturas", improved: true });
    });

    it("ranks improved exercises by relative per-set gain", () => {
      const rows = buildMuscleProgressRows(
        buildView([{ muscleGroup: "pecho", effectiveSets: 13 }]),
        [buildSeriesGroup("Press de banca", "pecho"), buildSeriesGroup("Aperturas", "pecho")],
        [
          buildImprovementRow("Press de banca", {
            improved: true,
            signals: ["load_at_reps"],
            previousAvgWeightKg: 60,
            latestAvgWeightKg: 66, // +10%
          }),
          buildImprovementRow("Aperturas", {
            improved: true,
            signals: ["load_at_reps"],
            previousAvgWeightKg: 20,
            latestAvgWeightKg: 30, // +50%
          }),
        ],
      );

      expect(rows[0]?.bestLift?.exerciseNameEs).toBe("Aperturas");
    });

    it("carries the weight and reps of both instances so the lift can be stated in training units", () => {
      const rows = buildMuscleProgressRows(
        buildView([{ muscleGroup: "pecho", effectiveSets: 13 }]),
        [buildSeriesGroup("Press de banca", "pecho")],
        [
          buildImprovementRow("Press de banca", {
            improved: true,
            signals: ["reps_at_load"],
            previousAvgWeightKg: 60,
            previousAvgReps: 8,
            latestAvgWeightKg: 60,
            latestAvgReps: 10,
          }),
        ],
      );

      expect(rows[0]?.bestLift).toMatchObject({
        previousWeightKg: 60,
        previousReps: 8,
        latestWeightKg: 60,
        latestReps: 10,
      });
    });
  });

  it("sorts problems above healthy groups, then anatomically", () => {
    const rows = buildMuscleProgressRows(
      buildView([
        { muscleGroup: "pecho", effectiveSets: 13 },
        { muscleGroup: "dorsal", effectiveSets: 13 },
        { muscleGroup: "cuadriceps", effectiveSets: 26 },
        { muscleGroup: "biceps", effectiveSets: 12 },
      ]),
      [buildSeriesGroup("Press de banca", "pecho"), buildSeriesGroup("Jalón", "dorsal"), buildSeriesGroup("Sentadilla", "cuadriceps")],
      [
        buildImprovementRow("Press de banca", { improved: true, signals: ["volume_load"] }),
        buildImprovementRow("Jalón"),
        buildImprovementRow("Sentadilla"),
      ],
    );

    expect(rows.map((row) => `${row.muscleGroup}:${row.verdict}`)).toEqual([
      "cuadriceps:overreaching",
      "dorsal:stalled",
      "biceps:no_data",
      "pecho:growing",
    ]);
  });

  it("carries the worst pain logged on the group's compared exercises", () => {
    const rows = buildMuscleProgressRows(
      buildView([{ muscleGroup: "pecho", effectiveSets: 13 }]),
      [buildSeriesGroup("Press de banca", "pecho"), buildSeriesGroup("Aperturas", "pecho")],
      [
        buildImprovementRow("Press de banca", { latestMaxPain: 1 }),
        buildImprovementRow("Aperturas", { latestMaxPain: 4 }),
      ],
    );

    expect(rows[0]?.maxPainScore).toBe(4);
  });
});

describe("hasPainFlag", () => {
  // Mirrors the app's own progression gate: pain above 2 blocks aggressive
  // progression, so 2 alone must not escalate the section.
  it("is false at the threshold and true above it", () => {
    const view = buildView([{ muscleGroup: "pecho", effectiveSets: 13 }]);
    const seriesGroups = [buildSeriesGroup("Press de banca", "pecho")];

    const atThreshold = buildMuscleProgressRows(view, seriesGroups, [
      buildImprovementRow("Press de banca", { latestMaxPain: 2 }),
    ]);
    const aboveThreshold = buildMuscleProgressRows(view, seriesGroups, [
      buildImprovementRow("Press de banca", { latestMaxPain: 3 }),
    ]);

    expect(hasPainFlag(atThreshold)).toBe(false);
    expect(hasPainFlag(aboveThreshold)).toBe(true);
  });
});
