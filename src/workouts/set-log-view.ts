import type { setLog } from "@/db/schema";

/**
 * The set-log row shape, and the one narrowing every reader does to it.
 *
 * A pure module, and that is the point rather than tidiness. `workout-repository`
 * imports `@/db` — the Neon client and the app's `env` — so anything that
 * imports a VALUE from it drags a database connection into its bundle. The
 * session runner is a client component and imported `toStrengthSetLog` through
 * `progression-view`, which put `src/db/index.ts` in the browser's import graph.
 * Next tree-shakes it in practice, but nothing enforced that, and the next
 * value pulled from that module would be the one that did not shake out.
 *
 * The schema import is type-only here, so it is erased: no runtime edge.
 * `workout-repository` re-exports all four names, so every existing call site
 * is unchanged.
 */
export type SetLog = typeof setLog.$inferSelect;

export type StrengthSetLog = SetLog & { actualWeightKg: string; actualReps: number; rir: number };

/**
 * Narrows a SetLog to its strength-type shape (non-null weight/reps/RIR).
 * Callers must only pass sets already known to be strength-type — e.g. from
 * a query filtered to prescriptionType='strength', or a
 * PreviousExercisePerformance already narrowed to the "strength" branch —
 * this throws rather than silently defaulting nulls to 0, which would
 * quietly corrupt volume-load/progression math instead of surfacing a bug.
 */
export function isStrengthSetLog(set: SetLog): set is StrengthSetLog {
  return set.actualWeightKg !== null && set.actualReps !== null && set.rir !== null;
}

export function toStrengthSetLog(set: SetLog): StrengthSetLog {
  if (!isStrengthSetLog(set)) {
    throw new Error("Expected a strength-type set (weight/reps/RIR), got a set with missing values.");
  }
  return set;
}
