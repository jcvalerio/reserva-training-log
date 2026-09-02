/**
 * Limb Symmetry Index, from a deliberate uncapped capacity test.
 *
 * Why this cannot be derived from ordinary logged sets, which is what the
 * original proposal assumed: the plan's unilateral rule has the strong side
 * use the same weight without exceeding the weak side's reps. That rule is
 * good training — it avoids widening a gap — but it means left and right
 * volume are equal by construction. On the real history, two of three
 * unilateral exercises came out exactly 100% symmetric, and the third's
 * apparent gap was one extra set logged at an identical load.
 *
 * The signal only exists if the strong side is allowed to run uncapped, at a
 * load both sides share. That is what limbSymmetryTest records, and it is the
 * only input here.
 */

/** Below this, the gap is worth acting on rather than noting. */
export const LSI_FLAG_THRESHOLD = 90;

/**
 * How often to retest. Matches the 8–12 week window `/progreso` already states
 * for body-composition trends: a limb gap moves on the same slow timescale, and
 * testing to failure more often than that is its own fatigue cost.
 */
export const LSI_RETEST_WEEKS = 8;

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

export type LimbSymmetryTestRecord = {
  id: string;
  testedAt: Date;
  exerciseNameEs: string;
  testWeightKg: string;
  leftReps: number;
  rightReps: number;
};

export type LimbSymmetryResult = {
  id: string;
  testedAt: Date;
  exerciseNameEs: string;
  testWeightKg: string;
  leftReps: number;
  rightReps: number;
  /** weaker / stronger * 100, rounded to one decimal. */
  indexPercent: number;
  /** Which side did fewer reps. null when they matched exactly. */
  weakerSide: "left" | "right" | null;
  /** Below LSI_FLAG_THRESHOLD. */
  belowThreshold: boolean;
};

/**
 * A test where both sides did zero reps measures nothing, and dividing by it
 * would produce NaN rather than an honest absence. Returns null instead so
 * callers render "no measurement" rather than a number.
 */
export function computeLimbSymmetry(test: LimbSymmetryTestRecord): LimbSymmetryResult | null {
  const stronger = Math.max(test.leftReps, test.rightReps);
  const weaker = Math.min(test.leftReps, test.rightReps);

  if (stronger <= 0) {
    return null;
  }

  const indexPercent = Math.round((weaker / stronger) * 1000) / 10;

  return {
    id: test.id,
    testedAt: test.testedAt,
    exerciseNameEs: test.exerciseNameEs,
    testWeightKg: test.testWeightKg,
    leftReps: test.leftReps,
    rightReps: test.rightReps,
    indexPercent,
    weakerSide: test.leftReps === test.rightReps ? null : test.leftReps < test.rightReps ? "left" : "right",
    belowThreshold: indexPercent < LSI_FLAG_THRESHOLD,
  };
}

export type LimbSymmetrySummary = {
  /** Most recent result per exercise, newest exercise-test first. */
  latestByExercise: LimbSymmetryResult[];
  /** The single worst current index across exercises, for the headline. */
  worst: LimbSymmetryResult | null;
  /** True when nothing has been tested within LSI_RETEST_WEEKS. */
  retestDue: boolean;
  /** null when nothing has ever been tested. */
  lastTestedAt: Date | null;
};

/**
 * Groups by exercise and keeps only the newest test of each, because an index
 * is a current state rather than a history — an old gap on an exercise that has
 * since been retested is not a second finding.
 *
 * Comparing across exercises is deliberate and safe here: the index is a ratio
 * of one side to the other within a single test, so it carries no load or
 * exercise units to reconcile.
 */
export function buildLimbSymmetrySummary(
  tests: LimbSymmetryTestRecord[],
  options: { now: Date },
): LimbSymmetrySummary {
  const newestByExercise = new Map<string, LimbSymmetryTestRecord>();

  for (const test of tests) {
    const existing = newestByExercise.get(test.exerciseNameEs);
    if (!existing || test.testedAt.getTime() > existing.testedAt.getTime()) {
      newestByExercise.set(test.exerciseNameEs, test);
    }
  }

  const latestByExercise = [...newestByExercise.values()]
    .map(computeLimbSymmetry)
    .filter((result): result is LimbSymmetryResult => result !== null)
    .sort((a, b) => b.testedAt.getTime() - a.testedAt.getTime());

  // The worst index, not the newest: a 78% on an exercise tested last month
  // outranks a 97% from yesterday as the thing to report.
  const worst = latestByExercise.reduce<LimbSymmetryResult | null>(
    (lowest, result) => (lowest === null || result.indexPercent < lowest.indexPercent ? result : lowest),
    null,
  );

  // Derived from every test, including ones dropped above for having no
  // measurable reps — an unusable test still means the athlete tested, and
  // nagging them to retest a week later would be wrong.
  const lastTestedAt = tests.reduce<Date | null>(
    (newest, test) => (newest === null || test.testedAt.getTime() > newest.getTime() ? test.testedAt : newest),
    null,
  );

  return {
    latestByExercise,
    worst,
    retestDue:
      lastTestedAt === null ||
      options.now.getTime() - lastTestedAt.getTime() >= LSI_RETEST_WEEKS * MS_PER_WEEK,
    lastTestedAt,
  };
}
