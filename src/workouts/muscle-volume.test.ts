import { describe, expect, it } from "vitest";

import { buildConsistencySummary } from "./consistency";
import {
  buildMuscleVolumeSummary,
  effectiveSetCount,
  UNCLASSIFIED_BUCKET,
  type VolumeExerciseInstance,
  type VolumeSetInput,
} from "./muscle-volume";
import type { CompletedSessionSummary } from "./workout-repository";

const NOW = new Date("2026-08-09T12:00:00");
const IN_WEEK = new Date("2026-08-05T12:00:00"); // Wednesday of the same week

function buildSets(count: number, side: VolumeSetInput["side"] = "bilateral", painScore = 0): VolumeSetInput[] {
  return Array.from({ length: count }, (_, index) => ({ setNumber: index + 1, side, painScore }));
}

function buildInstance(overrides: Partial<VolumeExerciseInstance> = {}): VolumeExerciseInstance {
  return {
    exerciseNameEs: "Press de pecho en máquina",
    completedAt: IN_WEEK,
    phase: "main",
    prescriptionType: "strength",
    isUnilateral: false,
    primaryMuscleGroup: "pecho",
    secondaryMuscleGroups: [],
    jointLoads: [],
    isClassified: true,
    sets: buildSets(3),
    ...overrides,
  };
}

function setsFor(summary: ReturnType<typeof buildMuscleVolumeSummary>, muscleGroup: string): number {
  return summary.currentWeek.byMuscleGroup.find((row) => row.muscleGroup === muscleGroup)?.effectiveSets ?? 0;
}

describe("effectiveSetCount", () => {
  it("counts a bilateral exercise's sets directly", () => {
    expect(effectiveSetCount(buildInstance({ sets: buildSets(3) }))).toBe(3);
  });

  it("counts 3 left + 3 right as 3, not 6", () => {
    // setNumber is assigned across the whole exerciseLog regardless of side
    // (saveSetForSession: existingSets.length + 1), so these sets carry
    // setNumbers 1-6. Counting distinct setNumbers would return 6 and double
    // every unilateral exercise against bilateral ones.
    const instance = buildInstance({
      isUnilateral: true,
      sets: [
        { setNumber: 1, side: "left", painScore: 0 },
        { setNumber: 2, side: "right", painScore: 0 },
        { setNumber: 3, side: "left", painScore: 0 },
        { setNumber: 4, side: "right", painScore: 0 },
        { setNumber: 5, side: "left", painScore: 0 },
        { setNumber: 6, side: "right", painScore: 0 },
      ],
    });
    expect(effectiveSetCount(instance)).toBe(3);
  });

  it("credits the rounds performed when one side comes up short", () => {
    const instance = buildInstance({
      isUnilateral: true,
      sets: [...buildSets(3, "left"), ...buildSets(2, "right")],
    });
    expect(effectiveSetCount(instance)).toBe(3);
  });

  it("counts a single-side-only exercise once per set", () => {
    expect(effectiveSetCount(buildInstance({ isUnilateral: true, sets: buildSets(3, "left") }))).toBe(3);
  });

  it("adds bilateral sets on top of per-side rounds", () => {
    const instance = buildInstance({
      isUnilateral: true,
      sets: [...buildSets(3, "left"), ...buildSets(3, "right"), ...buildSets(1, "bilateral")],
    });
    expect(effectiveSetCount(instance)).toBe(4);
  });
});

describe("buildMuscleVolumeSummary — which sets count", () => {
  it("excludes warmup sets", () => {
    const summary = buildMuscleVolumeSummary([buildInstance({ phase: "warmup" })], { now: NOW });
    expect(setsFor(summary, "pecho")).toBe(0);
  });

  it("excludes duration-type work", () => {
    const summary = buildMuscleVolumeSummary([buildInstance({ prescriptionType: "duration" })], { now: NOW });
    expect(setsFor(summary, "pecho")).toBe(0);
  });

  it("INCLUDES mobility-phase strength work", () => {
    // seeded-plan.ts ships ["Face pull", "mobility", ...] with a rep range.
    // Excluding phase === "mobility" outright would silently delete real
    // deltoides posterior volume; duration-type already excludes real
    // stretches and holds.
    const summary = buildMuscleVolumeSummary(
      [
        buildInstance({
          exerciseNameEs: "Face pull",
          phase: "mobility",
          prescriptionType: "strength",
          primaryMuscleGroup: "deltoides_posterior",
        }),
      ],
      { now: NOW },
    );
    expect(setsFor(summary, "deltoides_posterior")).toBe(3);
  });

  it("ignores instances with no completedAt or no sets", () => {
    const summary = buildMuscleVolumeSummary(
      [buildInstance({ completedAt: null }), buildInstance({ sets: [] })],
      { now: NOW },
    );
    expect(summary.currentWeek.totalEffectiveSets).toBe(0);
  });

  it("ignores instances outside the window", () => {
    const summary = buildMuscleVolumeSummary(
      [buildInstance({ completedAt: new Date("2026-01-05T12:00:00") })],
      { now: NOW },
    );
    expect(summary.currentWeek.totalEffectiveSets).toBe(0);
  });
});

