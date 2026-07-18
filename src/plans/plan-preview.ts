import type { GeneratedWorkoutPlan } from "./generated-plan-schema";

type GeneratedPlanSession = GeneratedWorkoutPlan["weeks"][number]["sessions"][number];

export type PlanPreviewSessionSummary = {
  dayIndex: number;
  nameEs: string;
  focus: string;
  exerciseCount: number;
  unilateralExerciseCount: number;
  painSensitiveExerciseCount: number;
};

export type PlanPreviewSummary = {
  nameEs: string;
  durationWeeks: number;
  daysPerWeek: number;
  sessionDurationMinutes: number;
  firstWeekExerciseCount: number;
  firstWeekUnilateralExerciseCount: number;
  firstWeekPainSensitiveExerciseCount: number;
  firstWeekSessions: PlanPreviewSessionSummary[];
};

export function getPlanPreviewSummary(plan: GeneratedWorkoutPlan): PlanPreviewSummary {
  const firstWeek = plan.weeks.find((week) => week.weekNumber === 1) ?? plan.weeks[0];
  const firstWeekSessions = firstWeek.sessions.map(getSessionPreviewSummary);

  return {
    nameEs: plan.nameEs,
    durationWeeks: plan.durationWeeks,
    daysPerWeek: plan.daysPerWeek,
    sessionDurationMinutes: plan.sessionDurationMinutes,
    firstWeekExerciseCount: firstWeekSessions.reduce((total, session) => total + session.exerciseCount, 0),
    firstWeekUnilateralExerciseCount: firstWeekSessions.reduce(
      (total, session) => total + session.unilateralExerciseCount,
      0,
    ),
    firstWeekPainSensitiveExerciseCount: firstWeekSessions.reduce(
      (total, session) => total + session.painSensitiveExerciseCount,
      0,
    ),
    firstWeekSessions,
  };
}

function getSessionPreviewSummary(session: GeneratedPlanSession): PlanPreviewSessionSummary {
  return {
    dayIndex: session.dayIndex,
    nameEs: session.nameEs,
    focus: session.focus,
    exerciseCount: session.exercises.length,
    unilateralExerciseCount: session.exercises.filter((exercise) => exercise.sideMode !== "bilateral").length,
    painSensitiveExerciseCount: session.exercises.filter((exercise) => exercise.painSensitive).length,
  };
}
