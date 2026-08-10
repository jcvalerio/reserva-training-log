// Weekly effective sets per muscle group — the report a hypertrophy coach
// actually reads, and the one view on /progreso that is meaningful at a single
// logged session per exercise.
//
// That property is why this is the dashboard's headline rather than a
// multi-line trend chart: with the rotation this app is used for, most
// exercises have exactly one completed instance, so a trend chart renders as a
// field of single dots while this renders correctly on week one.

import {
  regionForMuscleGroup,
  type JointLoad,
  type MuscleGroup,
} from "@/training/muscle-taxonomy";

import { startOfWeek } from "./consistency";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const WEEKS_BACK_DEFAULT = 8;

/** Secondary muscles get half credit — a remo genuinely trains bíceps, and
 *  ignoring that under-counts arm volume badly enough to prompt adding direct
 *  arm work that isn't needed. */
const SECONDARY_SET_CREDIT = 0.5;

/** The app's own threshold: above 2, aggressive progression is blocked.
 *  See docs/product/progression-rules.md. */
const PAIN_THRESHOLD = 2;

/** A known exercise with no muscle group (cardio) contributes nothing and is
 *  not "unclassified"; only a genuinely unresolved exercise lands here. */
export const UNCLASSIFIED_BUCKET = "sin_clasificar";

export type MuscleVolumeBucket = MuscleGroup | typeof UNCLASSIFIED_BUCKET;

export type VolumeSetInput = {
  setNumber: number;
  side: "bilateral" | "left" | "right";
  painScore: number;
};

export type VolumeExerciseInstance = {
  exerciseNameEs: string;
  completedAt: Date | null;
  phase: "warmup" | "main" | "accessory" | "mobility";
  prescriptionType: "strength" | "duration";
  isUnilateral: boolean;
  /** Resolved by the caller through the catalog link or the name fallback. */
  primaryMuscleGroup: MuscleGroup | null;
  secondaryMuscleGroups: MuscleGroup[];
  jointLoads: JointLoad[];
  /** True when the exercise is known but trains no group (cardio). */
  isClassified: boolean;
  sets: VolumeSetInput[];
};

export type MuscleGroupVolume = {
  muscleGroup: MuscleVolumeBucket;
  effectiveSets: number;
};

export type WeeklyMuscleVolume = {
  /** Identical Date to ConsistencySummary.weeks[i].weekStartDate. */
  weekStartDate: Date;
  byMuscleGroup: MuscleGroupVolume[];
  totalEffectiveSets: number;
};

export type JointPainSummary = {
  jointLoad: JointLoad;
  maxPainScore: number;
  /** Sets logged above the app's own >2 threshold. */
  setsAboveThreshold: number;
  setCount: number;
  exerciseNamesEs: string[];
};

export type MuscleVolumeSummary = {
  /** Oldest first; the current, possibly partial, week last. */
  weeks: WeeklyMuscleVolume[];
  currentWeek: WeeklyMuscleVolume;
  /**
   * The week before currentWeek. Null when the window is only one week long.
   *
   * Note this is the *calendar* previous week, so it is legitimately all-zero
   * when nothing was trained — callers must distinguish "trained less" from
   * "no baseline to compare against" rather than rendering a triumphant +N
   * against an empty week.
   */
  previousWeek: WeeklyMuscleVolume | null;
  /** Names of exercises whose classification could not be resolved at all. */
  unclassifiedExerciseNames: string[];
  /** Null when either side is zero — a ratio against nothing is not a ratio. */
  pushPullRatio: number | null;
  quadHamstringRatio: number | null;
  painByJoint: JointPainSummary[];
};

/**
 * Whether a logged instance contributes to hypertrophy volume.
 *
 * Two clauses, and the second is subtler than it looks. Excluding warmups is
 * obvious. Excluding `mobility` as well would be WRONG: seeded-plan.ts ships
 * `["Face pull", "mobility", ...]` with a rep range — mobility-phase but
 * strength-type — so dropping it would silently delete real deltoides
 * posterior volume. The strength-type clause already excludes genuine
 * stretches and holds, because those are duration-type.
 */
function countsTowardVolume(instance: VolumeExerciseInstance): boolean {
  return instance.prescriptionType === "strength" && instance.phase !== "warmup";
}

/**
 * Effective sets for one logged instance.
 *
 * NOT a distinct-setNumber count. saveSetForSession assigns
 * `setNumber = existingSets.length + 1` across the whole exerciseLog
 * regardless of side, so 3 left + 3 right yields setNumbers 1-6 and a distinct
 * count would return 6 — doubling every unilateral exercise against bilateral
 * ones, which is exactly the inflation the per-side rule exists to prevent.
 *
 * max(left, right) gives 3L+3R -> 3 (each leg received three rounds of
 * stimulus), 3L+2R -> 3 (three rounds, one side came up short), and left-only
 * 3 -> 3. Bilateral sets on a unilateral exercise (a finisher) add on top.
 */
export function effectiveSetCount(instance: VolumeExerciseInstance): number {
  if (!instance.isUnilateral) {
    return instance.sets.length;
  }
  let left = 0;
  let right = 0;
  let bilateral = 0;
  for (const set of instance.sets) {
    if (set.side === "left") left += 1;
    else if (set.side === "right") right += 1;
    else bilateral += 1;
  }
  return Math.max(left, right) + bilateral;
}

