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
});
