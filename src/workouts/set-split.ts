import type { SetLog } from "./set-log-view";

/**
 * Splits a set list (already ordered by setNumber) into the ones that count
 * toward the plan — the first targetSets per side for a unilateral exercise,
 * or the first targetSets overall otherwise — and any bonus sets logged
 * beyond that. Shared by buildProgressionSuggestion (which sets don't count
 * toward RIR/rep-range signals), the session runner (which set to anchor the
 * next suggested weight on) and getSessionRunDetails (which weight the plate
 * step is computed from).
 *
 * Its own module rather than progression-view's, because that third caller is
 * `workout-repository`, which progression-view imports from. Only a type
 * crosses the boundary here, and types are erased — so there is no runtime
 * cycle. progression-view re-exports it and every existing call site is
 * unchanged.
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
