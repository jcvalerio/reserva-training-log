import { describe, expect, it } from "vitest";

import { buildConsistencyBars, buildConsistencySummary } from "./consistency";
import type { CompletedSessionSummary, WorkoutSession } from "./workout-repository";

function buildSession(overrides: Partial<WorkoutSession> = {}): WorkoutSession {
  return {
    id: "session-1",
    athleteProfileId: "profile-1",
    workoutPlanId: "plan-1",
    planSessionTemplateId: "template-1",
    status: "completed",
    startedAt: new Date("2026-07-20T12:00:00"),
    completedAt: new Date("2026-07-20T13:00:00"),
    notes: null,
    sessionRpe: null,
    createdAt: new Date("2026-07-20T12:00:00"),
    updatedAt: new Date("2026-07-20T13:00:00"),
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

// A Wednesday, so its Monday-start week is unambiguous in every test below.
const NOW = new Date("2026-07-22T12:00:00");

describe("buildConsistencySummary", () => {
  it("counts distinct calendar days trained in the current week, not session count", () => {
    const sessions = [
      buildSummary({ completedAt: new Date("2026-07-20T09:00:00") }),
      buildSummary({ completedAt: new Date("2026-07-20T18:00:00") }), // same day as above
      buildSummary({ completedAt: new Date("2026-07-21T09:00:00") }),
    ];

    const summary = buildConsistencySummary(sessions, 5, 8, NOW);

    expect(summary.currentWeekDaysTrained).toBe(2);
    expect(summary.targetDaysPerWeek).toBe(5);
  });

  it("buckets sessions into their own Monday-start week, oldest first", () => {
    const sessions = [
      buildSummary({ completedAt: new Date("2026-07-13T09:00:00") }), // previous week
      buildSummary({ completedAt: new Date("2026-07-20T09:00:00") }), // current week
    ];

    const summary = buildConsistencySummary(sessions, 5, 2, NOW);

    expect(summary.weeks).toHaveLength(2);
    expect(summary.weeks[0]!.daysTrained).toBe(1);
    expect(summary.weeks[0]!.weekStartDate).toEqual(new Date("2026-07-13T00:00:00"));
    expect(summary.weeks[1]!.daysTrained).toBe(1);
    expect(summary.weeks[1]!.weekStartDate).toEqual(new Date("2026-07-20T00:00:00"));
  });

  it("includes weeks with zero sessions rather than skipping them", () => {
    const summary = buildConsistencySummary([], 5, 4, NOW);

    expect(summary.weeks).toHaveLength(4);
    expect(summary.weeks.every((week) => week.daysTrained === 0)).toBe(true);
    expect(summary.currentWeekDaysTrained).toBe(0);
  });

  it("ignores sessions outside the requested weeksBack window", () => {
    const sessions = [buildSummary({ completedAt: new Date("2026-01-01T09:00:00") })];

    const summary = buildConsistencySummary(sessions, 5, 4, NOW);

    expect(summary.weeks.every((week) => week.daysTrained === 0)).toBe(true);
  });

  it("skips sessions with no completedAt", () => {
    const sessions = [buildSummary({ completedAt: null })];

    const summary = buildConsistencySummary(sessions, 5, 4, NOW);

    expect(summary.weeks.every((week) => week.daysTrained === 0)).toBe(true);
  });
});

describe("buildConsistencyBars", () => {
  it("flags a bar as met only when daysTrained reaches the target", () => {
    const sessions = [
      buildSummary({ completedAt: new Date("2026-07-13T09:00:00") }),
      buildSummary({ completedAt: new Date("2026-07-20T09:00:00") }),
      buildSummary({ completedAt: new Date("2026-07-21T09:00:00") }),
    ];
    const summary = buildConsistencySummary(sessions, 2, 2, NOW);

    const bars = buildConsistencyBars(summary);

    expect(bars).toHaveLength(2);
    expect(bars[0]).toMatchObject({ value: 1, valueLabel: "1 día", met: false });
    expect(bars[1]).toMatchObject({ value: 2, valueLabel: "2 días", met: true });
  });
});
