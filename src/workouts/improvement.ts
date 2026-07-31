import { toStrengthSetLog, type ExerciseInstance, type SetLog, type StrengthSetLog } from "./workout-repository";

export type ImprovementSignal =
  | "volume_load"
  | "pain"
  | "reps_at_load"
  | "load_at_reps"
  | "estimated_1rm"
  | "asymmetry_performance";

export type ExerciseImprovement = {
  improved: boolean;
  signals: ImprovementSignal[];
  latestVolumeLoadKg: number;
  previousVolumeLoadKg: number;
  latestMaxPain: number;
  previousMaxPain: number;
  latestAvgWeightKg: number;
  previousAvgWeightKg: number;
  latestAvgReps: number;
  previousAvgReps: number;
  // null when neither instance has a set within the rep-range Epley is
  // reliable for (see ONE_RM_MAX_REPS) — there's nothing trustworthy to show.
  latestEstimated1RmKg: number | null;
  previousEstimated1RmKg: number | null;
  // null for bilateral exercises — there's no left/right gap to track.
  latestAsymmetryGapKg: number | null;
  previousAsymmetryGapKg: number | null;
};

const IMPROVEMENT_RATIO = 0.05;
const SAME_LOAD_TOLERANCE = 0.01;
const SIMILAR_RIR_TOLERANCE = 1;

// Epley's formula degrades badly outside a low-to-moderate rep range; sets
// beyond this are excluded from the 1RM estimate entirely rather than
// silently feeding it a number nobody should trust.
const ONE_RM_MAX_REPS = 15;
// "Compatible rep ranges" (progression-rules.md): only compare two 1RM
// estimates when they were derived from a similar number of reps, so the
// two estimates carry roughly the same error margin.
const ONE_RM_REP_COMPATIBILITY_TOLERANCE = 5;

/**
 * Implements all six signals from docs/product/progression-rules.md's "5%
 * improvement definition": total volume load, pain improvement at a
 * maintained workload, reps at the same load, load at the same reps (both
 * RIR-gated), estimated 1RM (RIR-adjusted Epley, gated to compatible rep
 * ranges), and asymmetry improvement (left/right volume gap, unilateral
 * exercises only).
 */
export function computeExerciseImprovement(
  rawLatestSets: SetLog[],
  rawPreviousSets: SetLog[],
  isUnilateral: boolean,
): ExerciseImprovement {
  // Both instance-fetching call sites already scope to prescriptionType =
  // 'strength' (see getRecentExerciseInstancesByName), so this throws only
  // if that invariant is ever broken, rather than silently treating a
  // duration-type set as zero weight/reps.
  const latestSets = rawLatestSets.map(toStrengthSetLog);
  const previousSets = rawPreviousSets.map(toStrengthSetLog);

  const latestVolumeLoadKg = totalVolumeLoadKg(latestSets);
  const previousVolumeLoadKg = totalVolumeLoadKg(previousSets);
  const latestMaxPain = maxPain(latestSets);
  const previousMaxPain = maxPain(previousSets);
  const latestAvgWeightKg = average(latestSets.map((set) => Number(set.actualWeightKg)));
  const previousAvgWeightKg = average(previousSets.map((set) => Number(set.actualWeightKg)));
  const latestAvgReps = average(latestSets.map((set) => set.actualReps));
  const previousAvgReps = average(previousSets.map((set) => set.actualReps));
  const latestAvgRir = average(latestSets.map((set) => set.rir));
  const previousAvgRir = average(previousSets.map((set) => set.rir));
  const rirIsSimilar = Math.abs(latestAvgRir - previousAvgRir) <= SIMILAR_RIR_TOLERANCE;

  const latestBest1Rm = bestEstimated1Rm(latestSets);
  const previousBest1Rm = bestEstimated1Rm(previousSets);

  const latestAsymmetryGapKg = isUnilateral ? asymmetryGapKg(latestSets) : null;
  const previousAsymmetryGapKg = isUnilateral ? asymmetryGapKg(previousSets) : null;

  const signals: ImprovementSignal[] = [];

  if (
    previousVolumeLoadKg > 0 &&
    latestVolumeLoadKg >= previousVolumeLoadKg * (1 + IMPROVEMENT_RATIO) &&
    latestMaxPain <= 2
  ) {
    signals.push("volume_load");
  }

  if (previousMaxPain - latestMaxPain >= 2 && latestVolumeLoadKg >= previousVolumeLoadKg * (1 - IMPROVEMENT_RATIO)) {
    signals.push("pain");
  }

  const loadIsUnchanged =
    previousAvgWeightKg > 0 && closeEnough(latestAvgWeightKg, previousAvgWeightKg, SAME_LOAD_TOLERANCE);

  if (
    loadIsUnchanged &&
    previousAvgReps > 0 &&
    latestAvgReps >= previousAvgReps * (1 + IMPROVEMENT_RATIO) &&
    rirIsSimilar
  ) {
    signals.push("reps_at_load");
  }

  if (
    previousAvgWeightKg > 0 &&
    latestAvgWeightKg >= previousAvgWeightKg * (1 + IMPROVEMENT_RATIO) &&
    latestAvgReps >= previousAvgReps &&
    rirIsSimilar
  ) {
    signals.push("load_at_reps");
  }

  if (
    latestBest1Rm &&
    previousBest1Rm &&
    Math.abs(latestBest1Rm.actualReps - previousBest1Rm.actualReps) <= ONE_RM_REP_COMPATIBILITY_TOLERANCE &&
    previousBest1Rm.oneRmKg > 0 &&
    latestBest1Rm.oneRmKg >= previousBest1Rm.oneRmKg * (1 + IMPROVEMENT_RATIO) &&
    latestMaxPain <= 2
  ) {
    signals.push("estimated_1rm");
  }

  if (
    isUnilateral &&
    previousAsymmetryGapKg !== null &&
    latestAsymmetryGapKg !== null &&
    previousAsymmetryGapKg > 0 &&
    latestAsymmetryGapKg <= previousAsymmetryGapKg * (1 - IMPROVEMENT_RATIO) &&
    latestMaxPain <= previousMaxPain
  ) {
    signals.push("asymmetry_performance");
  }

  return {
    improved: signals.length > 0,
    signals,
    latestVolumeLoadKg,
    previousVolumeLoadKg,
    latestMaxPain,
    previousMaxPain,
    latestAvgWeightKg,
    previousAvgWeightKg,
    latestAvgReps,
    previousAvgReps,
    latestEstimated1RmKg: latestBest1Rm?.oneRmKg ?? null,
    previousEstimated1RmKg: previousBest1Rm?.oneRmKg ?? null,
    latestAsymmetryGapKg,
    previousAsymmetryGapKg,
  };
}

