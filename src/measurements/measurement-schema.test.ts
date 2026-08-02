import { describe, expect, it } from "vitest";

import { calculateMeasurementGaps, determineSmallerSide, parseBodyMeasurementFormData } from "./measurement-schema";

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

  it("accepts chest and hips as independent single measurements", () => {
    const formData = new FormData();
    formData.set("chestCm", "100");
    formData.set("hipsCm", "95.5");

    expect(parseBodyMeasurementFormData(formData)).toEqual({
      chestCm: "100.00",
      hipsCm: "95.50",
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
  it("calculates left minus right thigh, calf, and arm gaps", () => {
    expect(
      calculateMeasurementGaps({
        rightThighCm: "54.00",
        leftThighCm: "56.00",
        rightCalfCm: "36.00",
        leftCalfCm: "39.00",
        rightArmCm: "33.00",
        leftArmCm: "35.00",
      }),
    ).toEqual({
      thighGapCm: 2,
      calfGapCm: 3,
      armGapCm: 2,
    });
  });

  it("returns null when a side is missing", () => {
    expect(calculateMeasurementGaps({ rightThighCm: "54.00" })).toEqual({
      thighGapCm: null,
      calfGapCm: null,
      armGapCm: null,
    });
  });
});

describe("determineSmallerSide", () => {
  it("returns the smaller side using the exact real-world case: right thigh/calf/arm all smaller", () => {
    expect(
      determineSmallerSide({
        rightThighCm: "51.00",
        leftThighCm: "54.00",
        rightCalfCm: "36.00",
        leftCalfCm: "38.00",
        rightArmCm: "33.00",
        leftArmCm: "35.00",
      }),
    ).toBe("right");
  });

  it("sums whichever gaps are available, ignoring missing pairs", () => {
    expect(determineSmallerSide({ rightThighCm: "50.00", leftThighCm: "48.00" })).toBe("left");
  });

  it("returns null when there's no measurement data to key off", () => {
    expect(determineSmallerSide({})).toBeNull();
  });

  it("returns null on a genuine tie rather than defaulting either way", () => {
    expect(determineSmallerSide({ rightThighCm: "50.00", leftThighCm: "50.00" })).toBeNull();
  });
});
