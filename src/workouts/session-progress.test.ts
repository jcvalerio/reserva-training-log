import { describe, expect, it } from "vitest";

import type { ActivePlanWithSessions } from "@/plans/plan-repository";

import {
  buildEntrenarSessions,
  getLatestSessionByTemplateId,
  getSessionStatus,
  getSuggestedTemplateId,
} from "./session-progress";
import type { WorkoutSession } from "./workout-repository";

function buildSession(overrides: Partial<WorkoutSession> = {}): WorkoutSession {
  return {
    id: "session-1",
    athleteProfileId: "profile-1",
    workoutPlanId: "plan-1",
    planSessionTemplateId: "template-1",
    status: "active",
    startedAt: new Date("2026-07-20T12:00:00Z"),
    completedAt: null,
    notes: null,
    createdAt: new Date("2026-07-20T12:00:00Z"),
    updatedAt: new Date("2026-07-20T12:00:00Z"),
    ...overrides,
  };
}

describe("getSessionStatus", () => {
  it("returns not_started when there is no session yet", () => {
    expect(getSessionStatus(undefined)).toBe("not_started");
  });

  it("returns in_progress for an active session", () => {
    expect(getSessionStatus(buildSession({ status: "active" }))).toBe("in_progress");
  });

  it("returns completed for a completed session", () => {
    expect(getSessionStatus(buildSession({ status: "completed" }))).toBe("completed");
  });
});

describe("getLatestSessionByTemplateId", () => {
  it("prefers an active session over a completed one for the same template", () => {
    const completed = buildSession({ id: "s-completed", status: "completed", createdAt: new Date("2026-07-20") });
    const active = buildSession({ id: "s-active", status: "active", createdAt: new Date("2026-07-01") });

    const latest = getLatestSessionByTemplateId([completed, active]);

    expect(latest.get("template-1")?.id).toBe("s-active");
  });

  it("prefers the most recently created session among sessions with the same status", () => {
    const older = buildSession({ id: "s-older", status: "completed", createdAt: new Date("2026-07-01") });
    const newer = buildSession({ id: "s-newer", status: "completed", createdAt: new Date("2026-07-20") });

    const latest = getLatestSessionByTemplateId([older, newer]);

    expect(latest.get("template-1")?.id).toBe("s-newer");
  });

  it("keys sessions by their own planSessionTemplateId", () => {
    const sessionA = buildSession({ id: "s-a", planSessionTemplateId: "template-a" });
    const sessionB = buildSession({ id: "s-b", planSessionTemplateId: "template-b" });

    const latest = getLatestSessionByTemplateId([sessionA, sessionB]);

    expect(latest.get("template-a")?.id).toBe("s-a");
    expect(latest.get("template-b")?.id).toBe("s-b");
  });
});

describe("getSuggestedTemplateId", () => {
  it("returns null for an empty plan", () => {
    expect(getSuggestedTemplateId([], new Map())).toBeNull();
  });

  it("suggests the lowest-dayIndex template when a brand new plan has no sessions yet", () => {
    expect(getSuggestedTemplateId(["t1", "t2", "t3"], new Map())).toBe("t1");
  });

  it("always suggests an in-progress session, regardless of recency of others", () => {
    const latest = new Map<string, WorkoutSession>([
      ["t1", buildSession({ id: "s1", status: "completed", completedAt: new Date("2026-07-01") })],
      ["t2", buildSession({ id: "s2", status: "active", startedAt: new Date("2026-07-29") })],
    ]);

    expect(getSuggestedTemplateId(["t1", "t2"], latest)).toBe("t2");
  });

  it("breaks in-progress ties by lowest dayIndex (array order)", () => {
    const latest = new Map<string, WorkoutSession>([
      ["t1", buildSession({ id: "s1", status: "active", startedAt: new Date("2026-07-20") })],
      ["t2", buildSession({ id: "s2", status: "active", startedAt: new Date("2026-07-29") })],
    ]);

    expect(getSuggestedTemplateId(["t1", "t2"], latest)).toBe("t1");
  });

  it("suggests the template trained longest ago when nothing is in progress", () => {
    const latest = new Map<string, WorkoutSession>([
      ["t1", buildSession({ id: "s1", status: "completed", completedAt: new Date("2026-07-20") })],
      ["t2", buildSession({ id: "s2", status: "completed", completedAt: new Date("2026-07-01") })],
      ["t3", buildSession({ id: "s3", status: "completed", completedAt: new Date("2026-07-29") })],
    ]);

    expect(getSuggestedTemplateId(["t1", "t2", "t3"], latest)).toBe("t2");
  });

  it("treats a never-trained template as infinitely old, ahead of any completed template", () => {
    const latest = new Map<string, WorkoutSession>([
      ["t1", buildSession({ id: "s1", status: "completed", completedAt: new Date("2026-07-01") })],
    ]);

    expect(getSuggestedTemplateId(["t1", "t2"], latest)).toBe("t2");
  });

  it("never returns null for a non-empty plan, even once every session has been completed", () => {
    const latest = new Map<string, WorkoutSession>([
      ["t1", buildSession({ id: "s1", status: "completed", completedAt: new Date("2026-07-20") })],
      ["t2", buildSession({ id: "s2", status: "completed", completedAt: new Date("2026-07-21") })],
    ]);

    expect(getSuggestedTemplateId(["t1", "t2"], latest)).not.toBeNull();
  });
});