export type ExerciseImprovementRow = {
  exerciseNameEs: string;
  improvement: ExerciseImprovement;
  latestCompletedAt: Date | null;
};

/**
 * Builds the /progreso "Mejoras recientes" view-model: one row per exercise
 * with at least two completed instances, comparing the latest against the
 * previous one. Exercises with fewer than two instances are omitted (there's
 * nothing to compare yet). Improved exercises sort first.
 */
export function buildExerciseImprovements(instancesByName: Map<string, ExerciseInstance[]>): ExerciseImprovementRow[] {
  const rows: ExerciseImprovementRow[] = [];

  for (const [exerciseNameEs, instances] of instancesByName) {
    const [latest, previous] = instances;
    if (!latest || !previous) {
      continue;
    }

    rows.push({
      exerciseNameEs,
      improvement: computeExerciseImprovement(latest.sets, previous.sets, latest.isUnilateral),
      latestCompletedAt: latest.completedAt,
    });
  }

  return rows.sort((a, b) => {
    if (a.improvement.improved !== b.improvement.improved) {
      return a.improvement.improved ? -1 : 1;
    }
    return a.exerciseNameEs.localeCompare(b.exerciseNameEs, "es");
  });
}

function totalVolumeLoadKg(sets: StrengthSetLog[]): number {
  return sets.reduce((total, set) => total + set.actualReps * Number(set.actualWeightKg), 0);
}

function maxPain(sets: SetLog[]): number {
  return sets.length ? Math.max(...sets.map((set) => set.painScore)) : 0;
}

function average(values: number[]): number {
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;
}

function closeEnough(a: number, b: number, tolerance: number): boolean {
  return Math.abs(a - b) <= b * tolerance;
}

// RIR-adjusted Epley: treats RIR as reps left in the tank toward failure, so
// a set stopped early (high RIR) still estimates a meaningful 1RM instead of
// underestimating it the way plugging in raw actualReps would.
function estimated1RmKg(set: StrengthSetLog): number {
  const weight = Number(set.actualWeightKg);
  const effectiveReps = set.actualReps + set.rir;
  return weight * (1 + effectiveReps / 30);
}

function bestEstimated1Rm(sets: StrengthSetLog[]): { oneRmKg: number; actualReps: number } | null {
  let best: { oneRmKg: number; actualReps: number } | null = null;

  for (const set of sets) {
    if (set.actualReps > ONE_RM_MAX_REPS) {
      continue;
    }
    const oneRmKg = estimated1RmKg(set);
    if (!best || oneRmKg > best.oneRmKg) {
      best = { oneRmKg, actualReps: set.actualReps };
    }
  }

  return best;
}

function asymmetryGapKg(sets: StrengthSetLog[]): number {
  const leftVolume = totalVolumeLoadKg(sets.filter((set) => set.side === "left"));
  const rightVolume = totalVolumeLoadKg(sets.filter((set) => set.side === "right"));
  return Math.abs(leftVolume - rightVolume);
}
