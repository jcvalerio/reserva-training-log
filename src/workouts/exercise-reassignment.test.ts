import { describe, expect, it } from "vitest";

import { canReassignTo, reassignOptionsFor, type ReassignCandidate, type ReassignSource } from "./exercise-reassignment";
import type { SetLog } from "./workout-repository";

function strengthSet(overrides: Partial<SetLog> = {}): SetLog {
  return {
    id: "set-1",
    exerciseLogId: "log-1",
    setNumber: 1,
    side: "bilateral",
    actualWeightKg: "40",
    actualReps: 10,
    rir: 2,
    actualDurationSeconds: null,
    painScore: 0,
    painLocation: null,
    notes: null,
    completedAt: new Date(),
    updatedAt: null,
    ...overrides,
  } as SetLog;
}

function durationSet(overrides: Partial<SetLog> = {}): SetLog {
  return strengthSet({
    actualWeightKg: null,
    actualReps: null,
    rir: null,
    actualDurationSeconds: 540,
    ...overrides,
  });
}

function source(overrides: Partial<ReassignSource> = {}): ReassignSource {
  return {
    id: "presc-source",
    prescriptionType: "strength",
    isUnilateral: false,
    loggedSets: [strengthSet()],
    ...overrides,
  };
}

function candidate(overrides: Partial<ReassignCandidate> = {}): ReassignCandidate {
  return {
    id: "presc-target",
    exerciseNameEs: "Fondos en máquina",
    prescriptionType: "strength",
    isUnilateral: false,
    loggedSets: [],
    ...overrides,
  };
}

describe("canReassignTo", () => {
  it("allows a straightforward move to an empty exercise of the same shape", () => {
    expect(canReassignTo(source(), candidate())).toEqual({ ok: true, mode: "move" });
  });

  it("refuses moving an exercise onto itself", () => {
    expect(canReassignTo(source(), candidate({ id: "presc-source" }))).toEqual({
      ok: false,
      reasonEs: "Es el mismo ejercicio.",
    });
  });

  it("refuses when there is nothing logged to move", () => {
    const result = canReassignTo(source({ loggedSets: [] }), candidate());

    expect(result.ok).toBe(false);
  });

  it("offers a SWAP when the target already has sets", () => {
    // Refusing this made the feature useless for the case it was built for:
    // the plan-reorder bug shifted a whole day's values one position, so every
    // exercise held its neighbour's work and no target was ever empty.
    // A swap keeps exactly one log per exercise, so nothing double-counts.
    const result = canReassignTo(source(), candidate({ loggedSets: [strengthSet({ id: "other-1" })] }));

    expect(result).toEqual({ ok: true, mode: "swap" });
  });

  it("REGRESSION: refuses strength sets onto a duration exercise", () => {
    // This is the crash that blanked a whole workout — a row typed one way
    // owning sets shaped the other. Refuse at the move, not downstream.
    const result = canReassignTo(source(), candidate({ prescriptionType: "duration" }));

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ reasonEs: expect.stringContaining("se mide por tiempo") });
  });

  it("REGRESSION: refuses duration sets onto a strength exercise", () => {
    const result = canReassignTo(
      source({ prescriptionType: "duration", loggedSets: [durationSet()] }),
      candidate({ prescriptionType: "strength" }),
    );

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ reasonEs: expect.stringContaining("peso y reps") });
  });

  it("allows a duration-to-duration move", () => {
    expect(
      canReassignTo(
        source({ prescriptionType: "duration", loggedSets: [durationSet()] }),
        candidate({ prescriptionType: "duration", exerciseNameEs: "Escalera (finalizador)" }),
      ),
    ).toEqual({ ok: true, mode: "move" });
  });

  it("refuses per-side sets onto a bilateral exercise", () => {
    // targetSets means sets PER SIDE for a unilateral exercise, so a bilateral
    // target would read the per-side sets as one shared total.
    const result = canReassignTo(
      source({ isUnilateral: true, loggedSets: [strengthSet({ side: "left" }), strengthSet({ side: "right" })] }),
      candidate({ isUnilateral: false }),
    );

    expect(result).toEqual({
      ok: false,
      reasonEs: "Tus series están registradas por lado; ese ejercicio no es unilateral.",
    });
  });

  it("refuses bilateral sets onto a unilateral exercise", () => {
    // The target would show as permanently half-done: one side has nothing.
    const result = canReassignTo(source(), candidate({ isUnilateral: true }));

    expect(result).toEqual({ ok: false, reasonEs: "Ese ejercicio es unilateral y tus series no tienen lado." });
  });

  it("allows a unilateral-to-unilateral move", () => {
    expect(
      canReassignTo(
        source({ isUnilateral: true, loggedSets: [strengthSet({ side: "left" }), strengthSet({ side: "right" })] }),
        candidate({ isUnilateral: true }),
      ),
    ).toEqual({ ok: true, mode: "move" });
  });

  it("treats a set carrying only reps as strength-shaped", () => {
    // A partially-filled strength set still must not land on a timed exercise.
    const result = canReassignTo(
      source({ loggedSets: [strengthSet({ actualWeightKg: null, rir: null })] }),
      candidate({ prescriptionType: "duration" }),
    );

    expect(result.ok).toBe(false);
  });
});

