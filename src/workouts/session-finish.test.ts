import { describe, expect, it } from "vitest";

import { buildFinishSummary, isExerciseComplete, type FinishExerciseInput } from "./session-finish";
import type { SetLog } from "./workout-repository";

function buildSet(overrides: Partial<SetLog> = {}): SetLog {
  return {
    id: "set-1",
    exerciseLogId: "log-1",
    setNumber: 1,
    side: "bilateral",
    actualWeightKg: "20.00",
    actualReps: 10,
    rir: 2,
    actualDurationSeconds: null,
    painScore: 0,
    painLocation: null,
    notes: null,
    completedAt: new Date("2026-08-18T12:00:00Z"),
    updatedAt: null,
    ...overrides,
  };
}

function buildExercise(overrides: Partial<FinishExerciseInput> = {}): FinishExerciseInput {
  return {
    id: "exercise-a",
    exerciseNameEs: "Prensa de piernas",
    prescriptionType: "strength",
    isUnilateral: false,
    targetSets: 3,
    loggedSets: [],
    ...overrides,
  };
}

const now = new Date("2026-08-18T13:00:00Z");

describe("isExerciseComplete", () => {
  it("counts a bilateral exercise against the plain set total", () => {
    expect(isExerciseComplete(buildExercise({ targetSets: 2, loggedSets: [buildSet()] }))).toBe(false);
    expect(
      isExerciseComplete(buildExercise({ targetSets: 2, loggedSets: [buildSet(), buildSet({ id: "s2" })] })),
    ).toBe(true);
  });

  it("requires targetSets on BOTH sides for a unilateral exercise", () => {
    const oneSideDone = buildExercise({
      isUnilateral: true,
      targetSets: 2,
      loggedSets: [buildSet({ id: "l1", side: "left" }), buildSet({ id: "l2", side: "left" })],
    });

    // Four sets in total would satisfy a bilateral read of targetSets 2 twice
    // over; the point is that they are all on one leg.
    expect(isExerciseComplete(oneSideDone)).toBe(false);
  });
});

describe("buildFinishSummary", () => {
  it("counts complete and unfinished exercises, keeping plan order", () => {
    const summary = buildFinishSummary(
      [
        buildExercise({ id: "a", exerciseNameEs: "Press banca", targetSets: 1, loggedSets: [buildSet()] }),
        buildExercise({ id: "b", exerciseNameEs: "Remo", targetSets: 3, loggedSets: [buildSet({ id: "s2" })] }),
        buildExercise({ id: "c", exerciseNameEs: "Curl", targetSets: 3 }),
      ],
      null,
      now,
    );

    expect(summary.exerciseCount).toBe(3);
    expect(summary.completedCount).toBe(1);
    expect(summary.unfinished.map((exercise) => exercise.exerciseNameEs)).toEqual(["Remo", "Curl"]);
  });

  it("reports each side separately for an unfinished unilateral exercise", () => {
    const summary = buildFinishSummary(
      [
        buildExercise({
          id: "z",
          exerciseNameEs: "Zancadas",
          isUnilateral: true,
          targetSets: 3,
          loggedSets: [
            buildSet({ id: "l1", side: "left" }),
            buildSet({ id: "l2", side: "left" }),
            buildSet({ id: "r1", side: "right" }),
            buildSet({ id: "r2", side: "right" }),
            buildSet({ id: "r3", side: "right" }),
          ],
        }),
      ],
      null,
      now,
    );

    expect(summary.unfinished[0]).toMatchObject({
      exerciseNameEs: "Zancadas",
      isUnilateral: true,
      leftCount: 2,
      rightCount: 3,
      targetSets: 3,
    });
  });

  it("sums volume across strength sets only, skipping sets with no weight or reps", () => {
    const summary = buildFinishSummary(
      [
        buildExercise({
          id: "a",
          loggedSets: [
            buildSet({ actualWeightKg: "20.00", actualReps: 10 }),
            buildSet({ id: "s2", actualWeightKg: "30.00", actualReps: 5 }),
          ],
        }),
        // A duration exercise carries no weight at all — counting it as 0kg
        // would understate rather than omit, so it must not reach the sum.
        buildExercise({
          id: "b",
          prescriptionType: "duration",
          loggedSets: [buildSet({ id: "d1", actualWeightKg: null, actualReps: null, actualDurationSeconds: 60 })],
        }),
      ],
      null,
      now,
    );

    expect(summary.totalVolumeLoadKg).toBe(350);
    // The duration set still counts as logged work, just not as volume.
    expect(summary.loggedSetCount).toBe(3);
  });

  it("measures elapsed time from startedAt, and reports null when the session never started", () => {
    const started = buildFinishSummary([], new Date("2026-08-18T12:13:00Z"), now);
    expect(started.elapsedMinutes).toBe(47);

    expect(buildFinishSummary([], null, now).elapsedMinutes).toBeNull();
  });

  it("never reports negative elapsed time if the clock disagrees with startedAt", () => {
    const summary = buildFinishSummary([], new Date("2026-08-18T13:05:00Z"), now);

    expect(summary.elapsedMinutes).toBe(0);
  });

  it("treats a session with nothing logged as fully unfinished", () => {
    const summary = buildFinishSummary([buildExercise({ id: "a" }), buildExercise({ id: "b" })], null, now);

    expect(summary.completedCount).toBe(0);
    expect(summary.unfinished).toHaveLength(2);
    expect(summary.loggedSetCount).toBe(0);
    expect(summary.totalVolumeLoadKg).toBe(0);
  });
});
