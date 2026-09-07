import { describe, expect, it } from "vitest";

import { formatPlateCounts } from "@/training/plate-math";
import type { PlateDenomination } from "@/training/units";

import { buildLoadAssist, type LoadAssistInput } from "./load-assistant";

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

function input(overrides: Partial<LoadAssistInput> = {}): LoadAssistInput {
  return {
    lastWeightKg: 122.47,
    loadMechanism: "machine",
    isCompound: true,
    loadingModel: "plate_loaded",
    inventory: GYM,
    ...overrides,
  };
}

describe("buildLoadAssist", () => {
  it("answers both questions on the real hip-thrust numbers", () => {
    const assist = buildLoadAssist(input())!;

    expect(formatPlateCounts(assist.lastBuild!.perSide)).toBe("3 × 45 lb");
    expect(formatPlateCounts(assist.step!.added)).toBe("1 × 5 lb + 1 × 2.5 lb");
    expect(assist.step!.totalKg).toBe(129.27);
  });

  it("states the convention, which nothing in the app has ever done", () => {
    expect(buildLoadAssist(input())!.conventionEs).toBe("discos en total, sin contar la barra");
  });

  it("reports the hand-conversion drift without applying it", () => {
    // They typed 122; the bar held 122.47. Shown as a reconciliation, never
    // written back over a logged row.
    const assist = buildLoadAssist(input({ lastWeightKg: 122 }))!;
    expect(assist.lastBuildDriftKg).toBe(0.47);
  });

  /**
   * The step is computed whatever the progression verdict was, because the
   * verdict is derived during client render and this enumeration has to stay
   * on the server. The runner decides whether to show it.
   */
  it("computes the step without being told the action", () => {
    const assist = buildLoadAssist(input())!;

    expect(assist.step).not.toBeNull();
    expect(assist.lastBuild).not.toBeNull();
  });

  it("returns no step when no disc pair fits the band, rather than inventing one", () => {
    const assist = buildLoadAssist(
      input({ lastWeightKg: 40, inventory: [{ value: 25, unit: "lb" }] }),
    )!;

    expect(assist.step).toBeNull();
    // The recipe still renders — reading the discs is useful either way.
    expect(assist.lastBuild).not.toBeNull();
  });

  it("uses the narrower band for a barbell compound", () => {
    const assist = buildLoadAssist(input({ loadMechanism: "barbell", lastWeightKg: 60 }))!;
    const ratio = assist.step!.totalKg / 60 - 1;

    expect(ratio).toBeGreaterThanOrEqual(0.025);
    expect(ratio).toBeLessThanOrEqual(0.05);
  });

  describe("stays silent rather than guessing", () => {
    it("renders nothing for an unclassified loading model", () => {
      // loadMechanism "machine" covers both a pin stack and a plate-loaded
      // machine. Inferring would show a disc recipe for a selector pin.
      expect(buildLoadAssist(input({ loadingModel: null }))).toBeNull();
    });

    it("renders nothing for a stack", () => {
      expect(buildLoadAssist(input({ loadingModel: "stack" }))).toBeNull();
    });

    it("renders nothing when the gym has no discs recorded", () => {
      expect(buildLoadAssist(input({ inventory: [] }))).toBeNull();
    });

    it("renders nothing without a previous weight to anchor on", () => {
      expect(buildLoadAssist(input({ lastWeightKg: null }))).toBeNull();
      expect(buildLoadAssist(input({ lastWeightKg: 0 }))).toBeNull();
    });
  });
});