function buildActivePlan(): ActivePlanWithSessions {
  const plan = {
    id: "plan-1",
    athleteProfileId: "profile-1",
    nameEs: "Plan base",
    nameEn: null,
    goal: "hypertrophy",
    durationWeeks: 1,
    daysPerWeek: 2,
    sessionDurationMinutes: 60,
    locale: "es" as const,
    safetySummaryEs: "Registra dolor en cada serie.",
    status: "active" as const,
    activatedAt: new Date("2026-07-20T12:00:00Z"),
    createdAt: new Date("2026-07-20T12:00:00Z"),
    updatedAt: new Date("2026-07-20T12:00:00Z"),
  };

  const exerciseBase = {
    id: "exercise-1",
    orderIndex: 1,
    exerciseNameEs: "Prensa de piernas",
    exerciseNameEn: null,
    phase: "main" as const,
    sideMode: "bilateral" as const,
    targetSets: 4,
    targetRepMin: 8,
    targetRepMax: 12,
    targetRir: 2,
    restSeconds: 150,
    notesEs: "Ajusta la carga.",
    notesEn: null,
    painSensitive: false,
    substitutionOptionsEs: [],
    incrementCategory: "machine_or_lower_body" as const,
  };

  return {
    plan,
    sessions: [
      {
        template: {
          id: "template-d2",
          workoutPlanId: "plan-1",
          weekNumber: 1,
          dayIndex: 2,
          nameEs: "Torso",
          nameEn: null,
          focus: "Empuje",
          estimatedDurationMinutes: 60,
          mobilityNotesEs: "Movilidad.",
        },
        exercises: [{ ...exerciseBase, id: "exercise-2", planSessionTemplateId: "template-d2" }],
      },
      {
        template: {
          id: "template-d1",
          workoutPlanId: "plan-1",
          weekNumber: 1,
          dayIndex: 1,
          nameEs: "Pierna",
          nameEn: null,
          focus: "Cuádriceps",
          estimatedDurationMinutes: 60,
          mobilityNotesEs: "Movilidad.",
        },
        exercises: [{ ...exerciseBase, planSessionTemplateId: "template-d1" }],
      },
    ],
  };
}

describe("buildEntrenarSessions", () => {
  it("returns a flat list sorted by day, with status and suggestion flags", () => {
    const activePlan = buildActivePlan();
    const workoutSessions = [
      buildSession({ id: "s-completed", planSessionTemplateId: "template-d1", status: "completed" }),
    ];

    const sessions = buildEntrenarSessions(activePlan, workoutSessions);

    expect(sessions.map((session) => session.dayIndex)).toEqual([1, 2]);

    const [day1, day2] = sessions;
    expect(day1?.status).toBe("completed");
    expect(day1 && "sessionId" in day1 ? day1.sessionId : null).toBe("s-completed");
    expect(day1?.isSuggested).toBe(false);

    expect(day2?.status).toBe("not_started");
    expect(day2 && "sessionId" in day2).toBe(false);
    expect(day2?.isSuggested).toBe(true);
  });

  it("still suggests a session once every session has been completed, rotating to the least-recent one", () => {
    const activePlan = buildActivePlan();
    const workoutSessions = [
      buildSession({
        id: "s-d1",
        planSessionTemplateId: "template-d1",
        status: "completed",
        completedAt: new Date("2026-07-25T12:00:00Z"),
      }),
      buildSession({
        id: "s-d2",
        planSessionTemplateId: "template-d2",
        status: "completed",
        completedAt: new Date("2026-07-20T12:00:00Z"),
      }),
    ];

    const sessions = buildEntrenarSessions(activePlan, workoutSessions);

    expect(sessions.every((session) => session.status === "completed")).toBe(true);
    expect(sessions.find((session) => session.dayIndex === 2)?.isSuggested).toBe(true);
    expect(sessions.filter((session) => session.isSuggested)).toHaveLength(1);
  });
});
