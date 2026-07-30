import type { ExerciseInstance, SetLog } from "./workout-repository";

export type ImprovementSignal = "volume_load" | "pain" | "reps_at_load" | "load_at_reps";

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
};

const IMPROVEMENT_RATIO = 0.05;
const SAME_LOAD_TOLERANCE = 0.01;
const SIMILAR_RIR_TOLERANCE = 1;

/**
 * Implements four of the six signals from docs/product/progression-rules.md's
 * "5% improvement definition": total volume load, pain improvement at a
 * maintained workload, reps at the same load, and load at the same reps
 * (both RIR-gated). Estimated 1RM and asymmetry improvement are deferred
 * (see docs/product/next-task.md) — 1RM needs a formula choice and
 * asymmetry needs a left/right comparison against baselineLift that this
 * instance-level comparison doesn't model.
 */
export function computeExerciseImprovement(latestSets: SetLog[], previousSets: SetLog[]): ExerciseImprovement {
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
      improvement: computeExerciseImprovement(latest.sets, previous.sets),
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

function totalVolumeLoadKg(sets: SetLog[]): number {
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
