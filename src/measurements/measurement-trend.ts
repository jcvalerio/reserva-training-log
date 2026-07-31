import { calculateMeasurementGaps } from "./measurement-schema";
import type { BodyMeasurement } from "./measurement-repository";

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
  latestThighGapCm: number | null;
  latestCalfGapCm: number | null;
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

  return {
    measurementCount: measurementsDescending.length,
    firstMeasuredAt: oldest.measuredAt,
    latestMeasuredAt: latest.measuredAt,
    bodyWeightKg: buildDelta(oldest.bodyWeightKg, latest.bodyWeightKg),
    waistCm: buildDelta(oldest.waistCm, latest.waistCm),
    latestThighGapCm: gaps.thighGapCm,
    latestCalfGapCm: gaps.calfGapCm,
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
