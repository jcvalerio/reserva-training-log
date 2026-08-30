import type { PlanBuilderExerciseInput } from "./plan-builder-schema";

export type ExistingPrescriptionRow = { id: string; exerciseNameEs: string };

export type PrescriptionWritePlan = {
  /** Existing rows to update in place, each keeping its own id. */
  updates: { id: string; exerciseInput: PlanBuilderExerciseInput; orderIndex: number }[];
  /** Submitted exercises with no existing row to claim. */
  inserts: { exerciseInput: PlanBuilderExerciseInput; orderIndex: number }[];
  /** Existing rows nothing claimed — candidates for deletion. */
  leftovers: ExistingPrescriptionRow[];
};

/**
 * Decides which existing `exercisePrescription` row each submitted exercise
 * should write to.
 *
 * The rule that matters: **identity, never position.** An earlier version
 * paired `existing[i]` with `submitted[i]`, which meant reordering two
 * exercises in the builder rewrote row A with exercise B's name, type and
 * prescription — while A's `exerciseLog` history stayed pointed at it. Since
 * `getPreviousPerformance` filters on `exercisePrescription.exerciseNameEs`,
 * the athlete then saw one exercise's history under another's name. Worse,
 * swapping a strength exercise with a duration one left a row claiming
 * "strength" while owning duration-shaped sets (null weight/reps/RIR), which
 * threw inside a client component and blanked the whole session runner.
 *
 * Rows are matched by the `prescriptionId` the form round-trips. Reordering
 * therefore changes only `orderIndex`, and an exercise keeps its history.
 *
 * Deliberately does NOT fall back to matching by name when an id is absent or
 * unknown. A blank id means "the user added this row", and a stale id means
 * the row is gone; guessing by name in either case would re-introduce exactly
 * the silent misattribution this exists to prevent. An unmatched exercise
 * becomes a fresh row with no history, which is the honest outcome.
 */
export function planPrescriptionWrites(
  existing: ExistingPrescriptionRow[],
  submitted: PlanBuilderExerciseInput[],
): PrescriptionWritePlan {
  const byId = new Map(existing.map((row) => [row.id, row]));
  const claimed = new Set<string>();

  const updates: PrescriptionWritePlan["updates"] = [];
  const inserts: PrescriptionWritePlan["inserts"] = [];

  submitted.forEach((exerciseInput, position) => {
    const orderIndex = position + 1;
    const id = exerciseInput.prescriptionId;

    // `claimed` guards the case where the same id arrives twice — a duplicated
    // row, or a hand-edited form. The first occurrence keeps the row; the
    // second becomes a new one rather than two writes racing on one id.
    if (id !== null && byId.has(id) && !claimed.has(id)) {
      claimed.add(id);
      updates.push({ id, exerciseInput, orderIndex });
      return;
    }

    inserts.push({ exerciseInput, orderIndex });
  });

  const leftovers = existing.filter((row) => !claimed.has(row.id));

  return { updates, inserts, leftovers };
}
