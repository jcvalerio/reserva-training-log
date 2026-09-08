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

    expect(formatPlateCounts(assist.suggestedBuild!.perSide)).toBe("3 × 45 lb");
    expect(formatPlateCounts(assist.step!.added)).toBe("1 × 5 lb + 1 × 2.5 lb");
    expect(assist.step!.totalKg).toBe(129.27);
  });

  it("states the convention, which nothing in the app has ever done", () => {
    expect(buildLoadAssist(input())!.conventionEs).toBe("discos en total, sin contar la barra");
  });

  /**
   * The bug preview caught, pinned. A computed build is an offer and says so;
   * only a build the athlete recorded is allowed to assert a mass, because
   * the drift figure is exactly as true as the recipe it came from.
   */
  it("claims no true mass for a build it computed itself", () => {
    const assist = buildLoadAssist(input({ lastWeightKg: 122 }))!;

    expect(assist.savedBuild).toBeNull();
    expect(assist.savedBuildDriftKg).toBe(0);
    expect(assist.suggestedBuild).not.toBeNull();
  });

  it("reports the hand-conversion drift once the athlete records the build", () => {
    // They typed 122; the bar held 3 x 45 lb per side, which is 122.47. Shown
    // as a reconciliation, never written back over a logged row.
    const assist = buildLoadAssist(
      input({ lastWeightKg: 122, recordedBuild: [{ value: 45, unit: "lb", count: 3 }] }),
    )!;

    expect(assist.savedBuild!.totalKg).toBe(122.47);
    expect(assist.savedBuildDriftKg).toBe(0.47);
    expect(assist.savedBuildIsStale).toBe(false);
    // The guess is withdrawn: a machine's opinion beside the athlete's answer
    // only invites them to wonder which one the app believes.
    expect(assist.suggestedBuild).toBeNull();
  });

  /**
   * The case that started this. The enumerator's answer for 63 kg is
   * 1 x 20 kg + 1 x 25 lb; the athlete had 45 lb discs on, because the 25 kg
   * plates are at the other end of the gym. Distance to the rack is not in the
   * model and never will be, so the recorded answer has to win outright.
   */
  it("prefers the recorded build over its own, however good its own was", () => {
    const guess = buildLoadAssist(input({ lastWeightKg: 63 }))!;
    expect(formatPlateCounts(guess.suggestedBuild!.perSide)).toBe("1 × 20 kg + 1 × 25 lb");

    const recorded = buildLoadAssist(
      input({ lastWeightKg: 63, recordedBuild: [{ value: 45, unit: "lb", count: 3 }] }),
    )!;
    expect(formatPlateCounts(recorded.savedBuild!.perSide)).toBe("3 × 45 lb");
    expect(recorded.suggestedBuild).toBeNull();
  });

  it("marks a build stale once the load has moved past it, without discarding it", () => {
    const assist = buildLoadAssist(
      input({ lastWeightKg: 129.27, recordedBuild: [{ value: 45, unit: "lb", count: 3 }] }),
    )!;

    expect(assist.savedBuildIsStale).toBe(true);
    expect(assist.savedBuild).not.toBeNull();
    // Stale means it no longer describes this weight, so nothing prefills from
    // it — but the denominations stay on screen as the editor's starting point.
    expect(assist.trueHoldKg).toBeNull();
    expect(assist.trueStepKg).toBeNull();
  });

  /**
   * Prefill values, and the reason they exist: the athlete typed 122 for a bar
   * that weighed 122.47. Nothing here touches a stored row — invariant 13 —
   * these only fill the box for the set about to be logged.
   */
  it("offers true kilograms only when a fresh recorded build makes them true", () => {
    const guessed = buildLoadAssist(input({ lastWeightKg: 122 }))!;
    expect(guessed.trueHoldKg).toBeNull();
    expect(guessed.trueStepKg).toBeNull();

    const recorded = buildLoadAssist(
      input({ lastWeightKg: 122, recordedBuild: [{ value: 45, unit: "lb", count: 3 }] }),
    )!;
    expect(recorded.trueHoldKg).toBe(122.47);
    // The step is rebased onto the true mass, so it no longer inherits the
    // half-kilo the hand-rounded 122 carried.
    expect(recorded.trueStepKg).toBe(129.27);
  });

  /**
   * The step is computed whatever the progression verdict was, because the
   * verdict is derived during client render and this enumeration has to stay
   * on the server. The runner decides whether to show it.
   */
  it("computes the step without being told the action", () => {
    const assist = buildLoadAssist(input())!;

    expect(assist.step).not.toBeNull();
    expect(assist.suggestedBuild).not.toBeNull();
  });

  it("returns no step when no disc pair fits the band, rather than inventing one", () => {
    const assist = buildLoadAssist(
      input({ lastWeightKg: 40, inventory: [{ value: 25, unit: "lb" }] }),
    )!;

    expect(assist.step).toBeNull();
    // The recipe still renders — reading the discs is useful either way.
    expect(assist.suggestedBuild).not.toBeNull();
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

    it("has no step or recipe without a previous weight, but still takes an answer", () => {
      // This used to return null, which meant a first session on an exercise
      // offered nothing at all — no way to record a build, and "¿lleva discos?"
      // unanswerable until session two. The step and the suggested recipe are
      // what need a previous weight; the bar in front of you is not.
      const fresh = buildLoadAssist(input({ lastWeightKg: null }))!;

      expect(fresh.step).toBeNull();
      expect(fresh.suggestedBuild).toBeNull();
      expect(fresh.inventory).toHaveLength(GYM.length);
      expect(buildLoadAssist(input({ lastWeightKg: 0 }))).not.toBeNull();
    });

    it("treats a build recorded on a first session as simply true", () => {
      // Nothing logged for it to contradict, so no drift, never stale, and it
      // fills the weight box outright — the athlete loads the bar, taps the
      // discs, and skips converting pounds by hand.
      const first = buildLoadAssist(
        input({ lastWeightKg: null, recordedBuild: [{ value: 45, unit: "lb", count: 3 }] }),
      )!;

      expect(first.savedBuild!.totalKg).toBe(122.47);
      expect(first.savedBuildDriftKg).toBe(0);
      expect(first.savedBuildIsStale).toBe(false);
      expect(first.trueHoldKg).toBe(122.47);
      // Still no step: where to go next is a question about history.
      expect(first.trueStepKg).toBeNull();
    });
  });
});
