import { describe, expect, it } from "vitest";

import { parseExercisePainAnswer, parseSetLogFormData } from "./set-log-schema";

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

describe("parseSetLogFormData pain", () => {
  it("records no pain score at all when the form carries none", () => {
    const formData = buildFormData();
    formData.delete("painScore");

    // null, not 0: the set-logging form no longer asks, and "not asked" has
    // to stay distinguishable from "asked, nothing hurt".
    expect(parseSetLogFormData(formData).painScore).toBeNull();
  });

  it("treats an empty pain field as not asked rather than as zero", () => {
    expect(parseSetLogFormData(buildFormData({ painScore: "" })).painScore).toBeNull();
  });
});

describe("parseExercisePainAnswer", () => {
  function answer(fields: Record<string, string>): FormData {
    const formData = new FormData();
    for (const [key, value] of Object.entries(fields)) {
      formData.set(key, value);
    }
    return formData;
  }

  it("stores a real zero for 'no', which is what makes the signal readable", () => {
    expect(parseExercisePainAnswer(answer({ bothered: "no" }))).toEqual({
      painScore: 0,
      painLocation: null,
    });
  });

  it("keeps the score and location for a 'si'", () => {
    expect(
      parseExercisePainAnswer(answer({ bothered: "si", painScore: "6", painLocation: "hombro" })),
    ).toEqual({ painScore: 6, painLocation: "hombro" });
  });

  it("discards a location when the answer is 'no'", () => {
    expect(
      parseExercisePainAnswer(answer({ bothered: "no", painScore: "6", painLocation: "hombro" })),
    ).toEqual({ painScore: 0, painLocation: null });
  });

  it("keeps a 'si' with no score as the lowest non-zero rather than losing it", () => {
    expect(parseExercisePainAnswer(answer({ bothered: "si" }))).toEqual({
      painScore: 1,
      painLocation: null,
    });
  });

  it("rejects a score outside the scale", () => {
    expect(() => parseExercisePainAnswer(answer({ bothered: "si", painScore: "11" }))).toThrow();
  });
});
