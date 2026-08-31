import { totalVolumeLoadKg } from "./improvement";
import type { SetLog, StrengthSetLog } from "./workout-repository";

export type FinishExerciseInput = {
  id: string;
  exerciseNameEs: string;
  prescriptionType: "strength" | "duration";
  isUnilateral: boolean;
  targetSets: number;
  loggedSets: SetLog[];
};

/**
 * Deliberately carries the raw counts rather than a formatted string. Spanish
 * copy lives in the view; this module answers "how far did this exercise get",
 * which is what a test can meaningfully pin.
 */
export type UnfinishedExercise = {
  id: string;
  exerciseNameEs: string;
  targetSets: number;
} & ({ isUnilateral: false; loggedCount: number } | { isUnilateral: true; leftCount: number; rightCount: number });

export type FinishSummary = {
  exerciseCount: number;
  completedCount: number;
  /** In plan order, so tapping one lands you where you'd expect in the runner. */
  unfinished: UnfinishedExercise[];
  loggedSetCount: number;
  totalVolumeLoadKg: number;
  elapsedMinutes: number | null;
};

/**
 * A unilateral exercise's targetSets means sets per side, not a shared total
 * — completing 3 left-side sets says nothing about the right side.
 *
 * Lives here rather than in the runner because three separate readings now
 * depend on agreeing exactly: the runner's opening exercise, its progress
 * rail, and the finish screen's "te faltan" list. Two of those disagreeing
 * would show a session as finishable while the rail still showed work left.
 */
export function isExerciseComplete(exercise: {
  isUnilateral: boolean;
  targetSets: number;
  loggedSets: SetLog[];
}): boolean {
  if (!exercise.isUnilateral) {
    return exercise.loggedSets.length >= exercise.targetSets;
  }

  const leftCount = exercise.loggedSets.filter((set) => set.side === "left").length;
  const rightCount = exercise.loggedSets.filter((set) => set.side === "right").length;
  return leftCount >= exercise.targetSets && rightCount >= exercise.targetSets;
}

/**
 * What the finish screen states before you commit to ending the session.
 *
 * Deliberately NOT buildSessionRecap. That one needs two extra history
 * queries (getRecentExerciseInstancesByName, getPriorStrengthInstancesForNames)
 * to say how many exercises improved and whether anything was a record —
 * which are results, and belong to the completed summary that already renders
 * them. Pulling them forward would both duplicate the queries and spend the
 * ending's payoff before the ending. Every number here is a plain count or sum
 * of what is already loaded to run the session.
 *
 * `now` is a parameter rather than read inside, so the elapsed time is
 * testable and the function stays pure.
 */
export function buildFinishSummary(
  exercises: FinishExerciseInput[],
  startedAt: Date | null,
  now: Date,
): FinishSummary {
  const unfinished = exercises
    .filter((exercise) => !isExerciseComplete(exercise))
    .map((exercise): UnfinishedExercise => {
      if (!exercise.isUnilateral) {
        return {
          id: exercise.id,
          exerciseNameEs: exercise.exerciseNameEs,
          targetSets: exercise.targetSets,
          isUnilateral: false,
          loggedCount: exercise.loggedSets.length,
        };
      }
      return {
        id: exercise.id,
        exerciseNameEs: exercise.exerciseNameEs,
        targetSets: exercise.targetSets,
        isUnilateral: true,
        leftCount: exercise.loggedSets.filter((set) => set.side === "left").length,
        rightCount: exercise.loggedSets.filter((set) => set.side === "right").length,
      };
    });

  // Sets missing weight or reps are skipped rather than read as zero. Mid
  // session this is reachable in a way the completed recap never is — a
  // duration set carries no weight at all — and counting it as 0kg would
  // quietly understate the volume rather than omit it.
  const strengthSets = exercises
    .filter((exercise) => exercise.prescriptionType === "strength")
    .flatMap((exercise) => exercise.loggedSets)
    .filter((set): set is StrengthSetLog => set.actualWeightKg !== null && set.actualReps !== null);

  return {
    exerciseCount: exercises.length,
    completedCount: exercises.filter((exercise) => isExerciseComplete(exercise)).length,
    unfinished,
    loggedSetCount: exercises.reduce((total, exercise) => total + exercise.loggedSets.length, 0),
    totalVolumeLoadKg: totalVolumeLoadKg(strengthSets),
    elapsedMinutes: startedAt ? Math.max(0, Math.round((now.getTime() - startedAt.getTime()) / 60000)) : null,
  };
}
