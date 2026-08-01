import { describe, expect, it } from "vitest";

import { buildLinePath, padDomain, scaleLinear } from "./chart-svg";

describe("scaleLinear", () => {
  it("maps a domain value to the corresponding range value", () => {
    const scale = scaleLinear([0, 10], [100, 200]);

    expect(scale(0)).toBe(100);
    expect(scale(10)).toBe(200);
    expect(scale(5)).toBe(150);
  });

  it("returns the range midpoint for a zero-width domain instead of dividing by zero", () => {
    const scale = scaleLinear([5, 5], [100, 200]);

    expect(scale(5)).toBe(150);
  });
});

describe("buildLinePath", () => {
  it("builds an SVG path starting with M and continuing with L", () => {
    expect(buildLinePath([{ x: 0, y: 0 }, { x: 10, y: 5 }, { x: 20, y: 2 }])).toBe("M 0 0 L 10 5 L 20 2");
  });

  it("returns an M-only path for a single point", () => {
    expect(buildLinePath([{ x: 5, y: 5 }])).toBe("M 5 5");
  });
});

describe("padDomain", () => {
  it("pads a normal range by the given ratio on each side", () => {
    expect(padDomain([0, 100], 0.1)).toEqual([-10, 110]);
  });

  it("pads a flat non-zero domain by an absolute amount instead of 0", () => {
    expect(padDomain([50, 50], 0.1)).toEqual([45, 55]);
  });

  it("pads a flat zero domain by a fixed absolute amount", () => {
    expect(padDomain([0, 0], 0.1)).toEqual([-1, 1]);
  });
});
