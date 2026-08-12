import { describe, expect, it } from "vitest";

import { buildEffortGapSeries, buildExerciseSeries, pickDefaultExerciseName, toExerciseSeriesGroups } from "./exercise-series";
import type { ExerciseInstance, SetLog } from "./workout-repository";

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

function buildInstance(overrides: Partial<ExerciseInstance> = {}): ExerciseInstance {
  return {
    exerciseNameEs: "Prensa de piernas",
    sessionId: "session-1",
    completedAt: new Date("2026-07-20T12:00:00Z"),
    isUnilateral: false,
    primaryMuscleGroup: null,
    isClassified: false,
    substitutedForNameEs: null,
    sets: [buildSet()],
    ...overrides,
  };
}

describe("buildExerciseSeries", () => {
  it("returns points sorted oldest-first regardless of input order", () => {
    const instances: ExerciseInstance[] = [
      buildInstance({ sessionId: "latest", completedAt: new Date("2026-07-27T12:00:00Z") }),
      buildInstance({ sessionId: "oldest", completedAt: new Date("2026-07-13T12:00:00Z") }),
    ];

    const series = buildExerciseSeries(instances);

    expect(series).toHaveLength(2);
    expect(series[0]!.completedAt).toEqual(new Date("2026-07-13T12:00:00Z"));
    expect(series[1]!.completedAt).toEqual(new Date("2026-07-27T12:00:00Z"));
  });

  it("computes avg weight and total volume load per instance", () => {
    const instances: ExerciseInstance[] = [
      buildInstance({
        sets: [
          buildSet({ actualWeightKg: "80.00", actualReps: 10 }),
          buildSet({ actualWeightKg: "82.00", actualReps: 8 }),
        ],
      }),
    ];

    const series = buildExerciseSeries(instances);

    expect(series[0]!.avgWeightKg).toBe(81);
    expect(series[0]!.volumeLoadKg).toBe(80 * 10 + 82 * 8);
  });

  it("skips instances with no completedAt or no logged sets", () => {
    const instances: ExerciseInstance[] = [
      buildInstance({ completedAt: null }),
      buildInstance({ sets: [] }),
      buildInstance({ sessionId: "valid" }),
    ];

    expect(buildExerciseSeries(instances)).toHaveLength(1);
  });

  it("splits avg weight and volume by side for a unilateral instance", () => {
    const instances: ExerciseInstance[] = [
      buildInstance({
        isUnilateral: true,
        sets: [
          buildSet({ side: "left", actualWeightKg: "20.00", actualReps: 10 }),
          buildSet({ side: "left", actualWeightKg: "22.00", actualReps: 8 }),
          buildSet({ side: "right", actualWeightKg: "25.00", actualReps: 10 }),
        ],
      }),
    ];

    const [point] = buildExerciseSeries(instances);

    expect(point!.leftAvgWeightKg).toBe(21);
    expect(point!.leftVolumeLoadKg).toBe(20 * 10 + 22 * 8);
    expect(point!.rightAvgWeightKg).toBe(25);
    expect(point!.rightVolumeLoadKg).toBe(25 * 10);
  });

  it("returns null (not 0) for a side with no logged sets that instance", () => {
    const instances: ExerciseInstance[] = [
      buildInstance({ isUnilateral: true, sets: [buildSet({ side: "left" })] }),
    ];

    const [point] = buildExerciseSeries(instances);

    expect(point!.rightAvgWeightKg).toBeNull();
    expect(point!.rightVolumeLoadKg).toBeNull();
  });

  it("computes best1RmKg as the RIR-adjusted Epley estimate of the best qualifying set", () => {
    const instances: ExerciseInstance[] = [
      buildInstance({
        sets: [
          buildSet({ actualWeightKg: "80.00", actualReps: 10, rir: 2 }), // 80 * (1 + 12/30) = 112
          buildSet({ actualWeightKg: "60.00", actualReps: 5, rir: 0 }), // 60 * (1 + 5/30) = 70, not the best
        ],
      }),
    ];

    const [point] = buildExerciseSeries(instances);

    expect(point!.best1RmKg).toBe(112);
  });

  it("returns null for best1RmKg when every set falls outside the reliable rep range", () => {
    const instances: ExerciseInstance[] = [buildInstance({ sets: [buildSet({ actualReps: 20 })] })]; // past ONE_RM_MAX_REPS (15)

    const [point] = buildExerciseSeries(instances);

    expect(point!.best1RmKg).toBeNull();
  });

  it("splits best1RmKg by side for a unilateral instance, null for a side with nothing logged", () => {
    const instances: ExerciseInstance[] = [
      buildInstance({
        isUnilateral: true,
        sets: [buildSet({ side: "left", actualWeightKg: "20.00", actualReps: 10, rir: 2 })], // 20 * 1.4 = 28
      }),
    ];

    const [point] = buildExerciseSeries(instances);

    expect(point!.leftBest1RmKg).toBe(28);
    expect(point!.rightBest1RmKg).toBeNull();
  });

  it("computes avg RIR per side alongside weight/volume", () => {
    const instances: ExerciseInstance[] = [
      buildInstance({
        isUnilateral: true,
        sets: [
          buildSet({ side: "left", rir: 4 }),
          buildSet({ side: "right", rir: 0 }),
        ],
      }),
    ];

    const [point] = buildExerciseSeries(instances);

    expect(point!.leftAvgRir).toBe(4);
    expect(point!.rightAvgRir).toBe(0);
  });
});

