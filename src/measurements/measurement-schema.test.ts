import { describe, expect, it } from "vitest";

import { calculateMeasurementGaps, parseBodyMeasurementFormData } from "./measurement-schema";

describe("parseBodyMeasurementFormData", () => {
  it("allows partial measurements and normalizes numeric values", () => {
    const formData = new FormData();
    formData.set("bodyWeightKg", "82.4");
    formData.set("rightThighCm", "54");
    formData.set("leftThighCm", "56");
    formData.set("notes", "Medido en ayunas.");

    expect(parseBodyMeasurementFormData(formData)).toEqual({
      bodyWeightKg: "82.40",
      rightThighCm: "54.00",
      leftThighCm: "56.00",
      notes: "Medido en ayunas.",
    });
  });

  it("requires at least one numeric measurement", () => {
    const formData = new FormData();
    formData.set("notes", "Solo notas no bastan.");

    expect(() => parseBodyMeasurementFormData(formData)).toThrow(
      "Registra al menos una medida numérica antes de guardar.",
    );
  });
});

describe("calculateMeasurementGaps", () => {
  it("calculates left minus right thigh and calf gaps", () => {
    expect(
      calculateMeasurementGaps({
        rightThighCm: "54.00",
        leftThighCm: "56.00",
        rightCalfCm: "36.00",
        leftCalfCm: "39.00",
      }),
    ).toEqual({
      thighGapCm: 2,
      calfGapCm: 3,
    });
  });

  it("returns null when a side is missing", () => {
    expect(calculateMeasurementGaps({ rightThighCm: "54.00" })).toEqual({
      thighGapCm: null,
      calfGapCm: null,
    });
  });
});
