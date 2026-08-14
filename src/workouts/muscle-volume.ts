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
  type PainLocation,
} from "@/training/muscle-taxonomy";

import { startOfWeek } from "./consistency";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const WEEKS_BACK_DEFAULT = 8;

/** Secondary muscles get half credit — a remo genuinely trains bíceps, and
 *  ignoring that under-counts arm volume badly enough to prompt adding direct
 *  arm work that isn't needed. */
const SECONDARY_SET_CREDIT = 0.5;

/** The app's own threshold: above 2, aggressive progression is blocked.
 *  See docs/product/progression-rules.md. Exported so muscle-progress.ts can
 *  escalate on the same number instead of a second hardcoded 2 drifting from
 *  this one. */
export const PAIN_THRESHOLD = 2;

/** A known exercise with no muscle group (cardio) contributes nothing and is
 *  not "unclassified"; only a genuinely unresolved exercise lands here. */
export const UNCLASSIFIED_BUCKET = "sin_clasificar";

export type MuscleVolumeBucket = MuscleGroup | typeof UNCLASSIFIED_BUCKET;

export type VolumeSetInput = {
  setNumber: number;
  side: "bilateral" | "left" | "right";
  painScore: number;
  /** Where the athlete said it hurt. Null on sets logged before the column
   *  existed, and on pain-free sets. */
  painLocation: PainLocation | null;
  /** Reps left in the tank. Null on duration-type sets, which have no RIR at
   *  all — and null must never be read as 0, which is the opposite claim
   *  ("taken to failure") rather than "not recorded". */
  rir: number | null;
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
  /**
   * Set-weighted mean RIR for this group over the period, or null when no set
   * carried one.
   *
   * Credited to the PRIMARY group only — unlike effectiveSets, which gives
   * secondary movers half a set. "How close to failure was this muscle" is not
   * inherited: a remo taken to RIR 1 says the back was near failure, and says
   * nothing trustworthy about how hard the bíceps worked.
   */
  avgRir: number | null;
  /** Sets that actually carried an RIR. Kept alongside the mean so a run of
   *  weeks can be re-averaged by weight rather than by averaging averages. */
  rirSetCount: number;
};

export type WeeklyMuscleVolume = {
  /** Identical Date to ConsistencySummary.weeks[i].weekStartDate. */
  weekStartDate: Date;
  byMuscleGroup: MuscleGroupVolume[];
  totalEffectiveSets: number;
};

export type PainLocationSummary = {
  location: PainLocation;
  maxPainScore: number;
  /** Sets logged above the app's own >2 threshold. */
  setsAboveThreshold: number;
  setCount: number;
  exerciseNamesEs: string[];
  /**
   * False when the athlete actually told us where it hurt, true when this was
   * inferred from the joints the exercise loads.
   *
   * The UI must not present the two identically. A reported location is a
   * measurement; an inferred one would happily say "hombro" for someone whose
   * wrist hurt, which is why the inferred wording has to hedge and the
   * reported wording does not.
   */
  isInferred: boolean;
};

export type VolumeViewKey = "week" | "previous_week" | "four_weeks" | "all_time";

