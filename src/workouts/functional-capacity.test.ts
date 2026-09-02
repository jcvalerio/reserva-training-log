import { describe, expect, it } from "vitest";

import {
  BALANCE_SYMMETRY_THRESHOLD,
  buildFunctionalCapacitySummary,
  type FunctionalTestRecord,
} from "./functional-capacity";

const NOW = new Date("2026-09-01T12:00:00Z");

function buildTest(overrides: Partial<FunctionalTestRecord> = {}): FunctionalTestRecord {
  return {
    id: "test-1",
    testedAt: new Date("2026-08-25T12:00:00Z"),
    sitToStandReps: 20,
    balanceLeftSeconds: "12.00",
    balanceRightSeconds: "14.00",
    ...overrides,
  };
}

describe("buildFunctionalCapacitySummary — retest cadence", () => {
  it("treats never-tested as due", () => {
    const summary = buildFunctionalCapacitySummary([], { now: NOW });

    expect(summary.retestDue).toBe(true);
    expect(summary.testCount).toBe(0);
    expect(summary.lastTestedAt).toBeNull();
    expect(summary.latestSitToStandReps).toBeNull();
    expect(summary.balanceSymmetry).toBeNull();
  });

  it("is not due inside the window and is due past it", () => {
    expect(
      buildFunctionalCapacitySummary([buildTest({ testedAt: new Date("2026-08-25T12:00:00Z") })], {
        now: NOW,
      }).retestDue,
    ).toBe(false);

    expect(
      buildFunctionalCapacitySummary([buildTest({ testedAt: new Date("2026-06-01T12:00:00Z") })], {
        now: NOW,
      }).retestDue,
    ).toBe(true);
  });
});

describe("buildFunctionalCapacitySummary — trends", () => {
  it("needs two points before reporting a trend", () => {
    const summary = buildFunctionalCapacitySummary([buildTest()], { now: NOW });

    // A single point is not a trend, and a delta of 0 would claim no change
    // where nothing was compared.
    expect(summary.sitToStandTrend).toBeNull();
    expect(summary.latestSitToStandReps).toBe(20);
  });

  it("compares oldest against newest, not newest against previous", () => {
    const summary = buildFunctionalCapacitySummary(
      [
        buildTest({ id: "a", testedAt: new Date("2026-05-01T12:00:00Z"), sitToStandReps: 14 }),
        buildTest({ id: "b", testedAt: new Date("2026-07-01T12:00:00Z"), sitToStandReps: 22 }),
        buildTest({ id: "c", testedAt: new Date("2026-08-25T12:00:00Z"), sitToStandReps: 19 }),
      ],
      { now: NOW },
    );

    expect(summary.sitToStandTrend).toMatchObject({ first: 14, latest: 19, delta: 5 });
  });

  it("tracks balance on the better side rather than a fixed leg", () => {
    const summary = buildFunctionalCapacitySummary(
      [
        buildTest({
          id: "a",
          testedAt: new Date("2026-05-01T12:00:00Z"),
          balanceLeftSeconds: "8.00",
          balanceRightSeconds: "6.00",
        }),
        buildTest({
          id: "b",
          testedAt: new Date("2026-08-25T12:00:00Z"),
          balanceLeftSeconds: "9.00",
          balanceRightSeconds: "15.00",
        }),
      ],
      { now: NOW },
    );

    expect(summary.balanceTrend).toMatchObject({ first: 8, latest: 15, delta: 7 });
    expect(summary.latestBalanceSeconds).toBe(15);
  });

  it("reports a decline honestly rather than flooring at zero", () => {
    const summary = buildFunctionalCapacitySummary(
      [
        buildTest({ id: "a", testedAt: new Date("2026-05-01T12:00:00Z"), sitToStandReps: 22 }),
        buildTest({ id: "b", testedAt: new Date("2026-08-25T12:00:00Z"), sitToStandReps: 17 }),
      ],
      { now: NOW },
    );

    expect(summary.sitToStandTrend?.delta).toBe(-5);
  });

  it("skips tests that did not record the metric instead of reading them as zero", () => {
    const summary = buildFunctionalCapacitySummary(
      [
        buildTest({ id: "a", testedAt: new Date("2026-05-01T12:00:00Z"), sitToStandReps: 14 }),
        buildTest({ id: "b", testedAt: new Date("2026-07-01T12:00:00Z"), sitToStandReps: null }),
        buildTest({ id: "c", testedAt: new Date("2026-08-25T12:00:00Z"), sitToStandReps: 18 }),
      ],
      { now: NOW },
    );

    expect(summary.sitToStandTrend).toMatchObject({ first: 14, latest: 18, delta: 4 });
  });

  it("keeps an older reading when the newest test skipped that metric", () => {
    // A sitting that captured only the chair stand must not blank out the
    // balance number from a fortnight earlier.
    const summary = buildFunctionalCapacitySummary(
      [
        buildTest({
          id: "older",
          testedAt: new Date("2026-08-01T12:00:00Z"),
          balanceLeftSeconds: "11.00",
          balanceRightSeconds: "13.00",
        }),
        buildTest({
          id: "newest",
          testedAt: new Date("2026-08-25T12:00:00Z"),
          sitToStandReps: 21,
          balanceLeftSeconds: null,
          balanceRightSeconds: null,
        }),
      ],
      { now: NOW },
    );

    expect(summary.latestSitToStandReps).toBe(21);
    expect(summary.latestBalanceSeconds).toBe(13);
    expect(summary.balanceSymmetry?.leftSeconds).toBe(11);
  });
});

describe("buildFunctionalCapacitySummary — balance asymmetry", () => {
  it("divides weaker by stronger and names the weaker side", () => {
    const summary = buildFunctionalCapacitySummary(
      [buildTest({ balanceLeftSeconds: "8.00", balanceRightSeconds: "10.00" })],
      { now: NOW },
    );

    expect(summary.balanceSymmetry).toMatchObject({
      indexPercent: 80,
      weakerSide: "left",
      belowThreshold: true,
    });
  });

  it("uses the same threshold as the strength symmetry index", () => {
    expect(BALANCE_SYMMETRY_THRESHOLD).toBe(90);

    const summary = buildFunctionalCapacitySummary(
      [buildTest({ balanceLeftSeconds: "9.00", balanceRightSeconds: "10.00" })],
      { now: NOW },
    );

    expect(summary.balanceSymmetry?.belowThreshold).toBe(false);
  });

  it("needs both sides before reporting an asymmetry", () => {
    const summary = buildFunctionalCapacitySummary(
      [buildTest({ balanceLeftSeconds: "9.00", balanceRightSeconds: null })],
      { now: NOW },
    );

    expect(summary.balanceSymmetry).toBeNull();
  });

  it("returns null rather than NaN when neither side held any time", () => {
    const summary = buildFunctionalCapacitySummary(
      [buildTest({ balanceLeftSeconds: "0.00", balanceRightSeconds: "0.00" })],
      { now: NOW },
    );

    expect(summary.balanceSymmetry).toBeNull();
  });
});
