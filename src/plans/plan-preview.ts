import type { GeneratedWorkoutPlan } from "./generated-plan-schema";

type GeneratedPlanSession = GeneratedWorkoutPlan["weeks"][number]["sessions"][number];

export type PlanPreviewExerciseSummary = {
  orderIndex: number;
  nameEs: string;
  phaseLabelEs: string;
  sideModeLabelEs: string;
  targetSets: number;
  targetRepMin: number;
  targetRepMax: number;
  targetRir: 0 | 1 | 2 | 3 | 4;
  restSeconds: number;
  painSensitive: boolean;
  substitutionOptionsEs: string[];
};

export type PlanPreviewSessionSummary = {
  dayIndex: number;
  nameEs: string;
  focus: string;
  exerciseCount: number;
  unilateralExerciseCount: number;
  painSensitiveExerciseCount: number;
  exercises: PlanPreviewExerciseSummary[];
};

export type PlanPreviewSummary = {
  nameEs: string;
  durationWeeks: number;
  daysPerWeek: number;
  sessionDurationMinutes: number;
  firstWeekExerciseCount: number;
  firstWeekUnilateralExerciseCount: number;
  firstWeekPainSensitiveExerciseCount: number;
  requiredSetLogFieldsEs: readonly string[];
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
    requiredSetLogFieldsEs: ["kg", "reps", "RIR", "dolor", "notas opcionales"],
    firstWeekSessions,
  };
}

function getSessionPreviewSummary(session: GeneratedPlanSession): PlanPreviewSessionSummary {
  const exercises = session.exercises.map((exercise, index) => ({
    orderIndex: index + 1,
    nameEs: exercise.exerciseNameEs,
    phaseLabelEs: phaseLabelsEs[exercise.phase],
    sideModeLabelEs: sideModeLabelsEs[exercise.sideMode],
    targetSets: exercise.targetSets,
    targetRepMin: exercise.targetRepMin,
    targetRepMax: exercise.targetRepMax,
    targetRir: exercise.targetRir,
    restSeconds: exercise.restSeconds,
    painSensitive: exercise.painSensitive,
    substitutionOptionsEs: exercise.substitutionOptionsEs,
  }));

  return {
    dayIndex: session.dayIndex,
    nameEs: session.nameEs,
    focus: session.focus,
    exerciseCount: exercises.length,
    unilateralExerciseCount: session.exercises.filter((exercise) => exercise.sideMode !== "bilateral").length,
    painSensitiveExerciseCount: exercises.filter((exercise) => exercise.painSensitive).length,
    exercises,
  };
}

const phaseLabelsEs = {
  warmup: "calentamiento",
  main: "principal",
  accessory: "accesorio",
  mobility: "movilidad",
} as const;

const sideModeLabelsEs = {
  bilateral: "bilateral",
  unilateral_separate: "unilateral separado",
  unilateral_matched: "unilateral pareado",
} as const;
