export type RenumberableSet = { id: string; setNumber: number };

export type SetRenumbering = { id: string; setNumber: number };

/**
 * Recomputes contiguous 1..N set numbers for the sets remaining under one
 * exerciseLog after a deletion, returning only the rows whose number actually
 * changes (so the caller can skip the write entirely when nothing moved).
 *
 * This exists because saveSetForSession derives the next set number from
 * `existingSets.length + 1`. Delete set 2 of 3 and the survivors are numbered
 * 1 and 3, so the next save computes 3 again — a duplicate set number, with
 * no unique constraint on (exerciseLogId, setNumber) to catch it. Duplicates
 * would also make `orderBy(asc(setLog.setNumber))` non-deterministic between
 * the two colliding rows, which the session runner and every progression read
 * rely on being stable.
 *
 * Note that splitPlannedAndBonusSets (progression-view.ts) classifies sets by
 * their *position* in the ordered array rather than by setNumber value, so it
 * tolerates gaps on its own — renumbering is about display correctness and
 * stable ordering, not about the planned/bonus split.
 *
 * Input is expected in the order the sets should end up in (i.e. already
 * sorted by setNumber ascending); this preserves that order rather than
 * imposing its own.
 */
export function renumberSets(sets: RenumberableSet[]): SetRenumbering[] {
  const changes: SetRenumbering[] = [];

  sets.forEach((set, index) => {
    const setNumber = index + 1;
    if (set.setNumber !== setNumber) {
      changes.push({ id: set.id, setNumber });
    }
  });

  return changes;
}
