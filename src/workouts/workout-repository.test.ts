import { describe, expect, it } from "vitest";

import { isStrengthSetLog, toStrengthSetLog, type SetLog } from "./workout-repository";

/**
 * DB repository functions are untested by convention in this project — there
 * is no database-mocking harness and inventing one for a guard is not worth
 * it. `isStrengthSetLog` and `toStrengthSetLog` are pure functions that happen
 * to live in this file, so they are testable exactly like anything in
 * `src/training/`. This file covers only those two.
 *
 * The behaviour being pinned is a production crash: a prescription typed
 * "strength" whose logged sets carried null weight/reps/RIR reached
 * `buildProgressionSuggestion`, which maps `toStrengthSetLog` over them.
 * `session-runner.tsx` is a client component, so the throw landed mid-React-
 * render and blanked an entire workout screen. Sentry's source-mapped trace:
 *
 *   at toStrengthSetLog (src/workouts/workout-repository.ts:41:15)
 *   at Array.map (<anonymous>)
 *   at buildProgressionSuggestion (src/workouts/progression-view.ts:73:29)
 *   at renderWithHooks (react-dom-client.production.js)
 */

function setLog(overrides: Partial<SetLog> = {}): SetLog {
  return {
    id: "set-1",
    exerciseLogId: "exlog-1",
    setNumber: 1,
    side: null,
    actualWeightKg: "60",
    actualReps: 10,
    rir: 2,
    actualDurationSeconds: null,
    painScore: 0,
    painLocation: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as SetLog;
}

describe("isStrengthSetLog", () => {
  it("accepts a set carrying weight, reps and RIR", () => {
    expect(isStrengthSetLog(setLog())).toBe(true);
  });

  it("rejects a set with no weight", () => {
    expect(isStrengthSetLog(setLog({ actualWeightKg: null }))).toBe(false);
  });

  it("rejects a set with no reps", () => {
    expect(isStrengthSetLog(setLog({ actualReps: null }))).toBe(false);
  });

  it("rejects a set with no RIR", () => {
    expect(isStrengthSetLog(setLog({ rir: null }))).toBe(false);
  });

  it("rejects a duration-shaped set — the exact row that caused the crash", () => {
    // `saveSet` writes weight/reps/RIR null and a duration when the
    // prescription is duration-type. Such a row read back under a
    // prescription that now says "strength" is what took the page down.
    const durationSet = setLog({
      actualWeightKg: null,
      actualReps: null,
      rir: null,
      actualDurationSeconds: 45,
    });

    expect(isStrengthSetLog(durationSet)).toBe(false);
  });

  it("accepts a set at zero weight, which is legitimate and not missing", () => {
    // Bodyweight and assisted work log 0 kg. Zero must not be confused with
    // null — a truthiness check here would wrongly discard real sets.
    expect(isStrengthSetLog(setLog({ actualWeightKg: "0", actualReps: 12, rir: 0 }))).toBe(true);
  });

  it("accepts RIR 0, which means failure and is a real value", () => {
    expect(isStrengthSetLog(setLog({ rir: 0 }))).toBe(true);
  });
});

describe("toStrengthSetLog", () => {
  it("returns the set unchanged when it is strength-shaped", () => {
    const set = setLog();
    expect(toStrengthSetLog(set)).toBe(set);
  });

  it("still throws on a malformed set — this assertion is deliberate", () => {
    // The guard in getPreviousPerformance stops bad data reaching here; it
    // does not make this lenient. Defaulting nulls to 0 would quietly corrupt
    // volume-load and progression maths instead of surfacing a bug.
    expect(() => toStrengthSetLog(setLog({ rir: null }))).toThrow(/strength-type set/);
  });
});
