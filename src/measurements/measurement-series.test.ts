import { describe, expect, it } from "vitest";

import { buildMeasurementSeries } from "./measurement-series";
import type { BodyMeasurement } from "./measurement-repository";

function buildMeasurement(overrides: Partial<BodyMeasurement> = {}): BodyMeasurement {
  return {
    id: "measurement-1",
    athleteProfileId: "profile-1",
    measuredAt: new Date("2026-07-20T12:00:00Z"),
    bodyWeightKg: "80.00",
    waistCm: "88.00",
    rightThighCm: "54.00",
    leftThighCm: "56.00",
    rightCalfCm: "36.00",
    leftCalfCm: "39.00",
    rightArmCm: "34.00",
    leftArmCm: "34.00",
    notes: null,
    ...overrides,
  };
}

describe("buildMeasurementSeries", () => {
  it("returns points sorted oldest-first as numbers, regardless of input order", () => {
    const measurements = [
      buildMeasurement({ id: "latest", measuredAt: new Date("2026-07-20T12:00:00Z"), bodyWeightKg: "78.50" }),
      buildMeasurement({ id: "oldest", measuredAt: new Date("2026-06-01T12:00:00Z"), bodyWeightKg: "82.00" }),
    ];

    const series = buildMeasurementSeries(measurements);

    expect(series).toEqual([
      { measuredAt: new Date("2026-06-01T12:00:00Z"), bodyWeightKg: 82, waistCm: 88 },
      { measuredAt: new Date("2026-07-20T12:00:00Z"), bodyWeightKg: 78.5, waistCm: 88 },
    ]);
  });

  it("keeps null fields as null rather than coercing to 0", () => {
    const series = buildMeasurementSeries([buildMeasurement({ bodyWeightKg: null })]);

    expect(series[0]!.bodyWeightKg).toBeNull();
  });
});
