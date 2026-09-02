/**
 * Functional capacity: the mobility / healthy-aging half of the stated goal.
 *
 * Everything here compares an athlete against **their own baseline**, never
 * against an age norm. That is a refusal, not a gap. Published norms for both
 * tests start at 60 — Rikli & Jones for the 30-second chair stand, Bohannon's
 * meta-analysis for single-leg stance — and the sources covering 40-59
 * disagree with one another. The most motivating version of this feature
 * ("you perform like someone 8 years younger") would therefore be fabricated
 * clinical reference data in an app that real people use to decide how to
 * train. First-vs-latest on their own numbers needs no such claim and is what
 * tracking actually requires.
 */

/** Same fortnightly cadence as body measurements, and the same retest window
 *  as the limb symmetry test — these are recorded in one sitting. */
export const FUNCTIONAL_RETEST_WEEKS = 8;

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

/**
 * Below this, the side-to-side balance difference is worth naming. Chosen to
 * match the 90% limb symmetry threshold so the two asymmetry readings on
 * /progreso do not use different bars for the same idea.
 */
export const BALANCE_SYMMETRY_THRESHOLD = 90;

export type FunctionalTestRecord = {
  id: string;
  testedAt: Date;
  sitToStandReps: number | null;
  balanceLeftSeconds: string | null;
  balanceRightSeconds: string | null;
};

export type FunctionalMetricTrend = {
  first: number;
  latest: number;
  /** latest - first. Positive is improvement for both metrics here. */
  delta: number;
  firstTestedAt: Date;
  latestTestedAt: Date;
};

export type BalanceSymmetry = {
  leftSeconds: number;
  rightSeconds: number;
  /** weaker / stronger * 100, one decimal. */
  indexPercent: number;
  weakerSide: "left" | "right" | null;
  belowThreshold: boolean;
};

export type FunctionalCapacitySummary = {
  testCount: number;
  lastTestedAt: Date | null;
  retestDue: boolean;
  latestSitToStandReps: number | null;
  /** null until there are two tests carrying the metric. */
  sitToStandTrend: FunctionalMetricTrend | null;
  /** Best of the two sides on the most recent test that recorded balance. */
  latestBalanceSeconds: number | null;
  balanceTrend: FunctionalMetricTrend | null;
  /** From the most recent test recording both sides. */
  balanceSymmetry: BalanceSymmetry | null;
};

function toNumber(value: string | null): number | null {
  if (value === null) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Oldest-vs-newest across every test carrying the metric, not newest-vs-
 * previous. These move on a multi-month timescale, and a fortnight-to-
 * fortnight delta is mostly measurement noise — the same reasoning the body
 * measurement trend card already states about its 8-12 week window.
 *
 * Null until two tests carry the metric: a single point is not a trend, and
 * rendering a delta of 0 would claim no change where nothing was compared.
 */
function buildTrend(
  tests: FunctionalTestRecord[],
  readValue: (test: FunctionalTestRecord) => number | null,
): FunctionalMetricTrend | null {
  const points = tests
    .map((test) => ({ testedAt: test.testedAt, value: readValue(test) }))
    .filter((point): point is { testedAt: Date; value: number } => point.value !== null)
    .sort((a, b) => a.testedAt.getTime() - b.testedAt.getTime());

  if (points.length < 2) {
    return null;
  }

  const first = points[0]!;
  const latest = points.at(-1)!;

  return {
    first: first.value,
    latest: latest.value,
    delta: Math.round((latest.value - first.value) * 10) / 10,
    firstTestedAt: first.testedAt,
    latestTestedAt: latest.testedAt,
  };
}

function buildBalanceSymmetry(test: FunctionalTestRecord | undefined): BalanceSymmetry | null {
  if (!test) {
    return null;
  }

  const left = toNumber(test.balanceLeftSeconds);
  const right = toNumber(test.balanceRightSeconds);

  if (left === null || right === null) {
    return null;
  }

  const stronger = Math.max(left, right);
  const weaker = Math.min(left, right);

  // Both sides at zero measures nothing; a ratio would be NaN rather than an
  // honest absence.
  if (stronger <= 0) {
    return null;
  }

  const indexPercent = Math.round((weaker / stronger) * 1000) / 10;

  return {
    leftSeconds: left,
    rightSeconds: right,
    indexPercent,
    weakerSide: left === right ? null : left < right ? "left" : "right",
    belowThreshold: indexPercent < BALANCE_SYMMETRY_THRESHOLD,
  };
}

export function buildFunctionalCapacitySummary(
  tests: FunctionalTestRecord[],
  options: { now: Date },
): FunctionalCapacitySummary {
  const byDateDesc = [...tests].sort((a, b) => b.testedAt.getTime() - a.testedAt.getTime());
  const lastTestedAt = byDateDesc[0]?.testedAt ?? null;

  // The most recent test that actually recorded each metric, which is not
  // necessarily the most recent test: a sitting that captured only the chair
  // stand must not blank out the balance reading from a fortnight earlier.
  const latestWithSitToStand = byDateDesc.find((test) => test.sitToStandReps !== null);
  const latestWithBalance = byDateDesc.find(
    (test) => toNumber(test.balanceLeftSeconds) !== null || toNumber(test.balanceRightSeconds) !== null,
  );

  const latestBalanceSides = latestWithBalance
    ? [toNumber(latestWithBalance.balanceLeftSeconds), toNumber(latestWithBalance.balanceRightSeconds)].filter(
        (value): value is number => value !== null,
      )
    : [];

  return {
    testCount: tests.length,
    lastTestedAt,
    retestDue:
      lastTestedAt === null ||
      options.now.getTime() - lastTestedAt.getTime() >= FUNCTIONAL_RETEST_WEEKS * MS_PER_WEEK,
    latestSitToStandReps: latestWithSitToStand?.sitToStandReps ?? null,
    sitToStandTrend: buildTrend(tests, (test) => test.sitToStandReps),
    latestBalanceSeconds: latestBalanceSides.length > 0 ? Math.max(...latestBalanceSides) : null,
    // Tracked on the better side, so a trend reflects capacity rather than
    // which leg happened to be tested first.
    balanceTrend: buildTrend(tests, (test) => {
      const sides = [toNumber(test.balanceLeftSeconds), toNumber(test.balanceRightSeconds)].filter(
        (value): value is number => value !== null,
      );
      return sides.length > 0 ? Math.max(...sides) : null;
    }),
    balanceSymmetry: buildBalanceSymmetry(
      byDateDesc.find(
        (test) =>
          toNumber(test.balanceLeftSeconds) !== null && toNumber(test.balanceRightSeconds) !== null,
      ),
    ),
  };
}
