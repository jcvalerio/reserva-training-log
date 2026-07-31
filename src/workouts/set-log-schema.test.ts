import { describe, expect, it } from "vitest";

import { parseSetLogFormData } from "./set-log-schema";

function buildFormData(overrides: Record<string, string> = {}): FormData {
  const formData = new FormData();
  const defaults: Record<string, string> = {
    side: "bilateral",
    actualWeightKg: "80",
    actualReps: "10",
    rir: "2",
    painScore: "0",
  };

  for (const [key, value] of Object.entries({ ...defaults, ...overrides })) {
    formData.set(key, value);
  }

  return formData;
}

describe("parseSetLogFormData", () => {
  it("parses a valid set and formats weight to two decimals", () => {
    const input = parseSetLogFormData(buildFormData());

    expect(input).toEqual({
      prescriptionType: "strength",
      side: "bilateral",
      actualWeightKg: "80.00",
      actualReps: 10,
      rir: 2,
      painScore: 0,
      notes: undefined,
    });
  });

  it("keeps trimmed optional notes", () => {
    const input = parseSetLogFormData(buildFormData({ notes: "  Molestia leve en rodilla  " }));

    expect(input.notes).toBe("Molestia leve en rodilla");
  });

  it("rejects RIR outside 0-4", () => {
    expect(() => parseSetLogFormData(buildFormData({ rir: "5" }))).toThrow();
  });

  it("rejects pain score outside 0-10", () => {
    expect(() => parseSetLogFormData(buildFormData({ painScore: "11" }))).toThrow();
  });

  it("rejects a missing weight", () => {
    expect(() => parseSetLogFormData(buildFormData({ actualWeightKg: "" }))).toThrow();
  });

  it("rejects reps below 1", () => {
    expect(() => parseSetLogFormData(buildFormData({ actualReps: "0" }))).toThrow();
  });

  it("accepts left/right sides", () => {
    expect(parseSetLogFormData(buildFormData({ side: "left" })).side).toBe("left");
    expect(parseSetLogFormData(buildFormData({ side: "right" })).side).toBe("right");
  });
});
