import { describe, expect, it } from "vitest";

import { isRpe, rpeLabelsEs, rpeValues } from "./rpe";

describe("rpe", () => {
  it("has a Spanish label for every value on the scale", () => {
    for (const value of rpeValues) {
      expect(rpeLabelsEs[value]).toBeTruthy();
    }
  });

  it("isRpe accepts only integers from 1 to 10", () => {
    expect(isRpe(1)).toBe(true);
    expect(isRpe(10)).toBe(true);
    expect(isRpe(0)).toBe(false);
    expect(isRpe(11)).toBe(false);
    expect(isRpe(5.5)).toBe(false);
  });
});
