import { suggestProgression, type ProgressionAction, type ProgressionSuggestion } from "@/training/progression";
import type { Rir } from "@/training/rir";

import { splitPlannedAndBonusSets } from "./set-split";
import { toStrengthSetLog, type SetLog } from "./set-log-view";

export type LoadMechanism = "bodyweight" | "dumbbell" | "machine" | "barbell";

const REDUCE_RATIO = 0.05;
const DUMBBELL_STEP_KG = 2;

/** A percentage range from docs/product/progression-rules.md, not a point. */
export type ProgressionBand = { low: number; high: number };

// docs/product/progression-rules.md "Suggested increase" ranges. Only applies
// to compound movements (isCompound === true) — see suggestNextWeightKg for
// the full matrix: bodyweight and any isolation movement (isCompound === false)
// get "add a rep" instead of a weight change, dumbbell gets a fixed physical
// step instead of a percentage regardless of isCompound.
//
// The whole range is recorded now, where only the conservative low end used to
// be. Collapsing a range to its floor was reasonable while any weight was
// reachable; once the achievable loads are a discrete set of discs it throws
// away every rung but one. `low` remains the target — so the conservative bias
// is unchanged, and suggestNextWeightKg still returns exactly what it always
// did — and `high` only bounds what else is allowed to win. See
// src/workouts/load-assistant.ts.
export const INCREASE_BAND_BY_MECHANISM: Partial<Record<LoadMechanism, ProgressionBand>> = {
  machine: { low: 0.05, high: 0.1 },
  barbell: { low: 0.025, high: 0.05 },
};

export const FALLBACK_INCREASE_BAND: ProgressionBand = { low: 0.05, high: 0.1 };

/** The band this exercise progresses within. Single source for both the
 *  percentage suggestion and the plate-step chooser, so the two cannot drift. */
export function increaseBandFor(loadMechanism?: LoadMechanism | null, isCompound?: boolean | null): ProgressionBand {
  return loadMechanism && isCompound === true
    ? (INCREASE_BAND_BY_MECHANISM[loadMechanism] ?? FALLBACK_INCREASE_BAND)
    : FALLBACK_INCREASE_BAND;
}

// Moved to ./set-split so workout-repository can use it without importing
// this module at runtime. Re-exported so every existing call site is unchanged.
export { splitPlannedAndBonusSets };

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
  /** See buildWeeklyLoadGuardrail. Optional: absent means "no aggregate
   *  signal", never "cleared". */
  weeklyLoadFlagged = false,
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
      // Forwarded since 2026-09-06. It was missing from the day the location
      // split shipped (2026-08-31), which made that whole rule inert in
      // production: with painLocation undefined here, every reported pain
      // failed the `!== "muscular"` test, so agujetas kept blocking
      // progression exactly like a joint flare and the neural escalation
      // below could never fire. suggestProgression was correct; nothing was
      // handing it the input it decides on.
      painLocation: set.painLocation,
      notes: set.notes,
      isBonus: bonusIds.has(set.id),
    })),
    allPlannedSetsCompleted,
    weeklyLoadFlagged,
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

  // Deliberately the band's LOW end, which is the exact value this used
  // before the band existed. Unchanged behaviour, one source.
  const ratio = increaseBandFor(loadMechanism, isCompound).low;
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
