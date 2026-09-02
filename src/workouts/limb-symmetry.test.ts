import { describe, expect, it } from "vitest";

import {
  buildLimbSymmetrySummary,
  computeLimbSymmetry,
  LSI_FLAG_THRESHOLD,
  type LimbSymmetryTestRecord,
} from "./limb-symmetry";

const NOW = new Date("2026-09-01T12:00:00Z");

function buildTest(overrides: Partial<LimbSymmetryTestRecord> = {}): LimbSymmetryTestRecord {
  return {
    id: "test-1",
    testedAt: new Date("2026-08-25T12:00:00Z"),
    exerciseNameEs: "Prensa unilateral",
    testWeightKg: "20.00",
    leftReps: 10,
    rightReps: 10,
    ...overrides,
  };
}

describe("computeLimbSymmetry", () => {
  it("reports 100 when both sides match", () => {
    expect(computeLimbSymmetry(buildTest())).toMatchObject({
      indexPercent: 100,
      weakerSide: null,
      belowThreshold: false,
    });
  });

  it("divides weaker by stronger regardless of which side is which", () => {
    expect(computeLimbSymmetry(buildTest({ leftReps: 8, rightReps: 10 }))).toMatchObject({
      indexPercent: 80,
      weakerSide: "left",
    });
    expect(computeLimbSymmetry(buildTest({ leftReps: 10, rightReps: 8 }))).toMatchObject({
      indexPercent: 80,
      weakerSide: "right",
    });
  });

  it("flags below the 90% return-to-sport threshold and not at it", () => {
    expect(computeLimbSymmetry(buildTest({ leftReps: 9, rightReps: 10 }))?.belowThreshold).toBe(false);
    expect(computeLimbSymmetry(buildTest({ leftReps: 89, rightReps: 100 }))?.belowThreshold).toBe(true);
    expect(LSI_FLAG_THRESHOLD).toBe(90);
  });

  it("returns null rather than NaN when no reps were completed", () => {
    // Dividing by zero here would render "NaN%" as if it were a measurement.
    expect(computeLimbSymmetry(buildTest({ leftReps: 0, rightReps: 0 }))).toBeNull();
  });

  it("still measures when only one side managed a rep", () => {
    expect(computeLimbSymmetry(buildTest({ leftReps: 0, rightReps: 6 }))).toMatchObject({
      indexPercent: 0,
      weakerSide: "left",
      belowThreshold: true,
    });
  });
});

describe("buildLimbSymmetrySummary", () => {
  it("keeps only the newest test per exercise", () => {
    const summary = buildLimbSymmetrySummary(
      [
        buildTest({ id: "old", testedAt: new Date("2026-06-01T12:00:00Z"), leftReps: 6, rightReps: 10 }),
        buildTest({ id: "new", testedAt: new Date("2026-08-25T12:00:00Z"), leftReps: 9, rightReps: 10 }),
      ],
      { now: NOW },
    );

    // A gap that has since been retested is not a second finding.
    expect(summary.latestByExercise).toHaveLength(1);
    expect(summary.latestByExercise[0]!.id).toBe("new");
  });

  it("reports the worst index rather than the most recent one", () => {
    const summary = buildLimbSymmetrySummary(
      [
        buildTest({
          id: "recent-good",
          exerciseNameEs: "Curl femoral unilateral",
          testedAt: new Date("2026-08-30T12:00:00Z"),
          leftReps: 10,
          rightReps: 10,
        }),
        buildTest({
          id: "older-bad",
          exerciseNameEs: "Prensa unilateral",
          testedAt: new Date("2026-08-01T12:00:00Z"),
          leftReps: 7,
          rightReps: 10,
        }),
      ],
      { now: NOW },
    );

    expect(summary.worst?.id).toBe("older-bad");
    expect(summary.worst?.indexPercent).toBe(70);
  });

  it("treats never-tested as due", () => {
    const summary = buildLimbSymmetrySummary([], { now: NOW });
    expect(summary.retestDue).toBe(true);
    expect(summary.lastTestedAt).toBeNull();
    expect(summary.worst).toBeNull();
  });

  it("is not due within the retest window, and is due past it", () => {
    expect(
      buildLimbSymmetrySummary([buildTest({ testedAt: new Date("2026-08-25T12:00:00Z") })], { now: NOW })
        .retestDue,
    ).toBe(false);

    expect(
      buildLimbSymmetrySummary([buildTest({ testedAt: new Date("2026-06-01T12:00:00Z") })], { now: NOW })
        .retestDue,
    ).toBe(true);
  });

  it("counts an unmeasurable test as having been tested", () => {
    // It produces no index, but the athlete did the work — telling them to
    // retest a week later would be wrong.
    const summary = buildLimbSymmetrySummary(
      [buildTest({ testedAt: new Date("2026-08-25T12:00:00Z"), leftReps: 0, rightReps: 0 })],
      { now: NOW },
    );

    expect(summary.latestByExercise).toEqual([]);
    expect(summary.retestDue).toBe(false);
    expect(summary.lastTestedAt).toEqual(new Date("2026-08-25T12:00:00Z"));
  });
});
