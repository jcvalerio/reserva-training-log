import { describe, expect, it } from "vitest";

import type { ExerciseImprovementRow } from "./improvement";
import { buildSessionRecap, type SessionRecapExercise } from "./session-recap";
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
});
