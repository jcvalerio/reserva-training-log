import { suggestProgression, type ProgressionAction, type ProgressionSuggestion } from "@/training/progression";
import type { Rir } from "@/training/rir";

import { toStrengthSetLog, type SetLog } from "./workout-repository";

export type LoadMechanism = "bodyweight" | "dumbbell" | "machine" | "barbell";

const FALLBACK_INCREASE_RATIO = 0.05;
const REDUCE_RATIO = 0.05;
const DUMBBELL_STEP_KG = 2;

// docs/product/progression-rules.md "Suggested increase" ranges, using the
// conservative low end of each (the suggestion is a prefilled default, never
// a rule). Only applies to compound movements (isCompound === true) — see
// suggestNextWeightKg for the full matrix: bodyweight and any isolation
// movement (isCompound === false) get "add a rep" instead of a weight change,
// dumbbell gets a fixed physical step instead of a percentage regardless of
// isCompound.
const INCREASE_RATIO_BY_MECHANISM: Partial<Record<LoadMechanism, number>> = {
  machine: 0.05,
  barbell: 0.025,
};

/**
 * Splits a set list (already ordered by setNumber) into the ones that count
 * toward the plan — the first targetSets per side for a unilateral exercise,
 * or the first targetSets overall otherwise — and any bonus sets logged
 * beyond that. Shared by buildProgressionSuggestion (which sets don't count
 * toward RIR/rep-range signals) and the session runner (which set to anchor
 * the next suggested weight on).
 */
export function splitPlannedAndBonusSets<T extends { side: SetLog["side"] }>(
  sets: T[],
  targetSets: number,
  isUnilateral: boolean,
): { planned: T[]; bonus: T[] } {
  const planned: T[] = [];
  const bonus: T[] = [];
  const countBySide = new Map<string, number>();

  for (const set of sets) {
    const key = isUnilateral ? set.side : "all";
    const positionOnKey = (countBySide.get(key) ?? 0) + 1;
    countBySide.set(key, positionOnKey);
    (positionOnKey <= targetSets ? planned : bonus).push(set);
  }

  return { planned, bonus };
}

/**
 * For a unilateral exercise, targetSets means sets per side, not a shared
 * total — completing 3 sets on one side alone shouldn't count as "all
 * planned sets completed" while the other side has none logged.
 */
export function buildProgressionSuggestion(
  sets: SetLog[],
  targetRepMax: number,
  targetSets: number,
  isUnilateral: boolean,
): ProgressionSuggestion {
  const allPlannedSetsCompleted = isUnilateral
    ? sets.filter((set) => set.side === "left").length >= targetSets &&
      sets.filter((set) => set.side === "right").length >= targetSets
    : sets.length >= targetSets;

  const { bonus } = splitPlannedAndBonusSets(sets, targetSets, isUnilateral);
  const bonusIds = new Set(bonus.map((set) => set.id));

  // Callers only pass sets from a PreviousExercisePerformance already
  // narrowed to the "strength" branch — this throws rather than silently
  // treating a null actualReps/rir as 0.
  const strengthSets = sets.map(toStrengthSetLog);

  return suggestProgression({
    sets: strengthSets.map((set) => ({
      actualReps: set.actualReps,
      plannedRepMax: targetRepMax,
      rir: set.rir as Rir,
      painScore: set.painScore,
      notes: set.notes,
      isBonus: bonusIds.has(set.id),
    })),
    allPlannedSetsCompleted,
  });
}

/**
 * Suggests a next weight for the "increase"/"reduce_or_modify" actions.
 * loadMechanism/isCompound are optional — plans activated before this
 * classification existed (or unclassified rows) have `null` here, in which
 * case this falls back to the flat +-5% used before per-category
 * suggestions were added. Dumbbell movements always get a fixed physical
 * step instead of a percentage, regardless of isCompound — the increment is
 * about available dumbbell sizes, not movement complexity, so this check
 * comes first. Otherwise, bodyweight exercises and any isolation movement
 * (isCompound === false) leave the weight unchanged: the docs recommend
 * adding a rep instead, which the caller should surface (see
 * `isRepsFirstIncrease`) rather than showing a same-weight "increase".
 */
export function suggestNextWeightKg(
  lastWeightKg: string,
  action: ProgressionAction,
  loadMechanism?: LoadMechanism | null,
  isCompound?: boolean | null,
): string {
  const lastWeight = Number(lastWeightKg);

  if (action === "reduce_or_modify") {
    return roundToHalf(lastWeight * (1 - REDUCE_RATIO)).toFixed(2);
  }

  if (action !== "increase") {
    return lastWeight.toFixed(2);
  }

  if (loadMechanism === "dumbbell") {
    return roundToHalf(lastWeight + DUMBBELL_STEP_KG).toFixed(2);
  }

  if (loadMechanism === "bodyweight" || isCompound === false) {
    return lastWeight.toFixed(2);
  }

  const ratio =
    loadMechanism && isCompound === true
      ? (INCREASE_RATIO_BY_MECHANISM[loadMechanism] ?? FALLBACK_INCREASE_RATIO)
      : FALLBACK_INCREASE_RATIO;
  return roundToHalf(lastWeight * (1 + ratio)).toFixed(2);
}

/** True when the suggestion is "increase" on a bodyweight or isolation
 * exercise, where the app recommends adding a rep instead of more weight.
 * Dumbbell always wins over isCompound — a dumbbell isolation movement (e.g.
 * a dumbbell lateral raise) still gets the fixed physical step, not a rep
 * suggestion, matching `suggestNextWeightKg`'s check order. */
export function isRepsFirstIncrease(
  action: ProgressionAction,
  loadMechanism?: LoadMechanism | null,
  isCompound?: boolean | null,
): boolean {
  return (
    action === "increase" && loadMechanism !== "dumbbell" && (loadMechanism === "bodyweight" || isCompound === false)
  );
}

function roundToHalf(value: number): number {
  return Math.round(value * 2) / 2;
}
