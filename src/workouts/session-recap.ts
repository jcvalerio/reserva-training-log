import type { ExerciseImprovementRow } from "./improvement";
import { totalVolumeLoadKg } from "./improvement";
import { toStrengthSetLog, type SetLog } from "./workout-repository";

export type SessionRecapExercise = {
  exerciseNameEs: string;
  prescriptionType: "strength" | "duration";
  loggedSets: SetLog[];
};

export type SessionRecapSession = {
  startedAt: Date | null;
  completedAt: Date | null;
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
};

/**
 * The post-workout recap: duration, sets, volume (all trivially available
 * from what was just logged), plus how many of this session's exercises
 * improved versus the athlete's previous instance of each — reusing
 * buildExerciseImprovements' output verbatim rather than a second
 * improvement computation. Honest by construction: every number here is
 * either a plain count/sum of what was just logged, or the same 5%
 * improvement definition already used on /progreso.
 */
export function buildSessionRecap(
  exercises: SessionRecapExercise[],
  session: SessionRecapSession,
  improvementRows: ExerciseImprovementRow[],
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

  const strengthSets = exercises
    .filter((exercise) => exercise.prescriptionType === "strength")
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
  };
}
