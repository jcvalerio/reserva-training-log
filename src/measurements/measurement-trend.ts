import { calculateMeasurementGaps } from "./measurement-schema";
import type { BodyMeasurement } from "./measurement-repository";

const IMPROVEMENT_RATIO = 0.05;

export type MeasurementDelta = {
  firstValue: number;
  latestValue: number;
  deltaValue: number;
};

export type BodyMeasurementTrend = {
  measurementCount: number;
  firstMeasuredAt: Date;
  latestMeasuredAt: Date;
  bodyWeightKg: MeasurementDelta | null;
  waistCm: MeasurementDelta | null;
  chestCm: MeasurementDelta | null;
  hipsCm: MeasurementDelta | null;
  latestThighGapCm: number | null;
  latestCalfGapCm: number | null;
  // Per docs/product/progression-rules.md's "5% improvement definition":
  // latest vs the immediately preceding measurement, not first-vs-latest —
  // a different comparison window than the deltas above. null when there's
  // no previous measurement to compare against (only 1 total), distinct
  // from "did not improve" (false).
  thighGapImproved: boolean | null;
  calfGapImproved: boolean | null;
};

/**
 * Builds a first-vs-latest trend from a profile's measurement history
 * (expects newest-first, e.g. straight from getRecentBodyMeasurementsForProfile).
 * "First" means the oldest row in whatever window was fetched, not
 * necessarily the athlete's all-time first measurement.
 */
export function buildBodyMeasurementTrend(measurementsDescending: BodyMeasurement[]): BodyMeasurementTrend | null {
  if (measurementsDescending.length === 0) {
    return null;
  }

  const latest = measurementsDescending[0]!;
  const oldest = measurementsDescending[measurementsDescending.length - 1]!;

  if (!latest.measuredAt || !oldest.measuredAt) {
    return null;
  }

  const gaps = calculateMeasurementGaps(latest);
  const previous = measurementsDescending[1] ?? null;
  const previousGaps = previous ? calculateMeasurementGaps(previous) : null;

  return {
    measurementCount: measurementsDescending.length,
    firstMeasuredAt: oldest.measuredAt,
    latestMeasuredAt: latest.measuredAt,
    bodyWeightKg: buildDelta(oldest.bodyWeightKg, latest.bodyWeightKg),
    waistCm: buildDelta(oldest.waistCm, latest.waistCm),
    chestCm: buildDelta(oldest.chestCm, latest.chestCm),
    hipsCm: buildDelta(oldest.hipsCm, latest.hipsCm),
    latestThighGapCm: gaps.thighGapCm,
    latestCalfGapCm: gaps.calfGapCm,
    thighGapImproved: gapImproved(gaps.thighGapCm, previousGaps?.thighGapCm ?? null),
    calfGapImproved: gapImproved(gaps.calfGapCm, previousGaps?.calfGapCm ?? null),
  };
}

function buildDelta(firstRaw: string | null, latestRaw: string | null): MeasurementDelta | null {
  const firstValue = firstRaw === null ? null : Number(firstRaw);
  const latestValue = latestRaw === null ? null : Number(latestRaw);

  if (firstValue === null || latestValue === null) {
    return null;
  }

  return { firstValue, latestValue, deltaValue: Number((latestValue - firstValue).toFixed(2)) };
}

function gapImproved(latestGapCm: number | null, previousGapCm: number | null): boolean | null {
  if (latestGapCm === null || previousGapCm === null || previousGapCm <= 0) {
    return null;
  }
  return Math.abs(latestGapCm) <= Math.abs(previousGapCm) * (1 - IMPROVEMENT_RATIO);
}