export type VolumeView = {
  key: VolumeViewKey;
  labelEs: string;
  /**
   * Current-week sets for "week"; **average sets per week** for the
   * multi-week views.
   *
   * Never a period total. weeklySetReferenceRange is a weekly dose, so a
   * 4-week total sits ~4x above the band and reads as healthy when it is not:
   * on the real data, cuádriceps totals 15 over three weeks — comfortably
   * inside its 8-20 band — while actually averaging 5/week, well under the
   * floor. Totals launder undertraining into a passing grade.
   */
  byMuscleGroup: MuscleGroupVolume[];
  /** Completed weeks averaged over. 0 for the single-week views. */
  weeksCounted: number;
  isAverage: boolean;
  /**
   * What the ▲▼ deltas compare against, or null when no honest comparison
   * exists. Carried on the view rather than passed alongside it, so a view can
   * never be rendered against a comparison that doesn't belong to it — the
   * averages have none, because a 4-week average against "last week" would be
   * two different units.
   */
  comparison: { labelEs: string; byMuscleGroup: MuscleGroupVolume[] } | null;
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
  painByLocation: PainLocationSummary[];
  /** Current week, trailing 4 completed weeks, and all completed history. */
  views: VolumeView[];
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

/** Running RIR total per group, kept as sum+count so the mean can be taken
 *  once at the end and re-weighted when weeks are combined. */
type RirAccumulator = { sum: number; count: number };

function addRir(rirTotals: Map<MuscleVolumeBucket, RirAccumulator>, bucket: MuscleVolumeBucket, rir: number): void {
  const existing = rirTotals.get(bucket);
  if (existing) {
    existing.sum += rir;
    existing.count += 1;
  } else {
    rirTotals.set(bucket, { sum: rir, count: 1 });
  }
}

function toWeeklyVolume(
  weekStartDate: Date,
  totals: Map<MuscleVolumeBucket, number>,
  rirTotals: Map<MuscleVolumeBucket, RirAccumulator>,
): WeeklyMuscleVolume {
  const byMuscleGroup = [...totals.entries()]
    .map(([muscleGroup, effectiveSets]) => {
      const rir = rirTotals.get(muscleGroup);
      return {
        muscleGroup,
        effectiveSets: round(effectiveSets),
        avgRir: rir && rir.count > 0 ? round(rir.sum / rir.count) : null,
        rirSetCount: rir?.count ?? 0,
      };
    })
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

/**
 * Averages a run of completed weeks into sets-per-week per muscle group.
 *
 * Weeks with zero training inside the run are counted in the divisor — a week
 * off is a real reduction in weekly dose and the average should show it.
 * Weeks before any training ever happened are not in the run at all, so a new
 * athlete is never averaged against emptiness.
 */
/** A week with no training is not a baseline — comparing against it would
 *  render a triumphant "+N" for every muscle against nothing. */
function toComparison(labelEs: string, week: WeeklyMuscleVolume | null): VolumeView["comparison"] {
  return week && week.totalEffectiveSets > 0 ? { labelEs, byMuscleGroup: week.byMuscleGroup } : null;
}

function buildAverageView(key: VolumeViewKey, labelEs: string, weeks: WeeklyMuscleVolume[]): VolumeView {
  if (weeks.length === 0) {
      return { key, labelEs, byMuscleGroup: [], weeksCounted: 0, isAverage: true, comparison: null };
  }

  const totals = new Map<MuscleVolumeBucket, number>();
  // Re-weighted by set count rather than averaging each week's mean: a week
  // with one logged set must not pull the period's RIR as hard as a week with
  // twenty.
  const rirTotals = new Map<MuscleVolumeBucket, RirAccumulator>();
  for (const week of weeks) {
    for (const row of week.byMuscleGroup) {
      addCredit(totals, row.muscleGroup, row.effectiveSets);
      if (row.avgRir !== null && row.rirSetCount > 0) {
        const existing = rirTotals.get(row.muscleGroup);
        const sum = row.avgRir * row.rirSetCount;
        if (existing) {
          existing.sum += sum;
          existing.count += row.rirSetCount;
        } else {
          rirTotals.set(row.muscleGroup, { sum, count: row.rirSetCount });
        }
      }
    }
  }

  return {
    key,
    labelEs,
    byMuscleGroup: [...totals.entries()]
      .map(([muscleGroup, total]) => {
        const rir = rirTotals.get(muscleGroup);
        return {
          muscleGroup,
          effectiveSets: round(total / weeks.length),
          avgRir: rir && rir.count > 0 ? round(rir.sum / rir.count) : null,
          rirSetCount: rir?.count ?? 0,
        };
      })
      .filter((row) => row.effectiveSets > 0),
    weeksCounted: weeks.length,
    isAverage: true,
    comparison: null,
  };
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
  const rirByWeekTime = new Map<number, Map<MuscleVolumeBucket, RirAccumulator>>();
  for (const weekStart of weekStarts) {
    totalsByWeekTime.set(weekStart.getTime(), new Map());
    rirByWeekTime.set(weekStart.getTime(), new Map());
  }

  const unclassifiedNames = new Set<string>();
  const painByLocationKey = new Map<PainLocation, PainLocationSummary>();

  for (const instance of instances) {
    if (!instance.completedAt || !countsTowardVolume(instance) || instance.sets.length === 0) {
      continue;
    }
    // Buckets are created on demand rather than only for the trailing window,
    // so the all-time view can average over history older than weeksBack.
    const weekTime = startOfWeek(instance.completedAt).getTime();
    let totals = totalsByWeekTime.get(weekTime);
    if (!totals) {
      totals = new Map<MuscleVolumeBucket, number>();
      totalsByWeekTime.set(weekTime, totals);
    }
    let rirTotals = rirByWeekTime.get(weekTime);
    if (!rirTotals) {
      rirTotals = new Map<MuscleVolumeBucket, RirAccumulator>();
      rirByWeekTime.set(weekTime, rirTotals);
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
      // Primary only, and only sets that actually recorded an RIR — see
      // MuscleGroupVolume.avgRir for why a secondary mover doesn't inherit it.
      for (const set of instance.sets) {
        if (set.rir !== null) {
          addRir(rirTotals, instance.primaryMuscleGroup, set.rir);
        }
      }
    }
    // Classified with a null primary group (cardio) contributes nothing, and
    // is deliberately not counted as unclassified.

    // Pain is aggregated across the whole window, not per week: the question
    // it answers ("has this joint been complaining?") is not a weekly one.
    //
    // Per SET, not per instance, because location is now a per-set fact: the
    // same exercise can hurt the shoulder on one set and nowhere on the next.
    for (const set of instance.sets) {
      if (set.painScore <= 0) {
        continue;
      }
      // Reported location wins outright. Only when a set predates the column
      // do we fall back to blaming every joint the exercise loads.
      const locations: PainLocation[] = set.painLocation ? [set.painLocation] : instance.jointLoads;
      const isInferred = !set.painLocation;

      for (const location of locations) {
        const existing = painByLocationKey.get(location) ?? {
          location,
          maxPainScore: 0,
          setsAboveThreshold: 0,
          setCount: 0,
          exerciseNamesEs: [],
          // Sticky: once any set reported this location directly, the entry
          // stops hedging. A single measured set is better evidence than any
          // number of inferred ones.
          isInferred: true,
        };
        existing.maxPainScore = Math.max(existing.maxPainScore, set.painScore);
        existing.setCount += 1;
        if (!isInferred) {
          existing.isInferred = false;
        }
        if (set.painScore > PAIN_THRESHOLD) {
          existing.setsAboveThreshold += 1;
        }
        if (!existing.exerciseNamesEs.includes(instance.exerciseNameEs)) {
          existing.exerciseNamesEs.push(instance.exerciseNameEs);
        }
        painByLocationKey.set(location, existing);
      }
    }
  }

  const weeks = weekStarts.map((weekStartDate) =>
    toWeeklyVolume(
      weekStartDate,
      totalsByWeekTime.get(weekStartDate.getTime()) ?? new Map(),
      rirByWeekTime.get(weekStartDate.getTime()) ?? new Map(),
    ),
  );
  const currentWeek = weeks[weeks.length - 1]!;
  const previousWeek = weeks.length > 1 ? weeks[weeks.length - 2]! : null;

  // Completed weeks only, oldest first. The in-progress week is excluded from
  // every average: on a Tuesday it holds one session out of five, so counting
  // it would make the average sag early each week and recover by Sunday —
  // reading as a drop in performance when it is only a drop in elapsed days.
  const finishedWeeks = [...totalsByWeekTime.entries()]
    .filter(([weekTime]) => weekTime < currentWeekStart.getTime())
    .sort(([a], [b]) => a - b)
    .map(([weekTime, totals]) => toWeeklyVolume(new Date(weekTime), totals, rirByWeekTime.get(weekTime) ?? new Map()));

  // Start the run at the first week that actually has training. The trailing
  // window is pre-seeded with empty buckets, and weeks before an athlete ever
  // trained are not rest weeks — averaging against them would divide real work
  // by imaginary weeks. Zero weeks *after* that point are kept: a week off is
  // a genuine reduction in weekly dose and the average should show it.
  const firstTrainedIndex = finishedWeeks.findIndex((week) => week.totalEffectiveSets > 0);
  const completedWeeks = firstTrainedIndex === -1 ? [] : finishedWeeks.slice(firstTrainedIndex);

  // Two weeks back, so the "Semana pasada" view can carry its own delta
  // instead of being the one pill that silently has none.
  const weekBeforePrevious = weeks.length > 2 ? weeks[weeks.length - 3]! : null;

  const views: VolumeView[] = [
    {
      key: "week",
      labelEs: "Esta semana",
      byMuscleGroup: currentWeek.byMuscleGroup,
      weeksCounted: 0,
      isAverage: false,
      comparison: toComparison("la semana pasada", previousWeek),
    },
    {
      // Early in the week the current view is nearly empty, and the averages
      // smooth the last week away rather than showing it. This is the view for
      // "how did the week I just finished actually go?".
      key: "previous_week",
      labelEs: "Semana pasada",
      byMuscleGroup: previousWeek?.byMuscleGroup ?? [],
      weeksCounted: 0,
      isAverage: false,
      comparison: toComparison("la semana anterior", weekBeforePrevious),
    },
    buildAverageView("four_weeks", "4 semanas", completedWeeks.slice(-4)),
    buildAverageView("all_time", "Todo", completedWeeks),
  ];

  return {
    weeks,
    currentWeek,
    previousWeek,
    unclassifiedExerciseNames: [...unclassifiedNames].sort((a, b) => a.localeCompare(b, "es")),
    pushPullRatio: ratio(sumRegion(currentWeek, "empuje"), sumRegion(currentWeek, "tiron")),
    quadHamstringRatio: ratio(setsFor(currentWeek, "cuadriceps"), setsFor(currentWeek, "femorales")),
    views,
    painByLocation: [...painByLocationKey.values()].sort(
      (a, b) => b.maxPainScore - a.maxPainScore || b.setsAboveThreshold - a.setsAboveThreshold,
    ),
  };
}
