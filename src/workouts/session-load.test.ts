import { describe, expect, it } from "vitest";

import { averageRecentTrainingLoad, computeSessionTrainingLoad } from "./session-load";
import type { CompletedSessionSummary, WorkoutSession } from "./workout-repository";

function buildSession(overrides: Partial<WorkoutSession> = {}): WorkoutSession {
  return {
    id: "session-1",
    athleteProfileId: "profile-1",
    workoutPlanId: "plan-1",
    planSessionTemplateId: "template-1",
    status: "completed",
    startedAt: new Date("2026-07-20T12:00:00Z"),
    completedAt: new Date("2026-07-20T13:00:00Z"),
    notes: null,
    sessionRpe: null,
    createdAt: new Date("2026-07-20T12:00:00Z"),
    updatedAt: new Date("2026-07-20T13:00:00Z"),
    ...overrides,
  };
}

const template = {
  id: "template-1",
  workoutPlanId: "plan-1",
  weekNumber: 1,
  dayIndex: 1,
  nameEs: "Pierna",
  nameEn: null,
  focus: "Cuádriceps",
  estimatedDurationMinutes: 60,
  mobilityNotesEs: "Movilidad.",
};

function buildSummary(overrides: Partial<WorkoutSession> = {}): CompletedSessionSummary {
  return { session: buildSession(overrides), template };
}

describe("computeSessionTrainingLoad", () => {
  it("multiplies RPE by session duration in minutes", () => {
    // 60 minutes at RPE 7 = 420.
    const load = computeSessionTrainingLoad(buildSession({ sessionRpe: 7 }));
    expect(load).toBe(420);
  });

  it("returns null when RPE was not logged", () => {
    const session = buildSession({ sessionRpe: null });
    expect(computeSessionTrainingLoad(session)).toBeNull();
  });

  it("returns null when startedAt or completedAt is missing", () => {
    expect(computeSessionTrainingLoad(buildSession({ sessionRpe: 5, startedAt: null }))).toBeNull();
    expect(computeSessionTrainingLoad(buildSession({ sessionRpe: 5, completedAt: null }))).toBeNull();
  });
});

describe("averageRecentTrainingLoad", () => {
  it("averages the load across the most recent sessions that have one", () => {
    const sessions = [
      buildSummary({ id: "s1", sessionRpe: 6 }), // 60min * 6 = 360
      buildSummary({ id: "s2", sessionRpe: 8 }), // 60min * 8 = 480
    ];

    expect(averageRecentTrainingLoad(sessions)).toBe(420);
  });

  it("skips sessions with no computable load rather than treating them as zero", () => {
    const sessions = [buildSummary({ id: "s1", sessionRpe: 6 }), buildSummary({ id: "s2", sessionRpe: null })];

    // Only s1 (360) counts; s2 is skipped, not averaged in as 0.
    expect(averageRecentTrainingLoad(sessions)).toBe(360);
  });

  it("returns null when no session has a computable load", () => {
    const sessions = [buildSummary({ sessionRpe: null })];

    expect(averageRecentTrainingLoad(sessions)).toBeNull();
  });
});
