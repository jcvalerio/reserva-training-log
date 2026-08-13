import { describe, expect, it } from "vitest";

import type { ExerciseImprovementRow } from "./improvement";
import { buildSessionRecap, findPersonalRecords, type SessionRecapExercise } from "./session-recap";
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

function buildImprovementRow(overrides: Partial<ExerciseImprovementRow> = {}): ExerciseImprovementRow {
  return {
    exerciseNameEs: "Prensa de piernas",
    latestCompletedAt: new Date("2026-07-20T12:00:00Z"),
    improvement: {
      improved: true,
      signals: ["volume_load"],
      latestVolumeLoadKg: 800,
      previousVolumeLoadKg: 700,
      latestMaxPain: 0,
      previousMaxPain: 0,
      latestAvgWeightKg: 80,
      previousAvgWeightKg: 70,
      latestAvgReps: 10,
      previousAvgReps: 10,
      latestEstimated1RmKg: null,
      previousEstimated1RmKg: null,
      latestAsymmetryGapKg: null,
      previousAsymmetryGapKg: null,
    },
    ...overrides,
  };
}

const session = { startedAt: new Date("2026-07-20T11:00:00Z"), completedAt: new Date("2026-07-20T12:00:00Z") };

describe("buildSessionRecap", () => {
  it("computes duration in whole minutes from startedAt/completedAt", () => {
    const recap = buildSessionRecap([], session, []);

    expect(recap.durationMinutes).toBe(60);
  });

  it("returns a null duration when either timestamp is missing", () => {
    expect(buildSessionRecap([], { startedAt: null, completedAt: session.completedAt }, []).durationMinutes).toBeNull();
    expect(buildSessionRecap([], { startedAt: session.startedAt, completedAt: null }, []).durationMinutes).toBeNull();
  });

  it("counts every logged set regardless of exercise type", () => {
    const exercises: SessionRecapExercise[] = [
      { exerciseNameEs: "Prensa de piernas", prescriptionType: "strength", loggedSets: [buildSet(), buildSet({ setNumber: 2 })] },
      { exerciseNameEs: "Plancha", prescriptionType: "duration", loggedSets: [buildSet({ actualWeightKg: null, actualReps: null, rir: null, actualDurationSeconds: 60 })] },
    ];

    const recap = buildSessionRecap(exercises, session, []);

    expect(recap.completedSetCount).toBe(3);
  });

  it("sums volume load only across strength-type sets, ignoring duration-type exercises", () => {
    const exercises: SessionRecapExercise[] = [
      {
        exerciseNameEs: "Prensa de piernas",
        prescriptionType: "strength",
        loggedSets: [buildSet({ actualWeightKg: "80.00", actualReps: 10 })], // 800
      },
      {
        exerciseNameEs: "Plancha",
        prescriptionType: "duration",
        loggedSets: [buildSet({ actualWeightKg: null, actualReps: null, rir: null, actualDurationSeconds: 60 })],
      },
    ];

    const recap = buildSessionRecap(exercises, session, []);

    expect(recap.totalVolumeLoadKg).toBe(800);
  });

  it("counts an exercise as comparable and improved when its improvement row matches this session's name and completedAt", () => {
    const exercises: SessionRecapExercise[] = [
      { exerciseNameEs: "Prensa de piernas", prescriptionType: "strength", loggedSets: [buildSet()] },
    ];
    const improvementRows = [buildImprovementRow({ exerciseNameEs: "Prensa de piernas" })];

    const recap = buildSessionRecap(exercises, session, improvementRows);

    expect(recap.comparableCount).toBe(1);
    expect(recap.improvedCount).toBe(1);
  });

  it("excludes an improvement row for an exercise not in this session", () => {
    const exercises: SessionRecapExercise[] = [
      { exerciseNameEs: "Prensa de piernas", prescriptionType: "strength", loggedSets: [buildSet()] },
    ];
    const improvementRows = [buildImprovementRow({ exerciseNameEs: "Sentadilla" })];

    const recap = buildSessionRecap(exercises, session, improvementRows);

    expect(recap.comparableCount).toBe(0);
  });

  it("excludes an improvement row whose latestCompletedAt doesn't match this session (a same-named exercise from another session)", () => {
    const exercises: SessionRecapExercise[] = [
      { exerciseNameEs: "Prensa de piernas", prescriptionType: "strength", loggedSets: [buildSet()] },
    ];
    const improvementRows = [
      buildImprovementRow({ exerciseNameEs: "Prensa de piernas", latestCompletedAt: new Date("2026-06-01T12:00:00Z") }),
    ];

    const recap = buildSessionRecap(exercises, session, improvementRows);

    expect(recap.comparableCount).toBe(0);
  });

  it("does not count a comparable-but-not-improved exercise toward improvedCount", () => {
    const exercises: SessionRecapExercise[] = [
      { exerciseNameEs: "Prensa de piernas", prescriptionType: "strength", loggedSets: [buildSet()] },
    ];
    const improvementRows = [
      buildImprovementRow({
        exerciseNameEs: "Prensa de piernas",
        improvement: { ...buildImprovementRow().improvement, improved: false, signals: [] },
      }),
    ];

    const recap = buildSessionRecap(exercises, session, improvementRows);

    expect(recap.comparableCount).toBe(1);
    expect(recap.improvedCount).toBe(0);
  });

  it("reports zero comparable exercises for a first-ever session with no improvement rows at all", () => {
    const exercises: SessionRecapExercise[] = [
      { exerciseNameEs: "Prensa de piernas", prescriptionType: "strength", loggedSets: [buildSet()] },
    ];

    const recap = buildSessionRecap(exercises, session, []);

    expect(recap.comparableCount).toBe(0);
    expect(recap.improvedCount).toBe(0);
  });

  it("defaults personalRecords to an empty array when no prior instances are passed", () => {
    const exercises: SessionRecapExercise[] = [
      { exerciseNameEs: "Prensa de piernas", prescriptionType: "strength", loggedSets: [buildSet()] },
    ];

    expect(buildSessionRecap(exercises, session, []).personalRecords).toEqual([]);
  });

  it("threads personalRecords through from findPersonalRecords when prior instances are passed", () => {
    // actualReps: 20 is past ONE_RM_MAX_REPS on every set here, so none of
    // them contribute a 1RM estimate at all — isolates this to the volume
    // signal only, matching the test's name.
    const exercises: SessionRecapExercise[] = [
      {
        exerciseNameEs: "Prensa de piernas",
        prescriptionType: "strength",
        loggedSets: [buildSet({ actualWeightKg: "45.00", actualReps: 20 })], // 900
      },
    ];
    const priorInstancesByName = new Map([
      ["Prensa de piernas", [[buildSet({ actualWeightKg: "40.00", actualReps: 20 })]]], // 800
    ]);

    const recap = buildSessionRecap(exercises, session, [], priorInstancesByName);

    expect(recap.personalRecords).toEqual([
      { exerciseNameEs: "Prensa de piernas", kind: "volume_load", valueKg: 900 },
    ]);
  });
});

