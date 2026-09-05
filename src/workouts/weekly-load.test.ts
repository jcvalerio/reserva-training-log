import { describe, expect, it } from "vitest";

import type { MuscleGroup } from "@/training/muscle-taxonomy";

import { UNCLASSIFIED_BUCKET, type MuscleGroupVolume, type MuscleVolumeSummary } from "./muscle-volume";
import {
  buildWeeklyLoadGuardrail,
  WEEKLY_LOAD_MIN_COMPLETED_WEEKS,
  WEEKLY_LOAD_SPIKE_RATIO,
} from "./weekly-load";

function group(muscleGroup: string, effectiveSets: number): MuscleGroupVolume {
  return {
    muscleGroup: muscleGroup as MuscleGroupVolume["muscleGroup"],
    effectiveSets,
    avgRir: null,
    rirSetCount: 0,
  };
}

function week(weekStartDate: string, groups: MuscleGroupVolume[]) {
  return {
    weekStartDate: new Date(weekStartDate),
    byMuscleGroup: groups,
    totalEffectiveSets: groups.reduce((total, entry) => total + entry.effectiveSets, 0),
  };
}

/** Only the fields buildWeeklyLoadGuardrail reads. */
function buildSummary(weeks: ReturnType<typeof week>[]): MuscleVolumeSummary {
  return {
    weeks,
    currentWeek: weeks.at(-1)!,
    previousWeek: weeks.length > 1 ? weeks.at(-2)! : null,
    unclassifiedExerciseNames: [],
    pushPullRatio: null,
    quadHamstringRatio: null,
    painByLocation: [],
    views: [],
  } as unknown as MuscleVolumeSummary;
}

const PECHO = "pecho" as MuscleGroup;

describe("buildWeeklyLoadGuardrail — history requirements", () => {
  it("does not flag before there are enough completed weeks", () => {
    const guardrail = buildWeeklyLoadGuardrail(
      buildSummary([
        week("2026-08-10", [group("pecho", 4)]),
        week("2026-08-17", [group("pecho", 4)]),
        // Current week, a huge spike — but only two completed weeks behind it.
        week("2026-08-24", [group("pecho", 20)]),
      ]),
    );

    expect(guardrail.completedWeeksCounted).toBe(2);
    expect(guardrail.hasEnoughHistory).toBe(false);
    expect(guardrail.flaggedGroups).toEqual([]);
    // The ratio is still reported, so a caller can say "not enough history"
    // rather than "all clear" — different claims.
    expect(guardrail.statuses[0]).toMatchObject({ muscleGroup: "pecho", ratio: 5 });
  });

  it("requires exactly WEEKLY_LOAD_MIN_COMPLETED_WEEKS before firing", () => {
    expect(WEEKLY_LOAD_MIN_COMPLETED_WEEKS).toBe(3);

    const guardrail = buildWeeklyLoadGuardrail(
      buildSummary([
        week("2026-08-03", [group("pecho", 4)]),
        week("2026-08-10", [group("pecho", 4)]),
        week("2026-08-17", [group("pecho", 4)]),
        week("2026-08-24", [group("pecho", 20)]),
      ]),
    );

    expect(guardrail.hasEnoughHistory).toBe(true);
    expect(guardrail.flaggedGroups).toEqual([PECHO]);
  });

  it("does not flag a group with no trailing history at all", () => {
    // Newly added exercise. Vetoing here would punish adding an exercise
    // rather than escalating one.
    const guardrail = buildWeeklyLoadGuardrail(
      buildSummary([
        week("2026-08-03", [group("pecho", 6)]),
        week("2026-08-10", [group("pecho", 6)]),
        week("2026-08-17", [group("pecho", 6)]),
        week("2026-08-24", [group("pecho", 6), group("biceps", 9)]),
      ]),
    );

    expect(guardrail.flaggedGroups).toEqual([]);
    expect(guardrail.statuses.map((status) => status.muscleGroup)).not.toContain("biceps");
  });
});

describe("buildWeeklyLoadGuardrail — the threshold", () => {
  const history = [
    week("2026-08-03", [group("pecho", 10)]),
    week("2026-08-10", [group("pecho", 10)]),
    week("2026-08-17", [group("pecho", 10)]),
  ];

  it("does not flag at the threshold, only past it", () => {
    expect(WEEKLY_LOAD_SPIKE_RATIO).toBe(1.3);

    expect(
      buildWeeklyLoadGuardrail(buildSummary([...history, week("2026-08-24", [group("pecho", 13)])]))
        .flaggedGroups,
    ).toEqual([]);

    expect(
      buildWeeklyLoadGuardrail(buildSummary([...history, week("2026-08-24", [group("pecho", 14)])]))
        .flaggedGroups,
    ).toEqual([PECHO]);
  });

  it("does not flag a week that is running below its average", () => {
    const guardrail = buildWeeklyLoadGuardrail(
      buildSummary([...history, week("2026-08-24", [group("pecho", 3)])]),
    );

    expect(guardrail.flaggedGroups).toEqual([]);
    expect(guardrail.statuses[0]).toMatchObject({ ratio: 0.3, trailingAverageSets: 10 });
  });

  it("averages across completed weeks rather than comparing to the last one", () => {
    // 12, 0, 6 -> average 6. A rest week legitimately lowers the baseline, and
    // the literature treats a jump from a low base as the riskier case, so
    // this flagging is intended rather than a false positive.
    const guardrail = buildWeeklyLoadGuardrail(
      buildSummary([
        week("2026-08-03", [group("pecho", 12)]),
        week("2026-08-10", [group("pecho", 0)]),
        week("2026-08-17", [group("pecho", 6)]),
        week("2026-08-24", [group("pecho", 9)]),
      ]),
    );

    expect(guardrail.statuses[0]).toMatchObject({ trailingAverageSets: 6, ratio: 1.5 });
    expect(guardrail.flaggedGroups).toEqual([PECHO]);
  });

  it("sorts the worst ratio first", () => {
    const guardrail = buildWeeklyLoadGuardrail(
      buildSummary([
        week("2026-08-03", [group("pecho", 10), group("espalda", 10)]),
        week("2026-08-10", [group("pecho", 10), group("espalda", 10)]),
        week("2026-08-17", [group("pecho", 10), group("espalda", 10)]),
        week("2026-08-24", [group("pecho", 14), group("espalda", 25)]),
      ]),
    );

    expect(guardrail.statuses.map((status) => status.muscleGroup)).toEqual(["espalda", "pecho"]);
  });
});

describe("buildWeeklyLoadGuardrail — the unclassified bucket", () => {
  it("never flags it", () => {
    // Not a muscle. Flagging it would veto progression on exercises whose only
    // problem is a name the catalog does not recognise.
    const guardrail = buildWeeklyLoadGuardrail(
      buildSummary([
        week("2026-08-03", [group(UNCLASSIFIED_BUCKET, 4)]),
        week("2026-08-10", [group(UNCLASSIFIED_BUCKET, 4)]),
        week("2026-08-17", [group(UNCLASSIFIED_BUCKET, 4)]),
        week("2026-08-24", [group(UNCLASSIFIED_BUCKET, 30)]),
      ]),
    );

    expect(guardrail.flaggedGroups).toEqual([]);
    expect(guardrail.statuses).toEqual([]);
  });
});