describe("buildMuscleVolumeSummary — credit", () => {
  it("gives the primary group full credit and secondaries half", () => {
    const summary = buildMuscleVolumeSummary(
      [buildInstance({ secondaryMuscleGroups: ["triceps", "deltoides_lateral"] })],
      { now: NOW },
    );
    expect(setsFor(summary, "pecho")).toBe(3);
    expect(setsFor(summary, "triceps")).toBe(1.5);
    expect(setsFor(summary, "deltoides_lateral")).toBe(1.5);
  });

  it("collects unresolved exercises into their own bucket, by name", () => {
    const summary = buildMuscleVolumeSummary(
      [buildInstance({ exerciseNameEs: "Máquina rara", isClassified: false, primaryMuscleGroup: null })],
      { now: NOW },
    );
    expect(setsFor(summary, UNCLASSIFIED_BUCKET)).toBe(3);
    expect(summary.unclassifiedExerciseNames).toEqual(["Máquina rara"]);
  });

  it("counts a classified cardio exercise as nothing, not as unclassified", () => {
    const summary = buildMuscleVolumeSummary(
      [buildInstance({ exerciseNameEs: "Remo 500m", isClassified: true, primaryMuscleGroup: null })],
      { now: NOW },
    );
    expect(summary.currentWeek.totalEffectiveSets).toBe(0);
    expect(summary.unclassifiedExerciseNames).toEqual([]);
  });

  it("credits a substitute to its own muscle group", () => {
    // The real dev-DB case: a calf raise substituted an incline press.
    const summary = buildMuscleVolumeSummary(
      [
        buildInstance({ exerciseNameEs: "Pantorrilla sentada unilateral", primaryMuscleGroup: "pantorrillas" }),
      ],
      { now: NOW },
    );
    expect(setsFor(summary, "pantorrillas")).toBe(3);
    expect(setsFor(summary, "pecho")).toBe(0);
  });
});

describe("buildMuscleVolumeSummary — ratios", () => {
  it("computes push:pull from derived regions", () => {
    const summary = buildMuscleVolumeSummary(
      [
        buildInstance({ primaryMuscleGroup: "pecho", sets: buildSets(6) }),
        buildInstance({ primaryMuscleGroup: "dorsal", sets: buildSets(3) }),
      ],
      { now: NOW },
    );
    expect(summary.pushPullRatio).toBe(2);
  });

  it("returns null rather than a ratio against zero", () => {
    const summary = buildMuscleVolumeSummary([buildInstance({ primaryMuscleGroup: "pecho" })], { now: NOW });
    expect(summary.pushPullRatio).toBeNull();
    expect(summary.quadHamstringRatio).toBeNull();
  });

  it("computes cuádriceps:femorales", () => {
    const summary = buildMuscleVolumeSummary(
      [
        buildInstance({ primaryMuscleGroup: "cuadriceps", sets: buildSets(8) }),
        buildInstance({ primaryMuscleGroup: "femorales", sets: buildSets(4) }),
      ],
      { now: NOW },
    );
    expect(summary.quadHamstringRatio).toBe(2);
  });
});

describe("buildMuscleVolumeSummary — pain by joint", () => {
  it("reports max pain and sets above the >2 threshold, with the exercises", () => {
    const summary = buildMuscleVolumeSummary(
      [
        buildInstance({
          exerciseNameEs: "Press de pecho en máquina",
          jointLoads: ["hombro", "codo"],
          sets: [
            { setNumber: 1, side: "bilateral", painScore: 1 },
            { setNumber: 2, side: "bilateral", painScore: 4 },
            { setNumber: 3, side: "bilateral", painScore: 3 },
          ],
        }),
      ],
      { now: NOW },
    );
    const hombro = summary.painByJoint.find((row) => row.jointLoad === "hombro");
    expect(hombro?.maxPainScore).toBe(4);
    // An average would dilute exactly the signal this app is built around.
    expect(hombro?.setsAboveThreshold).toBe(2);
    expect(hombro?.exerciseNamesEs).toEqual(["Press de pecho en máquina"]);
  });

  it("omits joints that never carried pain", () => {
    const summary = buildMuscleVolumeSummary([buildInstance({ jointLoads: ["hombro"] })], { now: NOW });
    expect(summary.painByJoint).toEqual([]);
  });
});

describe("week bucketing", () => {
  it("produces exactly the same week starts as buildConsistencySummary", () => {
    // Both charts render on /progreso. Two independent Monday implementations
    // drifting by a day would be a visible bug, so muscle-volume imports
    // startOfWeek from consistency.ts rather than reimplementing it.
    const sessions = [] as CompletedSessionSummary[];
    const consistency = buildConsistencySummary(sessions, 5, 8, NOW);
    const volume = buildMuscleVolumeSummary([], { weeksBack: 8, now: NOW });

    expect(volume.weeks.map((week) => week.weekStartDate)).toEqual(
      consistency.weeks.map((week) => week.weekStartDate),
    );
  });

  it("puts the most recent week last and exposes it as currentWeek", () => {
    const summary = buildMuscleVolumeSummary([buildInstance()], { now: NOW });
    expect(summary.currentWeek).toBe(summary.weeks[summary.weeks.length - 1]);
    expect(summary.currentWeek.totalEffectiveSets).toBe(3);
  });
});