describe("canReassignTo — swaps must be legal in BOTH directions", () => {
  it("refuses a swap when the target's sets would not fit here", () => {
    // Curl martillo (strength) ↔ Escalera (duration): moving my sets there is
    // already refused, but so is bringing its timed sets back to a strength
    // exercise. Either half being illegal makes the whole swap illegal.
    const result = canReassignTo(
      source({ prescriptionType: "strength" }),
      candidate({ prescriptionType: "duration", loggedSets: [durationSet({ id: "other-1" })] }),
    );

    expect(result.ok).toBe(false);
  });

  it("refuses a swap when the target's per-side sets would not fit a bilateral exercise", () => {
    const result = canReassignTo(
      source({ isUnilateral: false }),
      candidate({
        isUnilateral: true,
        loggedSets: [strengthSet({ id: "o1", side: "left" }), strengthSet({ id: "o2", side: "right" })],
      }),
    );

    expect(result.ok).toBe(false);
  });

  it("allows the real case: two bilateral strength exercises holding each other's work", () => {
    // Reported from production — the entries under "Biceps en polea" belong to
    // "Curl martillo con mancuernas", and vice versa.
    const result = canReassignTo(
      source({ loggedSets: [strengthSet({ actualWeightKg: "10" })] }),
      candidate({
        exerciseNameEs: "Curl martillo con mancuernas",
        loggedSets: [strengthSet({ id: "other-1", actualWeightKg: "45" })],
      }),
    );

    expect(result).toEqual({ ok: true, mode: "swap" });
  });
});

describe("reassignOptionsFor", () => {
  const candidates: ReassignCandidate[] = [
    candidate({ id: "presc-source", exerciseNameEs: "Curl martillo" }),
    candidate({ id: "presc-a", exerciseNameEs: "Fondos en máquina" }),
    candidate({ id: "presc-b", exerciseNameEs: "Escalera (finalizador)", prescriptionType: "duration" }),
    candidate({ id: "presc-c", exerciseNameEs: "Biceps en polea", loggedSets: [strengthSet({ id: "other-1" })] }),
  ];

  it("excludes the source but keeps every other exercise, in plan order", () => {
    const options = reassignOptionsFor(source(), candidates);

    expect(options.map((option) => option.id)).toEqual(["presc-a", "presc-b", "presc-c"]);
  });

  it("returns unavailable options with their reason rather than hiding them", () => {
    // Someone hunting for the exercise they meant needs to see it and read why
    // it is refused, not wonder why it vanished from the list.
    const options = reassignOptionsFor(source(), candidates);

    expect(options.find((option) => option.id === "presc-a")).toMatchObject({ ok: true });
    expect(options.find((option) => option.id === "presc-b")).toMatchObject({ ok: false });
    expect(options.find((option) => option.id === "presc-c")).toMatchObject({ ok: true, mode: "swap" });
  });

  it("returns an empty list when the session has only this exercise", () => {
    expect(reassignOptionsFor(source(), [candidate({ id: "presc-source" })])).toEqual([]);
  });
});
