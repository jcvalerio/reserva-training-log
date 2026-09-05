import { describe, expect, it } from "vitest";

import { suggestProgression, type ProgressionInput } from "./progression";

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

  // Pain is now asked once per exercise, so most sets carry no answer at all.
  // null must never read as a reported 0 — Math.max coerces it, and this is
  // the function that decides how much weight someone puts on a bar.
  describe("sets nobody was asked about", () => {
    it("treats a null pain score as no signal rather than as zero", () => {
      expect(
        suggestProgression({
          allPlannedSetsCompleted: true,
          sets: [
            { actualReps: 12, plannedRepMax: 12, rir: 2, painScore: null },
            { actualReps: 12, plannedRepMax: 12, rir: 3, painScore: null },
          ],
        }),
      ).toMatchObject({ action: "increase", riskFlag: "none" });
    });

    it("still finds the one set carrying the exercise's answer", () => {
      expect(
        suggestProgression({
          allPlannedSetsCompleted: true,
          sets: [
            { actualReps: 12, plannedRepMax: 12, rir: 3, painScore: null },
            { actualReps: 12, plannedRepMax: 12, rir: 3, painScore: null },
            { actualReps: 12, plannedRepMax: 12, rir: 3, painScore: 5, painLocation: "hombro" },
          ],
        }),
      ).toMatchObject({ action: "reduce_or_modify", riskFlag: "pain" });
    });
  });

  // Ordinary soreness is the expected response to effective hypertrophy work.
  // Forcing a load reduction on it is how you teach someone to stop reporting
  // it, which is the failure this whole change exists to undo.
  describe("muscular soreness versus joint pain", () => {
    it("does not reduce load for muscular soreness that would block joint pain", () => {
      expect(
        suggestProgression({
          allPlannedSetsCompleted: true,
          sets: [
            { actualReps: 12, plannedRepMax: 12, rir: 2, painScore: null },
            { actualReps: 12, plannedRepMax: 12, rir: 3, painScore: 5, painLocation: "muscular" },
          ],
        }),
      ).toMatchObject({ action: "increase", riskFlag: "none" });
    });

    it("still reduces for the same score in a joint", () => {
      expect(
        suggestProgression({
          allPlannedSetsCompleted: true,
          sets: [
            { actualReps: 12, plannedRepMax: 12, rir: 2, painScore: null },
            { actualReps: 12, plannedRepMax: 12, rir: 3, painScore: 5, painLocation: "rodilla" },
          ],
        }),
      ).toMatchObject({ action: "reduce_or_modify", riskFlag: "pain" });
    });

    it("treats a reported pain with no location as joint pain, not as soreness", () => {
      expect(
        suggestProgression({
          allPlannedSetsCompleted: true,
          sets: [{ actualReps: 12, plannedRepMax: 12, rir: 3, painScore: 5, painLocation: null }],
        }),
      ).toMatchObject({ action: "reduce_or_modify", riskFlag: "pain" });
    });

    it("stops for severe pain even when the athlete calls it muscular", () => {
      expect(
        suggestProgression({
          allPlannedSetsCompleted: true,
          sets: [
            { actualReps: 12, plannedRepMax: 12, rir: 3, painScore: 8, painLocation: "muscular" },
          ],
        }),
      ).toMatchObject({ action: "reduce_or_modify", riskFlag: "pain" });
    });
  });

  // Between-session load management. Progression is per exercise; this is the
  // only thing that looks at the week around it.
  describe("weekly load guardrail", () => {
    const earnedAnIncrease: ProgressionInput = {
      allPlannedSetsCompleted: true,
      sets: [
        { actualReps: 12, plannedRepMax: 12, rir: 2, painScore: null },
        { actualReps: 12, plannedRepMax: 12, rir: 3, painScore: null },
      ],
    };

    it("still increases when the week is not escalating", () => {
      expect(suggestProgression({ ...earnedAnIncrease, weeklyLoadFlagged: false })).toMatchObject({
        action: "increase",
        riskFlag: "none",
      });
    });

    it("downgrades an earned increase to a hold when the week is escalating", () => {
      expect(suggestProgression({ ...earnedAnIncrease, weeklyLoadFlagged: true })).toMatchObject({
        action: "hold",
        riskFlag: "load",
      });
    });

    it("treats an absent flag as no signal rather than as cleared", () => {
      // Every existing caller omits it; omission must not change behaviour.
      expect(suggestProgression(earnedAnIncrease)).toMatchObject({ action: "increase" });
    });

    it("never turns a hold into a reduction", () => {
      // Not top of range, so this was a hold already. The guardrail withholds
      // increases; it does not add severity.
      expect(
        suggestProgression({
          allPlannedSetsCompleted: true,
          sets: [{ actualReps: 8, plannedRepMax: 12, rir: 3, painScore: null }],
          weeklyLoadFlagged: true,
        }),
      ).toMatchObject({ action: "hold", riskFlag: "none" });
    });

    it("leaves pain as the reported reason when both apply", () => {
      // Pain is the more specific and more important message.
      expect(
        suggestProgression({
          allPlannedSetsCompleted: true,
          sets: [
            { actualReps: 12, plannedRepMax: 12, rir: 3, painScore: 5, painLocation: "rodilla" },
          ],
          weeklyLoadFlagged: true,
        }),
      ).toMatchObject({ action: "reduce_or_modify", riskFlag: "pain" });
    });
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
