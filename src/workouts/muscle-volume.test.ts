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

function buildSets(
  count: number,
  side: VolumeSetInput["side"] = "bilateral",
  painScore = 0,
  painLocation: VolumeSetInput["painLocation"] = null,
  rir: number | null = 2,
): VolumeSetInput[] {
  return Array.from({ length: count }, (_, index) => ({ setNumber: index + 1, side, painScore, painLocation, rir }));
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
        { setNumber: 1, side: "left", painScore: 0, painLocation: null, rir: 2 },
        { setNumber: 2, side: "right", painScore: 0, painLocation: null, rir: 2 },
        { setNumber: 3, side: "left", painScore: 0, painLocation: null, rir: 2 },
        { setNumber: 4, side: "right", painScore: 0, painLocation: null, rir: 2 },
        { setNumber: 5, side: "left", painScore: 0, painLocation: null, rir: 2 },
        { setNumber: 6, side: "right", painScore: 0, painLocation: null, rir: 2 },
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

describe("buildMuscleVolumeSummary — RIR per muscle group", () => {
  function rirFor(summary: ReturnType<typeof buildMuscleVolumeSummary>, muscleGroup: string) {
    return summary.currentWeek.byMuscleGroup.find((row) => row.muscleGroup === muscleGroup) ?? null;
  }

  it("averages RIR across the group's sets", () => {
    const summary = buildMuscleVolumeSummary(
      [buildInstance({ sets: [...buildSets(2, "bilateral", 0, null, 3), ...buildSets(2, "bilateral", 0, null, 1)] })],
      { now: NOW },
    );

    expect(rirFor(summary, "pecho")).toMatchObject({ avgRir: 2, rirSetCount: 4 });
  });

  // Unlike effectiveSets, which gives secondaries half a set. How close to
  // failure the back was taken says nothing trustworthy about the biceps.
  it("credits RIR to the primary group only, never to secondaries", () => {
    const summary = buildMuscleVolumeSummary(
      [buildInstance({ primaryMuscleGroup: "dorsal", secondaryMuscleGroups: ["biceps"] })],
      { now: NOW },
    );

    expect(rirFor(summary, "dorsal")?.avgRir).toBe(2);
    expect(rirFor(summary, "biceps")).toMatchObject({ effectiveSets: 1.5, avgRir: null, rirSetCount: 0 });
  });

  // A duration-type set has no RIR. Reading null as 0 would claim it was taken
  // to failure — the strongest possible claim, from missing data.
  it("skips sets with no recorded RIR instead of counting them as zero", () => {
    const summary = buildMuscleVolumeSummary(
      [buildInstance({ sets: [...buildSets(2, "bilateral", 0, null, 4), ...buildSets(2, "bilateral", 0, null, null)] })],
      { now: NOW },
    );

    expect(rirFor(summary, "pecho")).toMatchObject({ avgRir: 4, rirSetCount: 2 });
  });

  it("reports no RIR at all when no set recorded one", () => {
    const summary = buildMuscleVolumeSummary([buildInstance({ sets: buildSets(3, "bilateral", 0, null, null) })], {
      now: NOW,
    });

    expect(rirFor(summary, "pecho")).toMatchObject({ avgRir: null, rirSetCount: 0 });
  });

  it("re-averages multi-week views by set count, not by averaging each week's average", () => {
    // Week A: 2 sets at RIR 4. Week B: 6 sets at RIR 1.
    // Averaging the two weekly means gives 2.5; weighting by sets gives 1.75.
    const summary = buildMuscleVolumeSummary(
      [
        buildInstance({
          completedAt: new Date("2026-07-22T12:00:00"),
          sets: buildSets(2, "bilateral", 0, null, 4),
        }),
        buildInstance({
          completedAt: new Date("2026-07-29T12:00:00"),
          sets: buildSets(6, "bilateral", 0, null, 1),
        }),
      ],
      { now: NOW },
    );

    const fourWeeks = summary.views.find((view) => view.key === "four_weeks");
    expect(fourWeeks?.byMuscleGroup.find((row) => row.muscleGroup === "pecho")).toMatchObject({
      avgRir: 1.75,
      rirSetCount: 8,
    });
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

describe("buildMuscleVolumeSummary — pain by location", () => {
  it("reports max pain and sets above the >2 threshold, with the exercises", () => {
    const summary = buildMuscleVolumeSummary(
      [
        buildInstance({
          exerciseNameEs: "Press de pecho en máquina",
          jointLoads: ["hombro", "codo"],
          sets: [
            { setNumber: 1, side: "bilateral", painScore: 1, painLocation: null, rir: 2 },
            { setNumber: 2, side: "bilateral", painScore: 4, painLocation: null, rir: 2 },
            { setNumber: 3, side: "bilateral", painScore: 3, painLocation: null, rir: 2 },
          ],
        }),
      ],
      { now: NOW },
    );
    const hombro = summary.painByLocation.find((row) => row.location === "hombro");
    expect(hombro?.maxPainScore).toBe(4);
    // An average would dilute exactly the signal this app is built around.
    expect(hombro?.setsAboveThreshold).toBe(2);
    expect(hombro?.exerciseNamesEs).toEqual(["Press de pecho en máquina"]);
  });

  it("omits joints that never carried pain", () => {
    const summary = buildMuscleVolumeSummary([buildInstance({ jointLoads: ["hombro"] })], { now: NOW });
    expect(summary.painByLocation).toEqual([]);
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

describe("buildMuscleVolumeSummary — period views", () => {
  // NOW is Sunday 2026-08-09, so the current (in-progress) week starts Mon 03.
  const PREV_WEEK = new Date("2026-07-29T12:00:00"); // week of Mon 27 Jul
  const OLDER_WEEK = new Date("2026-07-22T12:00:00"); // week of Mon 20 Jul

  it("offers this week, last week and two averages", () => {
    const summary = buildMuscleVolumeSummary([buildInstance()], { now: NOW });
    expect(summary.views.map((view) => view.key)).toEqual(["week", "previous_week", "four_weeks", "all_time"]);
    expect(summary.views[0]!.isAverage).toBe(false);
    expect(summary.views[1]!.isAverage).toBe(false);
    expect(summary.views[2]!.isAverage).toBe(true);
  });

  it("shows last week's real sets, not an average, on the previous-week view", () => {
    // Early in a week the current view is nearly empty; this is how you look
    // at the week you actually just finished.
    const summary = buildMuscleVolumeSummary(
      [
        buildInstance({ primaryMuscleGroup: "pecho", completedAt: PREV_WEEK, sets: buildSets(6) }),
        buildInstance({ primaryMuscleGroup: "pecho", completedAt: IN_WEEK, sets: buildSets(1) }),
      ],
      { now: NOW },
    );
    const previous = summary.views.find((view) => view.key === "previous_week")!;
    expect(previous.isAverage).toBe(false);
    expect(previous.byMuscleGroup.find((row) => row.muscleGroup === "pecho")?.effectiveSets).toBe(6);
  });

  it("gives the previous-week view its own comparison, one week further back", () => {
    const summary = buildMuscleVolumeSummary(
      [
        buildInstance({ primaryMuscleGroup: "dorsal", completedAt: PREV_WEEK, sets: buildSets(6) }),
        buildInstance({ primaryMuscleGroup: "dorsal", completedAt: OLDER_WEEK, sets: buildSets(2) }),
      ],
      { now: NOW },
    );
    const previous = summary.views.find((view) => view.key === "previous_week")!;
    expect(previous.comparison?.labelEs).toBe("la semana anterior");
    expect(previous.comparison?.byMuscleGroup.find((row) => row.muscleGroup === "dorsal")?.effectiveSets).toBe(2);
  });

  it("gives the averages no comparison at all", () => {
    // A 4-week average against "last week" would be two different units.
    const summary = buildMuscleVolumeSummary(
      [buildInstance({ completedAt: PREV_WEEK }), buildInstance({ completedAt: OLDER_WEEK })],
      { now: NOW },
    );
    expect(summary.views.find((view) => view.key === "four_weeks")!.comparison).toBeNull();
    expect(summary.views.find((view) => view.key === "all_time")!.comparison).toBeNull();
  });

  it("offers no comparison when the baseline week had no training", () => {
    const summary = buildMuscleVolumeSummary([buildInstance()], { now: NOW });
    expect(summary.views.find((view) => view.key === "week")!.comparison).toBeNull();
  });

  it("averages per week instead of totalling the period", () => {
    // The whole reason for averaging: weeklySetReferenceRange is a weekly
    // dose. On the real data cuádriceps totals 15 sets over three weeks, which
    // sits inside its 8-20 band and reads as healthy — while the truth is
    // 5/week, well under the floor. A total would launder that.
    const summary = buildMuscleVolumeSummary(
      [
        buildInstance({ primaryMuscleGroup: "cuadriceps", completedAt: PREV_WEEK, sets: buildSets(8) }),
        buildInstance({ primaryMuscleGroup: "cuadriceps", completedAt: OLDER_WEEK, sets: buildSets(4) }),
      ],
      { now: NOW },
    );
    const allTime = summary.views.find((view) => view.key === "all_time")!;
    expect(allTime.weeksCounted).toBe(2);
    expect(allTime.byMuscleGroup.find((row) => row.muscleGroup === "cuadriceps")?.effectiveSets).toBe(6);
  });

  it("excludes the in-progress week from averages", () => {
    // A Tuesday holding one session out of five must not drag the average and
    // read as a drop in performance rather than a drop in elapsed days.
    const summary = buildMuscleVolumeSummary(
      [
        buildInstance({ primaryMuscleGroup: "pecho", completedAt: PREV_WEEK, sets: buildSets(6) }),
        buildInstance({ primaryMuscleGroup: "pecho", completedAt: IN_WEEK, sets: buildSets(1) }),
      ],
      { now: NOW },
    );
    const allTime = summary.views.find((view) => view.key === "all_time")!;
    expect(allTime.weeksCounted).toBe(1);
    expect(allTime.byMuscleGroup.find((row) => row.muscleGroup === "pecho")?.effectiveSets).toBe(6);
    // ...while the current-week view still reports the live number.
    expect(summary.currentWeek.byMuscleGroup.find((row) => row.muscleGroup === "pecho")?.effectiveSets).toBe(1);
  });

  it("counts a rest week in the divisor, but never weeks before training began", () => {
    // A week off is a real reduction in weekly dose. Weeks before you ever
    // trained are not, so they must not be averaged against.
    const summary = buildMuscleVolumeSummary(
      [buildInstance({ primaryMuscleGroup: "dorsal", completedAt: OLDER_WEEK, sets: buildSets(6) })],
      { now: NOW },
    );
    // Trained the week of Mon 20 Jul, rested the week of Mon 27 Jul: two weeks
    // in the divisor, so 6 sets average to 3/week. The rest week is the point —
    // it genuinely halved the weekly dose and the average must say so.
    const allTime = summary.views.find((view) => view.key === "all_time")!;
    expect(allTime.weeksCounted).toBe(2);
    expect(allTime.byMuscleGroup.find((row) => row.muscleGroup === "dorsal")?.effectiveSets).toBe(3);
  });

  it("reports empty averages when only the current week has data", () => {
    const summary = buildMuscleVolumeSummary([buildInstance()], { now: NOW });
    expect(summary.views.find((view) => view.key === "all_time")!.weeksCounted).toBe(0);
    expect(summary.views.find((view) => view.key === "all_time")!.byMuscleGroup).toEqual([]);
  });

  it("aggregates history older than the trailing week window", () => {
    // Buckets are created on demand, so all-time is not capped at weeksBack —
    // a 2-week trailing window still sees training from six weeks ago.
    const longAgo = new Date("2026-06-24T12:00:00");
    const summary = buildMuscleVolumeSummary(
      [buildInstance({ primaryMuscleGroup: "gluteos", completedAt: longAgo, sets: buildSets(6) })],
      { now: NOW, weeksBack: 2 },
    );
    const allTime = summary.views.find((view) => view.key === "all_time")!;
    const gluteos = allTime.byMuscleGroup.find((row) => row.muscleGroup === "gluteos")?.effectiveSets ?? 0;
    expect(gluteos).toBeGreaterThan(0);
    // The idle weeks since then are counted, so the average is well under the
    // 6 sets actually performed in that one week.
    expect(allTime.weeksCounted).toBeGreaterThan(1);
    expect(gluteos).toBeLessThan(6);
  });
});

describe("pain location — reported vs inferred", () => {
  it("uses the reported location and stops hedging", () => {
    const summary = buildMuscleVolumeSummary(
      [
        buildInstance({
          // The exercise loads shoulder AND elbow, but the athlete said wrist.
          jointLoads: ["hombro", "codo"],
          sets: buildSets(2, "bilateral", 4, "muneca"),
        }),
      ],
      { now: NOW },
    );

    expect(summary.painByLocation.map((row) => row.location)).toEqual(["muneca"]);
    expect(summary.painByLocation[0]!.isInferred).toBe(false);
    // The joints the exercise happens to load are NOT blamed — that was the
    // whole failure mode the column exists to remove.
    expect(summary.painByLocation.some((row) => row.location === "hombro")).toBe(false);
  });

  it("falls back to the exercise's joints for sets logged before the column existed", () => {
    const summary = buildMuscleVolumeSummary(
      [buildInstance({ jointLoads: ["hombro", "codo"], sets: buildSets(2, "bilateral", 4, null) })],
      { now: NOW },
    );

    expect(summary.painByLocation.map((row) => row.location).sort()).toEqual(["codo", "hombro"]);
    expect(summary.painByLocation.every((row) => row.isInferred)).toBe(true);
  });

  it("lets a single reported set clear the inferred flag for that location", () => {
    // One measurement beats any number of inferences.
    const summary = buildMuscleVolumeSummary(
      [
        buildInstance({ jointLoads: ["hombro"], sets: buildSets(3, "bilateral", 3, null) }),
        buildInstance({ jointLoads: ["hombro"], sets: buildSets(1, "bilateral", 5, "hombro") }),
      ],
      { now: NOW },
    );

    const hombro = summary.painByLocation.find((row) => row.location === "hombro")!;
    expect(hombro.isInferred).toBe(false);
    expect(hombro.maxPainScore).toBe(5);
    expect(hombro.setCount).toBe(4);
  });

  it("records muscle soreness as its own location, not as a joint", () => {
    const summary = buildMuscleVolumeSummary(
      [buildInstance({ jointLoads: ["rodilla"], sets: buildSets(2, "bilateral", 3, "muscular") })],
      { now: NOW },
    );

    expect(summary.painByLocation.map((row) => row.location)).toEqual(["muscular"]);
  });

  it("ignores pain-free sets entirely", () => {
    const summary = buildMuscleVolumeSummary(
      [buildInstance({ jointLoads: ["hombro"], sets: buildSets(3, "bilateral", 0, null) })],
      { now: NOW },
    );

    expect(summary.painByLocation).toEqual([]);
  });
});
