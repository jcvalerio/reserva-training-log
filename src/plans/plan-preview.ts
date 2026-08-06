import type { GeneratedWorkoutPlan } from "./generated-plan-schema";

type GeneratedPlanSession = GeneratedWorkoutPlan["sessions"][number];

export type PlanPreviewExerciseSummary = {
  orderIndex: number;
  nameEs: string;
  nameEn: string | null;
  phaseLabelEs: string;
  sideLabelEs: string;
  prescriptionType: "strength" | "duration";
  targetSets: number;
  targetRepMin: number | null;
  targetRepMax: number | null;
  targetRir: 0 | 1 | 2 | 3 | 4 | null;
  durationSeconds: number | null;
  restSeconds: number;
  painSensitive: boolean;
  substitutionOptionsEs: string[];
  notesEs: string;
};

export type PlanPreviewSessionSummary = {
  dayIndex: number;
  nameEs: string;
  focus: string;
  exerciseCount: number;
  unilateralExerciseCount: number;
  painSensitiveExerciseCount: number;
  mobilityNotesEs: string;
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
  safetySummaryEs: string;
  sessions: PlanPreviewSessionSummary[];
};

export function getPlanPreviewSummary(plan: GeneratedWorkoutPlan): PlanPreviewSummary {
  const sessions = plan.sessions.map(getSessionPreviewSummary);
  const hasDurationExercises = sessions.some((session) =>
    session.exercises.some((exercise) => exercise.prescriptionType === "duration"),
  );

  return {
    nameEs: plan.nameEs,
    daysPerWeek: plan.daysPerWeek,
    sessionDurationMinutes: plan.sessionDurationMinutes,
    exerciseCount: sessions.reduce((total, session) => total + session.exerciseCount, 0),
    unilateralExerciseCount: sessions.reduce((total, session) => total + session.unilateralExerciseCount, 0),
    painSensitiveExerciseCount: sessions.reduce((total, session) => total + session.painSensitiveExerciseCount, 0),
    // "No activable" was dropped: this preview's own CTA does activate the
    // plan for real. These describe its current state, not a limitation.
    // ("Vista previa" is deliberately not reused here — the section heading
    // right above these badges already says exactly that.)
    previewBoundaryLabelsEs: ["Solo lectura", "Aún no activado"],
    // Duration-type exercises (calentamientos de cardio, movilidad) log a
    // duración instead of reps/RIR — included whenever the plan has any.
    requiredSetLogFieldsEs: hasDurationExercises
      ? ["kg", "reps", "RIR", "duración", "dolor", "notas opcionales"]
      : ["kg", "reps", "RIR", "dolor", "notas opcionales"],
    safetySummaryEs: plan.safetySummaryEs,
    sessions,
  };
}

function getSessionPreviewSummary(session: GeneratedPlanSession): PlanPreviewSessionSummary {
  const exercises = session.exercises.map((exercise, index) => ({
    orderIndex: index + 1,
    nameEs: exercise.exerciseNameEs,
    nameEn: exercise.exerciseNameEn ?? null,
    phaseLabelEs: phaseLabelsEs[exercise.phase],
    sideLabelEs: exercise.isUnilateral ? "unilateral" : "bilateral",
    prescriptionType: exercise.prescriptionType,
    targetSets: exercise.targetSets,
    targetRepMin: exercise.prescriptionType === "strength" ? exercise.targetRepMin : null,
    targetRepMax: exercise.prescriptionType === "strength" ? exercise.targetRepMax : null,
    targetRir: exercise.prescriptionType === "strength" ? exercise.targetRir : null,
    durationSeconds: exercise.prescriptionType === "duration" ? exercise.durationSeconds : null,
    restSeconds: exercise.restSeconds,
    painSensitive: exercise.painSensitive,
    substitutionOptionsEs: exercise.substitutionOptionsEs,
    notesEs: exercise.notesEs,
  }));

  return {
    dayIndex: session.dayIndex,
    nameEs: session.nameEs,
    focus: session.focus,
    exerciseCount: exercises.length,
    unilateralExerciseCount: session.exercises.filter((exercise) => exercise.isUnilateral).length,
    painSensitiveExerciseCount: exercises.filter((exercise) => exercise.painSensitive).length,
    mobilityNotesEs: session.mobilityNotesEs,
    exercises,
  };
}

const phaseLabelsEs = {
  warmup: "calentamiento",
  main: "principal",
  accessory: "accesorio",
  mobility: "movilidad",
} as const;
