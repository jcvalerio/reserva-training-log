import { bestEstimated1Rm, totalVolumeLoadKg, type ExerciseImprovementRow } from "./improvement";
import { isStrengthSetLog, toStrengthSetLog, type SetLog } from "./workout-repository";

export type SessionRecapExercise = {
  exerciseNameEs: string;
  prescriptionType: "strength" | "duration";
  loggedSets: SetLog[];
};

export type SessionRecapSession = {
  startedAt: Date | null;
  completedAt: Date | null;
};

export type PersonalRecordKind = "volume_load" | "estimated_1rm";

export type PersonalRecord = {
  exerciseNameEs: string;
  kind: PersonalRecordKind;
  valueKg: number;
};

export type SessionRecap = {
  durationMinutes: number | null;
  completedSetCount: number;
  totalVolumeLoadKg: number;
  /** Exercises in this session with a prior completed instance to compare
   *  against — the honest denominator. An exercise trained for the first
   *  time has nothing to be "improved" relative to, so it's excluded rather
   *  than silently counted as not-improved. */
  comparableCount: number;
  improvedCount: number;
  personalRecords: PersonalRecord[];
};

/**
 * Whether this session beat every prior completed instance of each exercise
 * — not just the last one, the way the improvement signals above do. An
 * exercise with no prior instance at all is excluded rather than counted as
 * a record: there's nothing yet to have beaten.
 *
 * Two independent checks per exercise, not mutually exclusive — a session
 * can set a volume record, a 1RM record, both, or neither. Duration-type
 * exercises have no weight/reps and are skipped.
 */
export function findPersonalRecords(
  exercises: SessionRecapExercise[],
  priorInstancesByName: ReadonlyMap<string, SetLog[][]>,
): PersonalRecord[] {
  const records: PersonalRecord[] = [];

  for (const exercise of exercises) {
    if (exercise.prescriptionType !== "strength" || exercise.loggedSets.length === 0) {
      continue;
    }
    const priorInstances = priorInstancesByName.get(exercise.exerciseNameEs);
    if (!priorInstances || priorInstances.length === 0) {
      continue;
    }

    // Same guard as above, applied to both sides of the comparison. A record
    // claimed against history we cannot read would be meaningless even if it
    // did not throw.
    if (
      !exercise.loggedSets.every(isStrengthSetLog) ||
      !priorInstances.every((sets) => sets.every(isStrengthSetLog))
    ) {
      continue;
    }

    const currentSets = exercise.loggedSets.map(toStrengthSetLog);
    const currentVolumeLoadKg = totalVolumeLoadKg(currentSets);
    const currentBest1Rm = bestEstimated1Rm(currentSets);

    const priorBestVolumeLoadKg = Math.max(
      ...priorInstances.map((sets) => totalVolumeLoadKg(sets.map(toStrengthSetLog))),
    );
    const priorBest1RmKg = Math.max(
      0,
      ...priorInstances.map((sets) => bestEstimated1Rm(sets.map(toStrengthSetLog))?.oneRmKg ?? 0),
    );

    if (currentVolumeLoadKg > priorBestVolumeLoadKg) {
      records.push({ exerciseNameEs: exercise.exerciseNameEs, kind: "volume_load", valueKg: currentVolumeLoadKg });
    }
    if (currentBest1Rm && currentBest1Rm.oneRmKg > priorBest1RmKg) {
      records.push({ exerciseNameEs: exercise.exerciseNameEs, kind: "estimated_1rm", valueKg: currentBest1Rm.oneRmKg });
    }
  }

  return records;
}

/**
 * The post-workout recap: duration, sets, volume (all trivially available
 * from what was just logged), how many of this session's exercises improved
 * versus the athlete's previous instance of each (reusing
 * buildExerciseImprovements' output verbatim), and any all-time personal
 * records this session set. Honest by construction: every number here is
 * either a plain count/sum of what was just logged, the same 5% improvement
 * definition already used on /progreso, or a real all-time-best comparison —
 * never a claimed record without the data to back it.
 */
export function buildSessionRecap(
  exercises: SessionRecapExercise[],
  session: SessionRecapSession,
  improvementRows: ExerciseImprovementRow[],
  priorInstancesByName: ReadonlyMap<string, SetLog[][]> = new Map(),
): SessionRecap {
  const sessionExerciseNames = new Set(exercises.map((exercise) => exercise.exerciseNameEs));
  // buildExerciseImprovements is keyed by exercise name across the athlete's
  // whole history, not this session — matching by name AND by this
  // session's own completedAt confirms the "latest" instance it picked is
  // actually the one just finished, not a same-named exercise from some
  // other completed session.
  const comparable = improvementRows.filter(
    (row) =>
      sessionExerciseNames.has(row.exerciseNameEs) &&
      row.latestCompletedAt !== null &&
      session.completedAt !== null &&
      row.latestCompletedAt.getTime() === session.completedAt.getTime(),
  );

  // `prescriptionType === "strength"` does not guarantee strength-shaped sets:
  // a plan reorder used to rewrite a prescription row in place, leaving a row
  // typed "strength" owning sets logged when it was a duration exercise (see
  // plan-prescription-writes.ts). Mapping toStrengthSetLog over those threw
  // and blanked the page. An exercise we cannot read contributes no volume —
  // deliberately skipping the whole exercise rather than filtering its sets,
  // since a partial set list understates volume load while looking complete.
  const strengthSets = exercises
    .filter((exercise) => exercise.prescriptionType === "strength" && exercise.loggedSets.every(isStrengthSetLog))
    .flatMap((exercise) => exercise.loggedSets.map(toStrengthSetLog));

  return {
    durationMinutes:
      session.startedAt && session.completedAt
        ? Math.round((session.completedAt.getTime() - session.startedAt.getTime()) / 60000)
        : null,
    completedSetCount: exercises.reduce((total, exercise) => total + exercise.loggedSets.length, 0),
    totalVolumeLoadKg: totalVolumeLoadKg(strengthSets),
    comparableCount: comparable.length,
    improvedCount: comparable.filter((row) => row.improvement.improved).length,
    personalRecords: findPersonalRecords(exercises, priorInstancesByName),
  };
}
