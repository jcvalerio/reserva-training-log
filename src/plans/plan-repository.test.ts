import { describe, expect, it } from "vitest";

import type { GeneratedWorkoutPlan } from "./generated-plan-schema";
import type { ActivePlanWithSessions, ExercisePrescription, PlanSessionTemplate, WorkoutPlan } from "./plan-repository";
import { toGeneratedWorkoutPlan } from "./plan-repository";
import { createSeededHypertrophyPlan } from "./seeded-plan";

function toActivePlanWithSessions(plan: GeneratedWorkoutPlan): ActivePlanWithSessions {
  const planRow: WorkoutPlan = {
    id: "plan-1",
    athleteProfileId: "profile-1",
    nameEs: plan.nameEs,
    nameEn: plan.nameEn ?? null,
    goal: plan.goal,
    durationWeeks: plan.durationWeeks,
    daysPerWeek: plan.daysPerWeek,
    sessionDurationMinutes: plan.sessionDurationMinutes,
    locale: plan.locale,
    safetySummaryEs: plan.safetySummaryEs,
    status: "active",
    activatedAt: new Date("2026-07-20T12:00:00Z"),
    createdAt: new Date("2026-07-20T12:00:00Z"),
    updatedAt: new Date("2026-07-20T12:00:00Z"),
  };

  const sessions = plan.weeks.flatMap((week, weekIndex) =>
    week.sessions.map((session, sessionIndex) => {
      const templateId = `template-${weekIndex}-${sessionIndex}`;
      const template: PlanSessionTemplate = {
        id: templateId,
        workoutPlanId: planRow.id,
        weekNumber: session.weekNumber,
        dayIndex: session.dayIndex,
        nameEs: session.nameEs,
        nameEn: session.nameEn ?? null,
        focus: session.focus,
        estimatedDurationMinutes: session.estimatedDurationMinutes,
        mobilityNotesEs: session.mobilityNotesEs,
      };

      const exercises: ExercisePrescription[] = session.exercises.map((exercise, exerciseIndex) => ({
        id: `exercise-${weekIndex}-${sessionIndex}-${exerciseIndex}`,
        planSessionTemplateId: templateId,
        orderIndex: exerciseIndex + 1,
        exerciseNameEs: exercise.exerciseNameEs,
        exerciseNameEn: exercise.exerciseNameEn ?? null,
        phase: exercise.phase,
        sideMode: exercise.sideMode,
        targetSets: exercise.targetSets,
        targetRepMin: exercise.targetRepMin,
        targetRepMax: exercise.targetRepMax,
        targetRir: exercise.targetRir,
        restSeconds: exercise.restSeconds,
        notesEs: exercise.notesEs,
        notesEn: exercise.notesEn ?? null,
        painSensitive: exercise.painSensitive,
        substitutionOptionsEs: exercise.substitutionOptionsEs,
        incrementCategory: exercise.incrementCategory ?? null,
      }));

      return { template, exercises };
    }),
  );

  return { plan: planRow, sessions };
}

describe("toGeneratedWorkoutPlan", () => {
  it("round-trips a full relational plan back into the exact seeded GeneratedWorkoutPlan shape", () => {
    const seeded = createSeededHypertrophyPlan();
    const active = toActivePlanWithSessions(seeded);

    const mapped = toGeneratedWorkoutPlan(active);

    expect(mapped).toEqual(seeded);
  });

  it("re-sorts sessions and exercises by dayIndex/orderIndex regardless of input row order", () => {
    const seeded = createSeededHypertrophyPlan();
    const active = toActivePlanWithSessions(seeded);

    // Shuffle session order and reverse one session's exercises to prove the
    // mapper sorts explicitly rather than trusting array insertion order.
    const shuffledSessions = [...active.sessions].reverse();
    shuffledSessions[0] = {
      ...shuffledSessions[0]!,
      exercises: [...shuffledSessions[0]!.exercises].reverse(),
    };

    const mapped = toGeneratedWorkoutPlan({ plan: active.plan, sessions: shuffledSessions });

    expect(mapped).toEqual(seeded);
  });

  it("coalesces nullable DB columns to undefined for optional Zod fields instead of passing null through", () => {
    const seeded = createSeededHypertrophyPlan();
    const active = toActivePlanWithSessions(seeded);

    // The seeded plan never sets the optional *_En fields, so every nullable
    // DB column here is already null — this exercises the null->undefined
    // coalescing the schema requires (it rejects null for .optional() fields).
    expect(() => toGeneratedWorkoutPlan(active)).not.toThrow();

    const mapped = toGeneratedWorkoutPlan(active);
    expect(mapped.nameEn).toBeUndefined();
    expect(mapped.weeks[0]?.sessions[0]?.nameEn).toBeUndefined();
    expect(mapped.weeks[0]?.sessions[0]?.exercises[0]?.exerciseNameEn).toBeUndefined();
    expect(mapped.weeks[0]?.sessions[0]?.exercises[0]?.notesEn).toBeUndefined();
  });
});