function addCredit(totals: Map<MuscleVolumeBucket, number>, bucket: MuscleVolumeBucket, amount: number): void {
  totals.set(bucket, (totals.get(bucket) ?? 0) + amount);
}

function toWeeklyVolume(weekStartDate: Date, totals: Map<MuscleVolumeBucket, number>): WeeklyMuscleVolume {
  const byMuscleGroup = [...totals.entries()]
    .map(([muscleGroup, effectiveSets]) => ({ muscleGroup, effectiveSets: round(effectiveSets) }))
    .filter((row) => row.effectiveSets > 0);
  return {
    weekStartDate,
    byMuscleGroup,
    totalEffectiveSets: round(byMuscleGroup.reduce((sum, row) => sum + row.effectiveSets, 0)),
  };
}

/** Half-set credit means totals land on .5; avoid float dust like 8.499999. */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function sumRegion(week: WeeklyMuscleVolume, region: ReturnType<typeof regionForMuscleGroup>): number {
  return week.byMuscleGroup.reduce(
    (sum, row) =>
      row.muscleGroup !== UNCLASSIFIED_BUCKET && regionForMuscleGroup(row.muscleGroup) === region
        ? sum + row.effectiveSets
        : sum,
    0,
  );
}

function setsFor(week: WeeklyMuscleVolume, muscleGroup: MuscleGroup): number {
  return week.byMuscleGroup.find((row) => row.muscleGroup === muscleGroup)?.effectiveSets ?? 0;
}

function ratio(numerator: number, denominator: number): number | null {
  return numerator > 0 && denominator > 0 ? round(numerator / denominator) : null;
}

export function buildMuscleVolumeSummary(
  instances: VolumeExerciseInstance[],
  options: { weeksBack?: number; now?: Date } = {},
): MuscleVolumeSummary {
  const weeksBack = options.weeksBack ?? WEEKS_BACK_DEFAULT;
  const now = options.now ?? new Date();

  const currentWeekStart = startOfWeek(now);
  const weekStarts: Date[] = [];
  for (let index = weeksBack - 1; index >= 0; index -= 1) {
    weekStarts.push(new Date(currentWeekStart.getTime() - index * 7 * MS_PER_DAY));
  }

  const totalsByWeekTime = new Map<number, Map<MuscleVolumeBucket, number>>();
  for (const weekStart of weekStarts) {
    totalsByWeekTime.set(weekStart.getTime(), new Map());
  }

  const unclassifiedNames = new Set<string>();
  const painByJointKey = new Map<JointLoad, JointPainSummary>();

  for (const instance of instances) {
    if (!instance.completedAt || !countsTowardVolume(instance) || instance.sets.length === 0) {
      continue;
    }
    const totals = totalsByWeekTime.get(startOfWeek(instance.completedAt).getTime());
    if (!totals) {
      continue; // outside the weeksBack window
    }

    const sets = effectiveSetCount(instance);

    if (!instance.isClassified) {
      unclassifiedNames.add(instance.exerciseNameEs);
      addCredit(totals, UNCLASSIFIED_BUCKET, sets);
    } else if (instance.primaryMuscleGroup) {
      addCredit(totals, instance.primaryMuscleGroup, sets);
      for (const secondary of instance.secondaryMuscleGroups) {
        addCredit(totals, secondary, sets * SECONDARY_SET_CREDIT);
      }
    }
    // Classified with a null primary group (cardio) contributes nothing, and
    // is deliberately not counted as unclassified.

    // Pain is aggregated across the whole window, not per week: the question
    // it answers ("has this joint been complaining?") is not a weekly one.
    for (const jointLoad of instance.jointLoads) {
      const existing = painByJointKey.get(jointLoad) ?? {
        jointLoad,
        maxPainScore: 0,
        setsAboveThreshold: 0,
        setCount: 0,
        exerciseNamesEs: [],
      };
      for (const set of instance.sets) {
        existing.maxPainScore = Math.max(existing.maxPainScore, set.painScore);
        existing.setCount += 1;
        if (set.painScore > PAIN_THRESHOLD) {
          existing.setsAboveThreshold += 1;
          if (!existing.exerciseNamesEs.includes(instance.exerciseNameEs)) {
            existing.exerciseNamesEs.push(instance.exerciseNameEs);
          }
        }
      }
      painByJointKey.set(jointLoad, existing);
    }
  }

  const weeks = weekStarts.map((weekStartDate) =>
    toWeeklyVolume(weekStartDate, totalsByWeekTime.get(weekStartDate.getTime()) ?? new Map()),
  );
  const currentWeek = weeks[weeks.length - 1]!;
  const previousWeek = weeks.length > 1 ? weeks[weeks.length - 2]! : null;

  return {
    weeks,
    currentWeek,
    previousWeek,
    unclassifiedExerciseNames: [...unclassifiedNames].sort((a, b) => a.localeCompare(b, "es")),
    pushPullRatio: ratio(sumRegion(currentWeek, "empuje"), sumRegion(currentWeek, "tiron")),
    quadHamstringRatio: ratio(setsFor(currentWeek, "cuadriceps"), setsFor(currentWeek, "femorales")),
    painByJoint: [...painByJointKey.values()]
      .filter((row) => row.maxPainScore > 0)
      .sort((a, b) => b.maxPainScore - a.maxPainScore || b.setsAboveThreshold - a.setsAboveThreshold),
  };
}
