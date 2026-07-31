import type { GeneratedWorkoutPlan } from "./generated-plan-schema";

type GeneratedPlanSession = GeneratedWorkoutPlan["sessions"][number];

export type PlanPreviewExerciseSummary = {
  orderIndex: number;
  nameEs: string;
  phaseLabelEs: string;
  sideLabelEs: string;
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
  daysPerWeek: number;
  sessionDurationMinutes: number;
  exerciseCount: number;
  unilateralExerciseCount: number;
  painSensitiveExerciseCount: number;
  previewBoundaryLabelsEs: readonly string[];
  requiredSetLogFieldsEs: readonly string[];
  sessions: PlanPreviewSessionSummary[];
};

export function getPlanPreviewSummary(plan: GeneratedWorkoutPlan): PlanPreviewSummary {
  const sessions = plan.sessions.map(getSessionPreviewSummary);

  return {
    nameEs: plan.nameEs,
    daysPerWeek: plan.daysPerWeek,
    sessionDurationMinutes: plan.sessionDurationMinutes,
    exerciseCount: sessions.reduce((total, session) => total + session.exerciseCount, 0),
    unilateralExerciseCount: sessions.reduce((total, session) => total + session.unilateralExerciseCount, 0),
    painSensitiveExerciseCount: sessions.reduce((total, session) => total + session.painSensitiveExerciseCount, 0),
    previewBoundaryLabelsEs: ["Solo lectura", "Sin IA", "No guardado", "No activable"],
    requiredSetLogFieldsEs: ["kg", "reps", "RIR", "dolor", "notas opcionales"],
    sessions,
  };
}

function getSessionPreviewSummary(session: GeneratedPlanSession): PlanPreviewSessionSummary {
  const exercises = session.exercises.map((exercise, index) => ({
    orderIndex: index + 1,
    nameEs: exercise.exerciseNameEs,
    phaseLabelEs: phaseLabelsEs[exercise.phase],
    sideLabelEs: exercise.isUnilateral ? "unilateral" : "bilateral",
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
    unilateralExerciseCount: session.exercises.filter((exercise) => exercise.isUnilateral).length,
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