describe("buildEffortGapSeries", () => {
  it("computes left minus right avg RIR for instances with both sides logged", () => {
    const points = buildExerciseSeries([
      buildInstance({
        isUnilateral: true,
        completedAt: new Date("2026-07-20T12:00:00Z"),
        sets: [buildSet({ side: "left", rir: 4 }), buildSet({ side: "right", rir: 0 })],
      }),
    ]);

    const gaps = buildEffortGapSeries(points);

    expect(gaps).toEqual([{ completedAt: new Date("2026-07-20T12:00:00Z"), gapRir: 4 }]);
  });

  it("excludes instances where either side has no recorded RIR", () => {
    const points = buildExerciseSeries([
      buildInstance({ isUnilateral: true, sets: [buildSet({ side: "left", rir: 4 })] }), // right missing entirely
    ]);

    expect(buildEffortGapSeries(points)).toHaveLength(0);
  });
});

describe("toExerciseSeriesGroups", () => {
  it("flattens the instances map into an alphabetically sorted (es) array", () => {
    const instancesByName = new Map([
      ["Sentadilla", [buildInstance()]],
      ["Extensión de piernas", [buildInstance()]],
    ]);

    const groups = toExerciseSeriesGroups(instancesByName);

    expect(groups.map((group) => group.exerciseNameEs)).toEqual(["Extensión de piernas", "Sentadilla"]);
  });

  it("reads isUnilateral off the first instance", () => {
    const instancesByName = new Map([["Prensa unilateral", [buildInstance({ isUnilateral: true })]]]);

    const [group] = toExerciseSeriesGroups(instancesByName);

    expect(group!.isUnilateral).toBe(true);
  });
});

describe("pickDefaultExerciseName", () => {
  it("picks the exercise whose most recent point is the most recent overall", () => {
    const groups = toExerciseSeriesGroups(
      new Map([
        ["Sentadilla", [buildInstance({ completedAt: new Date("2026-07-13T12:00:00Z") })]],
        ["Prensa de piernas", [buildInstance({ completedAt: new Date("2026-07-27T12:00:00Z") })]],
      ]),
    );

    expect(pickDefaultExerciseName(groups)).toBe("Prensa de piernas");
  });

  it("returns null for an empty array", () => {
    expect(pickDefaultExerciseName([])).toBeNull();
  });
});

describe("toExerciseSeriesGroups — exercises with no logged sets", () => {
  it("drops an exercise whose instances have no sets", () => {
    // An exerciseLog row is created the moment you open an exercise while
    // training, so starting one and logging nothing (or deleting the sets
    // afterwards) leaves a real instance with zero sets. The real data has two
    // of these; they were rendering as rows with a dash and no chart.
    const groups = toExerciseSeriesGroups(
      new Map([
        ["Prensa bilateral", [buildInstance({ sets: [] })]],
        ["Prensa unilateral", [buildInstance({ sets: [buildSet({ setNumber: 1 })] })]],
      ]),
    );

    expect(groups.map((group) => group.exerciseNameEs)).toEqual(["Prensa unilateral"]);
  });

  it("keeps pickDefaultExerciseName from selecting a set-less exercise", () => {
    const groups = toExerciseSeriesGroups(new Map([["Prensa bilateral", [buildInstance({ sets: [] })]]]));

    expect(pickDefaultExerciseName(groups)).toBeNull();
  });
});
