import { suggestProgression, type ProgressionAction, type ProgressionSuggestion } from "@/training/progression";
import type { Rir } from "@/training/rir";

import type { SetLog } from "./workout-repository";

const SUGGESTED_INCREMENT_RATIO = 0.05;

export function buildProgressionSuggestion(
  sets: SetLog[],
  targetRepMax: number,
  targetSets: number,
): ProgressionSuggestion {
  return suggestProgression({
    sets: sets.map((set) => ({
      actualReps: set.actualReps,
      plannedRepMax: targetRepMax,
      rir: set.rir as Rir,
      painScore: set.painScore,
      notes: set.notes,
    })),
    allPlannedSetsCompleted: sets.length >= targetSets,
  });
}

export function suggestNextWeightKg(lastWeightKg: string, action: ProgressionAction): string {
  const lastWeight = Number(lastWeightKg);

  if (action === "increase") {
    return roundToHalf(lastWeight * (1 + SUGGESTED_INCREMENT_RATIO)).toFixed(2);
  }

  if (action === "reduce_or_modify") {
    return roundToHalf(lastWeight * (1 - SUGGESTED_INCREMENT_RATIO)).toFixed(2);
  }

  return lastWeight.toFixed(2);
}

function roundToHalf(value: number): number {
  return Math.round(value * 2) / 2;
}
