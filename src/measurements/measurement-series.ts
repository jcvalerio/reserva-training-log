import type { BodyMeasurement } from "./measurement-repository";

export type MeasurementSeriesPoint = {
  measuredAt: Date;
  bodyWeightKg: number | null;
  waistCm: number | null;
};

/**
 * Builds an ascending (oldest-first) weight/waist series for the /progreso
 * body-measurement chart, from the same newest-first list
 * getRecentBodyMeasurementsForProfile already returns. Skips rows with no
 * measuredAt — nothing to place on a time axis.
 */
export function buildMeasurementSeries(measurementsDescending: BodyMeasurement[]): MeasurementSeriesPoint[] {
  const points: MeasurementSeriesPoint[] = [];

  for (const measurement of measurementsDescending) {
    if (!measurement.measuredAt) {
      continue;
    }
    points.push({
      measuredAt: measurement.measuredAt,
      bodyWeightKg: measurement.bodyWeightKg === null ? null : Number(measurement.bodyWeightKg),
      waistCm: measurement.waistCm === null ? null : Number(measurement.waistCm),
    });
  }

  return points.sort((a, b) => a.measuredAt.getTime() - b.measuredAt.getTime());
}