describe("findPersonalRecords", () => {
  it("records a volume_load PR when this session's volume beats every prior instance", () => {
    // actualReps: 20 throughout, past ONE_RM_MAX_REPS — isolates this to the
    // volume signal only, matching the test's name.
    const exercises: SessionRecapExercise[] = [
      {
        exerciseNameEs: "Prensa de piernas",
        prescriptionType: "strength",
        loggedSets: [buildSet({ actualWeightKg: "45.00", actualReps: 20 })], // 900
      },
    ];
    const priorInstancesByName = new Map([
      [
        "Prensa de piernas",
        [
          [buildSet({ actualWeightKg: "40.00", actualReps: 20 })], // 800
          [buildSet({ actualWeightKg: "42.50", actualReps: 20 })], // 850, the true prior best
        ],
      ],
    ]);

    const records = findPersonalRecords(exercises, priorInstancesByName);

    expect(records).toEqual([{ exerciseNameEs: "Prensa de piernas", kind: "volume_load", valueKg: 900 }]);
  });

  it("does not record when this session's volume merely matches or falls short of the prior best", () => {
    const exercises: SessionRecapExercise[] = [
      {
        exerciseNameEs: "Prensa de piernas",
        prescriptionType: "strength",
        loggedSets: [buildSet({ actualWeightKg: "40.00", actualReps: 20 })], // 800
      },
    ];
    const priorInstancesByName = new Map([
      ["Prensa de piernas", [[buildSet({ actualWeightKg: "40.00", actualReps: 20 })]]], // 800, tied
    ]);

    expect(findPersonalRecords(exercises, priorInstancesByName)).toEqual([]);
  });

  it("records an estimated_1rm PR when this session's best estimate beats every prior instance's best", () => {
    const exercises: SessionRecapExercise[] = [
      {
        exerciseNameEs: "Prensa de piernas",
        prescriptionType: "strength",
        // Low volume (one single at low reps) but a high 1RM estimate —
        // deliberately not a volume record, to isolate the 1RM signal.
        loggedSets: [buildSet({ actualWeightKg: "100.00", actualReps: 3, rir: 2 })], // 100*(1+5/30) ≈ 116.7
      },
    ];
    const priorInstancesByName = new Map([
      [
        "Prensa de piernas",
        // Higher volume than this session (so this session is NOT also a
        // volume record) but past ONE_RM_MAX_REPS, so it contributes no 1RM
        // estimate at all — isolating the estimated_1rm signal cleanly.
        [[buildSet({ actualWeightKg: "50.00", actualReps: 40, rir: 0 })]], // volume 2000
      ],
    ]);

    const records = findPersonalRecords(exercises, priorInstancesByName);

    expect(records).toEqual([{ exerciseNameEs: "Prensa de piernas", kind: "estimated_1rm", valueKg: 100 * (1 + 5 / 30) }]);
  });

  it("can record both volume_load and estimated_1rm for the same exercise in the same session", () => {
    const exercises: SessionRecapExercise[] = [
      {
        exerciseNameEs: "Prensa de piernas",
        prescriptionType: "strength",
        loggedSets: [buildSet({ actualWeightKg: "90.00", actualReps: 10, rir: 2 })], // volume 900, 1RM 90*1.4=126
      },
    ];
    const priorInstancesByName = new Map([
      ["Prensa de piernas", [[buildSet({ actualWeightKg: "80.00", actualReps: 10, rir: 2 })]]], // volume 800, 1RM 80*1.4=112
    ]);

    const records = findPersonalRecords(exercises, priorInstancesByName);

    expect(records).toHaveLength(2);
    expect(records[0]).toEqual({ exerciseNameEs: "Prensa de piernas", kind: "volume_load", valueKg: 900 });
    expect(records[1]!.kind).toBe("estimated_1rm");
    expect(records[1]!.valueKg).toBeCloseTo(126, 5);
  });

  it("takes the true max across every prior instance, not just the most recent one", () => {
    const exercises: SessionRecapExercise[] = [
      {
        exerciseNameEs: "Prensa de piernas",
        prescriptionType: "strength",
        loggedSets: [buildSet({ actualWeightKg: "85.00", actualReps: 10 })], // 850
      },
    ];
    const priorInstancesByName = new Map([
      [
        "Prensa de piernas",
        [
          [buildSet({ actualWeightKg: "80.00", actualReps: 10 })], // most recent, 800 — this session beats it
          [buildSet({ actualWeightKg: "95.00", actualReps: 10 })], // older, 950 — but this session does NOT beat it
        ],
      ],
    ]);

    // A same-session-over-previous-only check would wrongly call this a
    // record; the true all-time best (950) rules it out.
    expect(findPersonalRecords(exercises, priorInstancesByName)).toEqual([]);
  });

  it("excludes an exercise with no prior instances — a first log is not a record", () => {
    const exercises: SessionRecapExercise[] = [
      { exerciseNameEs: "Prensa de piernas", prescriptionType: "strength", loggedSets: [buildSet()] },
    ];

    expect(findPersonalRecords(exercises, new Map())).toEqual([]);
  });

  it("skips duration-type exercises entirely", () => {
    const exercises: SessionRecapExercise[] = [
      {
        exerciseNameEs: "Plancha",
        prescriptionType: "duration",
        loggedSets: [buildSet({ actualWeightKg: null, actualReps: null, rir: null, actualDurationSeconds: 90 })],
      },
    ];
    const priorInstancesByName = new Map([
      ["Plancha", [[buildSet({ actualWeightKg: null, actualReps: null, rir: null, actualDurationSeconds: 60 })]]],
    ]);

    expect(findPersonalRecords(exercises, priorInstancesByName)).toEqual([]);
  });
});
