import { describe, expect, it } from "vitest";

import { parseBaselineFormData } from "./baseline-schema";

describe("parseBaselineFormData", () => {
  it("preserves kg, reps, sets, RIR, pain score, side, and notes", () => {
    const formData = new FormData();
    formData.set("single-leg-leg-press:left:weightKg", "80.5");
    formData.set("single-leg-leg-press:left:reps", "10");
    formData.set("single-leg-leg-press:left:sets", "3");
    formData.set("single-leg-leg-press:left:rir", "2");
    formData.set("single-leg-leg-press:left:painScore", "1");
    formData.set("single-leg-leg-press:left:notes", "Control estable.");

    expect(parseBaselineFormData(formData)).toEqual([
      {
        exerciseSlug: "single-leg-leg-press",
        side: "left",
        weightKg: "80.50",
        reps: 10,
        sets: 3,
        rir: 2,
        painScore: 1,
        notes: "Control estable.",
      },
    ]);
  });

  it("allows skipping individual exercises but not all exercises", () => {
    expect(() => parseBaselineFormData(new FormData())).toThrow(
      "Registra al menos un peso base antes de continuar.",
    );
  });

  it("requires pain score and numeric RIR when a baseline row is started", () => {
    const formData = new FormData();
    formData.set("leg-press:bilateral:weightKg", "160");
    formData.set("leg-press:bilateral:reps", "12");
    formData.set("leg-press:bilateral:sets", "4");
    formData.set("leg-press:bilateral:rir", "4");

    expect(() => parseBaselineFormData(formData)).toThrow();
  });
});
