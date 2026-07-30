import type { ExerciseInstance, SetLog } from "./workout-repository";

export type ImprovementSignal = "volume_load" | "pain";

export type ExerciseImprovement = {
  improved: boolean;
  signals: ImprovementSignal[];
  latestVolumeLoadKg: number;
  previousVolumeLoadKg: number;
  latestMaxPain: number;
  previousMaxPain: number;
};

const IMPROVEMENT_RATIO = 0.05;

/**
 * Implements two of the six signals from docs/product/progression-rules.md's
 * "5% improvement definition": total volume load, and pain improvement at a
 * maintained workload. Reps-at-load, load-at-reps, estimated 1RM, and
 * asymmetry improvement are deferred (see docs/product/next-task.md).
 */
export function computeExerciseImprovement(latestSets: SetLog[], previousSets: SetLog[]): ExerciseImprovement {
  const latestVolumeLoadKg = totalVolumeLoadKg(latestSets);
  const previousVolumeLoadKg = totalVolumeLoadKg(previousSets);
  const latestMaxPain = maxPain(latestSets);
  const previousMaxPain = maxPain(previousSets);

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

  return {
    improved: signals.length > 0,
    signals,
    latestVolumeLoadKg,
    previousVolumeLoadKg,
    latestMaxPain,
    previousMaxPain,
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
