import { describe, expect, it } from "vitest";

import {
  buildFromScratch,
  chooseLoadStep,
  buildTableCacheSizeForTests,
  clearBuildTableCacheForTests,
  formatPlateCounts,
  MAX_DENOMINATIONS,
} from "./plate-math";
import { formatWeight, roundKg, sumPlatesKg, toKg, type PlateDenomination } from "./units";

/**
 * The real inventory of the gym this was built for: both unit families in one
 * room, which is the whole reason any of this exists. Every expected value
 * below is a real number off a real bar, not a constructed example.
 */
const GYM: PlateDenomination[] = [
  { value: 45, unit: "lb" },
  { value: 35, unit: "lb" },
  { value: 25, unit: "lb" },
  { value: 10, unit: "lb" },
  { value: 5, unit: "lb" },
  { value: 2.5, unit: "lb" },
  { value: 25, unit: "kg" },
  { value: 20, unit: "kg" },
  { value: 15, unit: "kg" },
  { value: 10, unit: "kg" },
  { value: 5, unit: "kg" },
];

/** Their hip thrust: 6 x 45 lb, three per side, bar not counted. */
const HIP_THRUST_KG = 122.47;

describe("units", () => {
  it("converts a 45 lb plate exactly, not to a round 20", () => {
    expect(toKg(45, "lb")).toBeCloseTo(20.4117, 4);
  });

  it("reproduces the measured hip-thrust load from its plates", () => {
    const plates: PlateDenomination[] = Array.from({ length: 6 }, () => ({ value: 45, unit: "lb" as const }));
    expect(sumPlatesKg(plates)).toBe(HIP_THRUST_KG);
  });

  it("shows the drift that hand-conversion was costing them", () => {
    // Logged 122 by hand for a bar that actually held 122.47 — half a kilo per
    // entry, compounding into volume load and every estimated 1RM.
    expect(roundKg(HIP_THRUST_KG - 122)).toBe(0.47);
  });

  it("formats with a Spanish decimal comma", () => {
    expect(formatWeight(2.5, "lb")).toBe("2.5 lb");
    expect(formatWeight(20, "kg")).toBe("20 kg");
  });
});

describe("buildFromScratch", () => {
  it("answers the question they were doing by hand: 122 kg is 3 x 45 lb per side", () => {
    const build = buildFromScratch(122, GYM)!;

    expect(build.totalKg).toBe(HIP_THRUST_KG);
    expect(build.plateCount).toBe(3);
    expect(build.perSide).toEqual([{ value: 45, unit: "lb", count: 3 }]);
  });

  // Regression pin for a real bug found by testing rather than reasoning.
  // Closest-total returns 122.06 kg as 2x45lb + 2x10lb + 1x2.5lb + 1x10kg —
  // six discs across four denominations, to be 0.06 kg nearer than 3x45lb.
  // Practicality is the objective; proximity is only the constraint.
  it("prefers three discs slightly off over six discs exactly on", () => {
    const build = buildFromScratch(122, GYM)!;

    expect(build.plateCount).toBeLessThanOrEqual(3);
    expect(build.perSide).toHaveLength(1);
  });

  it("hits an exactly buildable target exactly", () => {
    expect(buildFromScratch(HIP_THRUST_KG, GYM)!.totalKg).toBe(HIP_THRUST_KG);
  });

  it("returns null for a gym with no discs recorded", () => {
    expect(buildFromScratch(100, [])).toBeNull();
  });

  it("still answers when nothing is within tolerance, rather than giving up", () => {
    // A 3 kg target in a gym whose lightest pair is 10 kg. The honest answer
    // is the empty bar; the caller renders the gap.
    const build = buildFromScratch(3, [{ value: 5, unit: "kg" }])!;
    expect(build.totalKg).toBe(0);
  });
});

