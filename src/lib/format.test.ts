import { describe, expect, it } from "vitest";

import { formatKg } from "./format";

describe("formatKg", () => {
  it("trims trailing zeros for whole numbers", () => {
    expect(formatKg(40, 2)).toBe("40kg");
    expect(formatKg("40.00", 2)).toBe("40kg");
    expect(formatKg(10, 1)).toBe("10kg");
    expect(formatKg(240, 0)).toBe("240kg");
  });

  it("keeps meaningful decimals", () => {
    expect(formatKg(42.5, 2)).toBe("42.5kg");
    expect(formatKg("42.50", 2)).toBe("42.5kg");
    expect(formatKg(13.3, 1)).toBe("13.3kg");
  });

  it("rounds to the given precision", () => {
    expect(formatKg(13.333, 1)).toBe("13.3kg");
    expect(formatKg(66.666, 0)).toBe("67kg");
  });
});
