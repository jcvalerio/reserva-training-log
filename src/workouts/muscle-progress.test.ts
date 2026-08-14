import { describe, expect, it } from "vitest";

import type { ExerciseSeriesGroup } from "./exercise-series";
import type { ExerciseImprovement, ExerciseImprovementRow } from "./improvement";
import { buildMuscleProgressRows, hasPainFlag, readEffort } from "./muscle-progress";
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

/** Most cases here are about the volume/progression cross, not RIR, so the
 *  default sits in the productive range where it changes nothing. */
function group(
  muscleGroup: VolumeView["byMuscleGroup"][number]["muscleGroup"],
  effectiveSets: number,
  avgRir: number | null = 2,
): VolumeView["byMuscleGroup"][number] {
  return { muscleGroup, effectiveSets, avgRir, rirSetCount: avgRir === null ? 0 : 6 };
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
      buildView([group("pecho", 13)]),
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
      buildView([group("pecho", 13)]),
      [buildSeriesGroup("Press de banca", "pecho")],
      [buildImprovementRow("Press de banca")],
    );

    expect(rows[0]?.verdict).toBe("stalled");
    expect(rows[0]?.improvedExerciseCount).toBe(0);
    expect(rows[0]?.comparedExerciseCount).toBe(1);
  });

  it("reads too few sets as under_stimulus even when an exercise is flat", () => {
    const rows = buildMuscleProgressRows(
      buildView([group("pecho", 4)]),
      [buildSeriesGroup("Press de banca", "pecho")],
      [buildImprovementRow("Press de banca")],
    );

    expect(rows[0]).toMatchObject({ verdict: "under_stimulus", bandPosition: "below" });
  });

  it("reads past-ceiling sets with nothing moving as overreaching", () => {
    const rows = buildMuscleProgressRows(
      buildView([group("pecho", 26)]),
      [buildSeriesGroup("Press de banca", "pecho")],
      [buildImprovementRow("Press de banca")],
    );

    expect(rows[0]).toMatchObject({ verdict: "overreaching", bandPosition: "above" });
  });

  // Progression outranks the band: work that is still producing results is not
  // a problem to correct, however high the set count reads.
  it("stays growing above the ceiling when an exercise is still improving", () => {
    const rows = buildMuscleProgressRows(
      buildView([group("pecho", 26)]),
      [buildSeriesGroup("Press de banca", "pecho")],
      [buildImprovementRow("Press de banca", { improved: true, signals: ["volume_load"] })],
    );

    expect(rows[0]?.verdict).toBe("growing");
  });

  it("reads a trained group with nothing to compare as no_data", () => {
    const rows = buildMuscleProgressRows(
      buildView([group("pecho", 12)]),
      [buildSeriesGroup("Press de banca", "pecho")],
      [],
    );

    expect(rows[0]).toMatchObject({ verdict: "no_data", comparedExerciseCount: 0, bestLift: null });
  });

  // A short dose is a statement about the input, which needs no trend data.
  it("still reports under_stimulus with nothing to compare when sets are below the floor", () => {
    const rows = buildMuscleProgressRows(
      buildView([group("pecho", 3)]),
      [buildSeriesGroup("Press de banca", "pecho")],
      [],
    );

    expect(rows[0]?.verdict).toBe("under_stimulus");
  });

  it("omits the unclassified bucket and zero-set groups", () => {
    const rows = buildMuscleProgressRows(
      buildView([
        group("sin_clasificar", 9),
        group("pecho", 0),
        group("dorsal", 12),
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
        group("dorsal", 12),
        group("biceps", 12),
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
      buildView([group("pecho", 13)]),
      [buildSeriesGroup("Ejercicio raro", null)],
      [buildImprovementRow("Ejercicio raro", { improved: true, signals: ["volume_load"] })],
    );

    expect(rows[0]).toMatchObject({ verdict: "no_data", comparedExerciseCount: 0 });
  });

  describe("bestLift", () => {
    it("prefers an improved exercise over a flat one with a bigger absolute load", () => {
      const rows = buildMuscleProgressRows(
        buildView([group("pecho", 13)]),
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
        buildView([group("pecho", 13)]),
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
        buildView([group("pecho", 13)]),
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
        group("pecho", 13),
        group("dorsal", 13),
        group("cuadriceps", 26),
        group("biceps", 12),
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
      buildView([group("pecho", 13)]),
      [buildSeriesGroup("Press de banca", "pecho"), buildSeriesGroup("Aperturas", "pecho")],
      [
        buildImprovementRow("Press de banca", { latestMaxPain: 1 }),
        buildImprovementRow("Aperturas", { latestMaxPain: 4 }),
      ],
    );

    expect(rows[0]?.maxPainScore).toBe(4);
  });
});

describe("readEffort", () => {
  // Hypertrophy's effective range is roughly RIR 0-3: at 3 the set is leaving
  // stimulus behind, at 1 the limit is recovery rather than effort.
  it("reads at and beyond the far-from-failure threshold", () => {
    expect(readEffort(3)).toBe("far_from_failure");
    expect(readEffort(4.2)).toBe("far_from_failure");
  });

  it("reads at and below the near-failure threshold", () => {
    expect(readEffort(1)).toBe("near_failure");
    expect(readEffort(0)).toBe("near_failure");
  });

  it("reads the middle of the range as productive", () => {
    expect(readEffort(2)).toBe("productive");
    expect(readEffort(2.9)).toBe("productive");
  });

  // Distinct from RIR 0. "Not recorded" must never be read as "taken to
  // failure", which is the strongest claim the scale can make.
  it("reads a missing RIR as no reading at all", () => {
    expect(readEffort(null)).toBeNull();
  });
});

describe("buildMuscleProgressRows — effort", () => {
  it("carries the period's RIR and its reading onto the row", () => {
    const rows = buildMuscleProgressRows(
      buildView([group("pecho", 13, 3.4)]),
      [buildSeriesGroup("Press de banca", "pecho")],
      [buildImprovementRow("Press de banca")],
    );

    expect(rows[0]).toMatchObject({ verdict: "stalled", avgRir: 3.4, effort: "far_from_failure" });
  });

  it("leaves the reading null when the period recorded no RIR", () => {
    const rows = buildMuscleProgressRows(
      buildView([group("pecho", 13, null)]),
      [buildSeriesGroup("Press de banca", "pecho")],
      [buildImprovementRow("Press de banca")],
    );

    expect(rows[0]).toMatchObject({ avgRir: null, effort: null });
  });

  // Effort explains a verdict; it never overrides it. A group training far
  // from failure that is nonetheless growing is still growing.
  it("does not let the effort reading change the verdict", () => {
    const rows = buildMuscleProgressRows(
      buildView([group("pecho", 13, 4)]),
      [buildSeriesGroup("Press de banca", "pecho")],
      [buildImprovementRow("Press de banca", { improved: true, signals: ["load_at_reps"] })],
    );

    expect(rows[0]).toMatchObject({ verdict: "growing", effort: "far_from_failure" });
  });
});

describe("hasPainFlag", () => {
  // Mirrors the app's own progression gate: pain above 2 blocks aggressive
  // progression, so 2 alone must not escalate the section.
  it("is false at the threshold and true above it", () => {
    const view = buildView([group("pecho", 13)]);
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
