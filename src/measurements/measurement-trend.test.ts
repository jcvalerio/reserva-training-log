import { describe, expect, it } from "vitest";

import type { BodyMeasurement } from "./measurement-repository";
import { buildBodyMeasurementTrend } from "./measurement-trend";

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

describe("buildBodyMeasurementTrend", () => {
  it("returns null when there are no measurements", () => {
    expect(buildBodyMeasurementTrend([])).toBeNull();
  });

  it("compares the oldest and newest measurement in a newest-first list", () => {
    const measurements = [
      buildMeasurement({ id: "latest", measuredAt: new Date("2026-07-20T12:00:00Z"), bodyWeightKg: "78.50" }),
      buildMeasurement({ id: "middle", measuredAt: new Date("2026-07-01T12:00:00Z"), bodyWeightKg: "80.00" }),
      buildMeasurement({ id: "oldest", measuredAt: new Date("2026-06-01T12:00:00Z"), bodyWeightKg: "82.00" }),
    ];

    const trend = buildBodyMeasurementTrend(measurements);

    expect(trend?.measurementCount).toBe(3);
    expect(trend?.bodyWeightKg).toEqual({ firstValue: 82, latestValue: 78.5, deltaValue: -3.5 });
    expect(trend?.firstMeasuredAt).toEqual(new Date("2026-06-01T12:00:00Z"));
    expect(trend?.latestMeasuredAt).toEqual(new Date("2026-07-20T12:00:00Z"));
  });

  it("computes the latest thigh/calf asymmetry gap from the newest entry only", () => {
    const measurements = [
      buildMeasurement({ leftThighCm: "56.00", rightThighCm: "54.00", leftCalfCm: null, rightCalfCm: "36.00" }),
    ];

    const trend = buildBodyMeasurementTrend(measurements);

    expect(trend?.latestThighGapCm).toBe(2);
    expect(trend?.latestCalfGapCm).toBeNull();
  });

  it("returns a null delta for a field missing from either the first or latest entry", () => {
    const measurements = [
      buildMeasurement({ measuredAt: new Date("2026-07-20T12:00:00Z"), waistCm: null }),
      buildMeasurement({ measuredAt: new Date("2026-06-01T12:00:00Z"), waistCm: "90.00" }),
    ];

    const trend = buildBodyMeasurementTrend(measurements);

    expect(trend?.waistCm).toBeNull();
  });

  it("reports a zero delta with the same first/latest values for a single measurement", () => {
    const trend = buildBodyMeasurementTrend([buildMeasurement({ bodyWeightKg: "80.00" })]);

    expect(trend?.measurementCount).toBe(1);
    expect(trend?.bodyWeightKg).toEqual({ firstValue: 80, latestValue: 80, deltaValue: 0 });
  });

  describe("gap-improved (latest vs. immediately preceding measurement)", () => {
    it("flags an improved gap when it shrinks by >=5% versus the previous measurement", () => {
      const measurements = [
        buildMeasurement({ id: "latest", measuredAt: new Date("2026-07-20T12:00:00Z"), leftThighCm: "55.00", rightThighCm: "54.00" }), // gap 1
        buildMeasurement({ id: "previous", measuredAt: new Date("2026-07-01T12:00:00Z"), leftThighCm: "56.00", rightThighCm: "54.00" }), // gap 2
      ];

      const trend = buildBodyMeasurementTrend(measurements);

      expect(trend?.thighGapImproved).toBe(true);
    });

    it("does not flag an improved gap when it shrinks by less than 5%", () => {
      const measurements = [
        buildMeasurement({ id: "latest", measuredAt: new Date("2026-07-20T12:00:00Z"), leftThighCm: "55.95", rightThighCm: "54.00" }), // gap 1.95 (2.5% shrink)
        buildMeasurement({ id: "previous", measuredAt: new Date("2026-07-01T12:00:00Z"), leftThighCm: "56.00", rightThighCm: "54.00" }), // gap 2
      ];

      const trend = buildBodyMeasurementTrend(measurements);

      expect(trend?.thighGapImproved).toBe(false);
    });

    it("returns null (not false) when there is no previous measurement to compare against", () => {
      const trend = buildBodyMeasurementTrend([buildMeasurement()]);

      expect(trend?.thighGapImproved).toBeNull();
      expect(trend?.calfGapImproved).toBeNull();
    });

    it("returns null when either measurement is missing the fields needed for that gap", () => {
      const measurements = [
        buildMeasurement({ id: "latest", measuredAt: new Date("2026-07-20T12:00:00Z"), leftCalfCm: null }),
        buildMeasurement({ id: "previous", measuredAt: new Date("2026-07-01T12:00:00Z") }),
      ];

      const trend = buildBodyMeasurementTrend(measurements);

      expect(trend?.calfGapImproved).toBeNull();
    });
  });
});