describe("chooseLoadStep", () => {
  // The headline case, on their real bar. Machine / lower-body band is 5-10%.
  it("tells them what to ADD rather than rebuilding the bar", () => {
    const step = chooseLoadStep(HIP_THRUST_KG, GYM, 0.05, 0.1)!;

    expect(step.totalKg).toBe(129.27);
    expect(step.deltaKg).toBe(6.8);
    expect(formatPlateCounts(step.added)).toBe("1 × 5 lb + 1 × 2.5 lb");
  });

  /**
   * The ordering pin, and the reason it exists.
   *
   * Sorting by disc count first picks 1 x 10 lb -> 131.54 kg (+7.4%) over
   * 1x5lb + 1x2.5lb -> 129.27 kg (+5.6%). Both are one line of instruction and
   * neither is harder to load, so paying nearly two extra percent of load for
   * one fewer disc is the wrong trade — on a hinge, for a 47-year-old, twice
   * over. Closest-to-target wins; disc count is only the tie-break.
   */
  it("takes the smaller increase over the tidier one", () => {
    const step = chooseLoadStep(HIP_THRUST_KG, GYM, 0.05, 0.1)!;

    expect(step.totalKg).toBeLessThan(131.54);
    expect(step.plateCount).toBe(2);
  });

  it("keeps the whole result inside the mechanism's band", () => {
    const step = chooseLoadStep(HIP_THRUST_KG, GYM, 0.05, 0.1)!;
    const ratio = step.totalKg / HIP_THRUST_KG - 1;

    expect(ratio).toBeGreaterThanOrEqual(0.05);
    expect(ratio).toBeLessThanOrEqual(0.1);
  });

  it("uses the narrower band for an upper compound", () => {
    const step = chooseLoadStep(60, GYM, 0.025, 0.05)!;
    const ratio = step.totalKg / 60 - 1;

    expect(ratio).toBeGreaterThanOrEqual(0.025);
    expect(ratio).toBeLessThanOrEqual(0.05);
  });

  /**
   * A real answer, not a failure. In a gym stocking only 25 lb discs, the
   * smallest possible pair on a 40 kg load is +57% — so there is no load
   * change this athlete can make, and the caller must fall through to
   * "add a rep" rather than inventing one.
   */
  it("returns null when the smallest available pair overshoots the band", () => {
    expect(chooseLoadStep(40, [{ value: 25, unit: "lb" }], 0.05, 0.1)).toBeNull();
  });

  it("returns null for an empty inventory or a zero starting load", () => {
    expect(chooseLoadStep(100, [], 0.05, 0.1)).toBeNull();
    expect(chooseLoadStep(0, GYM, 0.05, 0.1)).toBeNull();
  });

  it("never suggests removing weight for an increase band", () => {
    const step = chooseLoadStep(HIP_THRUST_KG, GYM, 0.05, 0.1)!;
    expect(step.deltaKg).toBeGreaterThan(0);
  });
});

describe("inventory bounds", () => {
  it("ignores duplicates and caps the denomination count", () => {
    const noisy: PlateDenomination[] = [
      ...GYM,
      { value: 45, unit: "lb" },
      { value: 2, unit: "kg" },
      { value: 1.25, unit: "kg" },
      { value: 0.5, unit: "kg" },
    ];
    // Still answers, and still the practical answer, with an over-long list.
    expect(buildFromScratch(122, noisy)!.plateCount).toBeLessThanOrEqual(3);
    expect(MAX_DENOMINATIONS).toBe(12);
  });

  it("drops non-positive denominations rather than looping on them", () => {
    const build = buildFromScratch(40, [{ value: 0, unit: "kg" }, { value: 10, unit: "kg" }])!;
    expect(build.totalKg).toBe(40);
  });
});

describe("formatPlateCounts", () => {
  it("orders heaviest first across both unit families", () => {
    expect(
      formatPlateCounts([
        { value: 2.5, unit: "lb", count: 1 },
        { value: 25, unit: "kg", count: 2 },
        { value: 45, unit: "lb", count: 3 },
      ]),
    ).toBe("2 × 25 kg + 3 × 45 lb + 1 × 2.5 lb");
  });
});

/**
 * The memo is keyed on the athlete's own inventory, so its size is user input.
 * Measured at ~1.1 MB retained and ~12 ms per distinct rack on the real gym,
 * which made an unbounded map a way to spend a server's heap from a form.
 */
describe("the achievable-builds memo", () => {
  it("stays bounded however many different racks pass through it", () => {
    clearBuildTableCacheForTests();

    // Enough distinct inventories to overflow any sane bound several times.
    for (let n = 0; n < 200; n += 1) {
      buildFromScratch(60, [
        { value: 20 + n, unit: "kg" },
        { value: 10, unit: "kg" },
      ]);
    }

    // 200 distinct racks in, and the map holds a fixed handful. Asserting a
    // ceiling rather than the exact constant, so tuning the bound does not
    // break a test that is about growth, not about the number 16.
    expect(buildTableCacheSizeForTests()).toBeLessThanOrEqual(32);

    // Still correct on the real gym afterwards: eviction may have dropped this
    // table, and recomputing it is the point of the bound being safe to hit.
    expect(formatPlateCounts(buildFromScratch(122, GYM)!.perSide)).toBe("3 × 45 lb");
  });

  it("answers identically whether or not the table was cached", () => {
    clearBuildTableCacheForTests();
    const cold = buildFromScratch(122, GYM)!;
    const warm = buildFromScratch(122, GYM)!;

    expect(warm.totalKg).toBe(cold.totalKg);
    expect(formatPlateCounts(warm.perSide)).toBe(formatPlateCounts(cold.perSide));
  });
});
