import { describe, expect, it } from "vitest";

import { suggestProgression } from "./progression";

describe("suggestProgression", () => {
  it("suggests increasing when target reps, RIR, and pain allow it", () => {
    expect(
      suggestProgression({
        allPlannedSetsCompleted: true,
        sets: [
          { actualReps: 12, plannedRepMax: 12, rir: 2, painScore: 0 },
          { actualReps: 12, plannedRepMax: 12, rir: 3, painScore: 1 },
          { actualReps: 12, plannedRepMax: 12, rir: 2, painScore: 0 },
        ],
      }),
    ).toMatchObject({ action: "increase", riskFlag: "none" });
  });

  it("blocks aggressive progression when pain is above 2", () => {
    expect(
      suggestProgression({
        allPlannedSetsCompleted: true,
        sets: [{ actualReps: 12, plannedRepMax: 12, rir: 3, painScore: 3 }],
      }),
    ).toMatchObject({ action: "hold", riskFlag: "pain" });
  });

  it("suggests reducing or modifying when pain is above 3", () => {
    expect(
      suggestProgression({
        allPlannedSetsCompleted: true,
        sets: [{ actualReps: 12, plannedRepMax: 12, rir: 3, painScore: 4 }],
      }),
    ).toMatchObject({ action: "reduce_or_modify", riskFlag: "pain" });
  });

  it("does not increase when reps drop sharply", () => {
    expect(
      suggestProgression({
        allPlannedSetsCompleted: true,
        sets: [
          { actualReps: 12, plannedRepMax: 12, rir: 3, painScore: 0 },
          { actualReps: 9, plannedRepMax: 12, rir: 1, painScore: 0 },
        ],
      }),
    ).toMatchObject({ action: "hold", riskFlag: "fatigue" });
  });

  it("a bonus set that misses the rep ceiling doesn't block an increase the planned sets earned", () => {
    expect(
      suggestProgression({
        allPlannedSetsCompleted: true,
        sets: [
          { actualReps: 12, plannedRepMax: 12, rir: 2, painScore: 0 },
          { actualReps: 12, plannedRepMax: 12, rir: 3, painScore: 0 },
          // A lighter bonus backoff set that doesn't reach the rep ceiling —
          // would flip reachedTopOfRange to false if it counted equally.
          { actualReps: 8, plannedRepMax: 12, rir: 0, painScore: 0, isBonus: true },
        ],
      }),
    ).toMatchObject({ action: "increase", riskFlag: "none" });
  });

  it("a bonus set's low RIR doesn't drag the average below the increase threshold", () => {
    expect(
      suggestProgression({
        allPlannedSetsCompleted: true,
        sets: [
          { actualReps: 12, plannedRepMax: 12, rir: 3, painScore: 0 },
          { actualReps: 12, plannedRepMax: 12, rir: 3, painScore: 0 },
          // An all-out bonus set at RIR 0 — would drag the average below 2
          // if counted alongside the planned sets.
          { actualReps: 12, plannedRepMax: 12, rir: 0, painScore: 0, isBonus: true },
        ],
      }),
    ).toMatchObject({ action: "increase", riskFlag: "none" });
  });

  it("pain on a bonus set still blocks aggressive progression — pain has no blind spot", () => {
    expect(
      suggestProgression({
        allPlannedSetsCompleted: true,
        sets: [
          { actualReps: 12, plannedRepMax: 12, rir: 2, painScore: 0 },
          { actualReps: 12, plannedRepMax: 12, rir: 2, painScore: 0 },
          { actualReps: 10, plannedRepMax: 12, rir: 1, painScore: 4, isBonus: true },
        ],
      }),
    ).toMatchObject({ action: "reduce_or_modify", riskFlag: "pain" });
  });

  it("a sharp rep drop into a bonus set doesn't trigger the fatigue hold, unlike a drop within planned sets", () => {
    expect(
      suggestProgression({
        allPlannedSetsCompleted: true,
        sets: [
          { actualReps: 12, plannedRepMax: 12, rir: 2, painScore: 0 },
          { actualReps: 12, plannedRepMax: 12, rir: 2, painScore: 0 },
          // A deliberate AMRAP-to-failure bonus set with far fewer reps —
          // not evidence of unplanned fatigue during the prescribed work.
          { actualReps: 4, plannedRepMax: 12, rir: 0, painScore: 0, isBonus: true },
        ],
      }),
    ).toMatchObject({ action: "increase", riskFlag: "none" });
  });
});
