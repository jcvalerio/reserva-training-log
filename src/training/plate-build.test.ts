import { describe, expect, it } from "vitest";

import { parsePlateBuild, plateBuildFromCounts, serializePlateBuild } from "./plate-build";
import { formatPlateCounts, MAX_PLATES_PER_SIDE } from "./plate-math";
import type { PlateDenomination } from "./units";

const GYM: PlateDenomination[] = [
  { value: 45, unit: "lb" },
  { value: 25, unit: "lb" },
  { value: 2.5, unit: "lb" },
  { value: 25, unit: "kg" },
  { value: 20, unit: "kg" },
];

describe("serializePlateBuild / parsePlateBuild", () => {
  it("round-trips a build through the wire format", () => {
    const wire = serializePlateBuild([
      { value: 45, unit: "lb", count: 3 },
      { value: 2.5, unit: "lb", count: 1 },
    ]);

    expect(wire).toBe("3x45lb|1x2.5lb");
    expect(parsePlateBuild(wire, GYM)).toEqual([
      { value: 45, unit: "lb", count: 3 },
      { value: 2.5, unit: "lb", count: 1 },
    ]);
  });

  it("drops denominations the athlete zeroed out", () => {
    expect(serializePlateBuild([{ value: 45, unit: "lb", count: 0 }])).toBe("");
  });

  it("treats an empty build as clearing, not as malformed", () => {
    expect(parsePlateBuild("", GYM)).toEqual([]);
  });

  /**
   * The validation that matters. A build is the only input in this feature
   * whose numbers are not derived from the inventory, so an unchecked one
   * would let a disc that does not exist into every recipe, drift figure and
   * prefilled weight downstream — confidently wrong, and undetectable by
   * anything else in the app.
   */
  it("refuses a disc the gym does not stock", () => {
    expect(parsePlateBuild("2x55lb", GYM)).toBeNull();
    expect(parsePlateBuild("1x45kg", GYM)).toBeNull();
  });

  it("refuses malformed input rather than salvaging part of it", () => {
    expect(parsePlateBuild("3x45", GYM)).toBeNull();
    expect(parsePlateBuild("45lb", GYM)).toBeNull();
    expect(parsePlateBuild("0x45lb", GYM)).toBeNull();
    expect(parsePlateBuild("-1x45lb", GYM)).toBeNull();
    expect(parsePlateBuild("3x45lb|", GYM)).toBeNull();
  });

  it("refuses the same denomination twice, which two groups could disagree about", () => {
    expect(parsePlateBuild("2x45lb|1x45lb", GYM)).toBeNull();
  });

  it("refuses more discs than fit on a side", () => {
    expect(parsePlateBuild(`${MAX_PLATES_PER_SIDE}x45lb`, GYM)).not.toBeNull();
    expect(parsePlateBuild(`${MAX_PLATES_PER_SIDE + 1}x45lb`, GYM)).toBeNull();
    expect(parsePlateBuild(`${MAX_PLATES_PER_SIDE}x45lb|1x25lb`, GYM)).toBeNull();
  });

  it("orders heaviest first however the athlete tapped them in", () => {
    const parsed = parsePlateBuild("1x2.5lb|2x25kg|1x45lb", GYM)!;
    expect(formatPlateCounts(parsed)).toBe("2 × 25 kg + 1 × 45 lb + 1 × 2.5 lb");
  });
});

describe("plateBuildFromCounts", () => {
  /**
   * The number the whole feature turns on. 3 x 45 lb per side is 122.47 kg,
   * not the 122 the athlete typed — converting at full precision and rounding
   * once is what keeps half a kilo per entry out of volume load and every
   * estimated 1RM.
   */
  it("totals BOTH sides at full conversion precision", () => {
    const build = plateBuildFromCounts([{ value: 45, unit: "lb", count: 3 }])!;

    expect(build.totalKg).toBe(122.47);
    expect(build.plateCount).toBe(3);
  });

  it("mixes unit families without converting twice", () => {
    const build = plateBuildFromCounts([
      { value: 20, unit: "kg", count: 1 },
      { value: 25, unit: "lb", count: 1 },
    ])!;

    expect(build.totalKg).toBe(62.68);
  });

  it("is null for a bar with nothing on it", () => {
    expect(plateBuildFromCounts([])).toBeNull();
    expect(plateBuildFromCounts([{ value: 45, unit: "lb", count: 0 }])).toBeNull();
  });
});
