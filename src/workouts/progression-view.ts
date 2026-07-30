import { suggestProgression, type ProgressionAction, type ProgressionSuggestion } from "@/training/progression";
import type { Rir } from "@/training/rir";

import type { SetLog } from "./workout-repository";

export type IncrementCategory = "machine_or_lower_body" | "upper_compound" | "isolation" | "dumbbell";

const FALLBACK_INCREASE_RATIO = 0.05;
const REDUCE_RATIO = 0.05;
const DUMBBELL_STEP_KG = 2;

// docs/product/progression-rules.md "Suggested increase" ranges, using the
// conservative low end of each (the suggestion is a prefilled default, never
// a rule). Isolation and dumbbell are handled separately below: isolation
// gets no weight change (the doc says "smallest available jump or add reps
// first" and this app doesn't model per-exercise minimum jumps), dumbbell
// gets a fixed physical step instead of a percentage.
const INCREASE_RATIO_BY_CATEGORY: Partial<Record<IncrementCategory, number>> = {
  machine_or_lower_body: 0.05,
  upper_compound: 0.025,
};

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

/**
 * Suggests a next weight for the "increase"/"reduce_or_modify" actions.
 * Category is optional — plans activated before incrementCategory existed
 * have `null` here, in which case this falls back to the flat +-5% used
 * before per-category suggestions were added. For "increase" on an
 * isolation exercise the weight is deliberately left unchanged: the docs
 * recommend adding a rep instead, which the caller should surface (see
 * `isRepsFirstIncrease`) rather than showing a same-weight "increase".
 */
export function suggestNextWeightKg(
  lastWeightKg: string,
  action: ProgressionAction,
  category?: IncrementCategory | null,
): string {
  const lastWeight = Number(lastWeightKg);

  if (action === "reduce_or_modify") {
    return roundToHalf(lastWeight * (1 - REDUCE_RATIO)).toFixed(2);
  }

  if (action !== "increase") {
    return lastWeight.toFixed(2);
  }

  if (category === "isolation") {
    return lastWeight.toFixed(2);
  }

  if (category === "dumbbell") {
    return roundToHalf(lastWeight + DUMBBELL_STEP_KG).toFixed(2);
  }

  const ratio = (category && INCREASE_RATIO_BY_CATEGORY[category]) ?? FALLBACK_INCREASE_RATIO;
  return roundToHalf(lastWeight * (1 + ratio)).toFixed(2);
}

/** True when the suggestion is "increase" on an isolation exercise, where the
 * app recommends adding a rep instead of more weight. */
export function isRepsFirstIncrease(action: ProgressionAction, category?: IncrementCategory | null): boolean {
  return action === "increase" && category === "isolation";
}

function roundToHalf(value: number): number {
  return Math.round(value * 2) / 2;
}
