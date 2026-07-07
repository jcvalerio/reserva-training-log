import { generatedWorkoutPlanSchema, type GeneratedWorkoutPlan } from "./generated-plan-schema";

const baseSessions = [
  {
    dayIndex: 1,
    nameEs: "Pierna — cuádriceps y pantorrilla",
    focus: "Cuádriceps, pantorrilla y unilateral controlado",
    exercises: [
      ["Prensa de piernas", "main", "bilateral", 4, 8, 12, 2, 150],
      ["Prensa unilateral", "accessory", "unilateral_matched", 3, 10, 12, 2, 120],
      ["Extensión de piernas", "accessory", "bilateral", 3, 12, 15, 2, 90],
      ["Elevación de pantorrillas", "accessory", "bilateral", 4, 10, 15, 2, 75],
    ],
  },
  {
    dayIndex: 2,
    nameEs: "Torso — empuje seguro",
    focus: "Pecho, tríceps y hombro con control de dolor",
    exercises: [
      ["Press de pecho en máquina", "main", "bilateral", 4, 8, 12, 2, 150],
      ["Press inclinado con mancuernas neutras", "accessory", "bilateral", 3, 8, 12, 2, 120],
      ["Elevaciones laterales en cable", "accessory", "bilateral", 3, 12, 20, 3, 75],
      ["Tríceps en cuerda", "accessory", "bilateral", 3, 10, 15, 2, 75],
    ],
  },
  {
    dayIndex: 3,
    nameEs: "Tirón — espalda y bíceps",
    focus: "Dorsal, remos y brazos sin irritar hombro",
    exercises: [
      ["Jalón al pecho agarre neutro", "main", "bilateral", 4, 8, 12, 2, 150],
      ["Remo sentado en cable", "main", "bilateral", 4, 8, 12, 2, 150],
      ["Pullover en cable", "accessory", "bilateral", 3, 12, 15, 2, 90],
      ["Curl de bíceps en cable", "accessory", "bilateral", 3, 10, 15, 2, 75],
    ],
  },
  {
    dayIndex: 4,
    nameEs: "Pierna — posterior y glúteo",
    focus: "Femoral, glúteo y estabilidad",
    exercises: [
      ["Curl femoral sentado", "main", "bilateral", 4, 8, 12, 2, 120],
      ["Hack squat controlado", "main", "bilateral", 3, 8, 10, 2, 150],
      ["Peso muerto rumano con mancuernas", "accessory", "bilateral", 3, 8, 12, 3, 150],
      ["Pantorrilla sentado", "accessory", "bilateral", 4, 12, 20, 2, 75],
    ],
  },
  {
    dayIndex: 5,
    nameEs: "Upper/lower accesorio",
    focus: "Volumen extra, brazos, deltoides y movilidad",
    exercises: [
      ["Remo pecho apoyado", "main", "bilateral", 3, 8, 12, 2, 120],
      ["Press de pecho en cable", "accessory", "bilateral", 3, 10, 15, 2, 90],
      ["Extensión unilateral de pierna", "accessory", "unilateral_matched", 3, 12, 15, 2, 75],
      ["Face pull", "mobility", "bilateral", 3, 12, 20, 3, 60],
    ],
  },
] as const;

export function createSeededHypertrophyPlan(): GeneratedWorkoutPlan {
  return generatedWorkoutPlanSchema.parse({
    schemaVersion: 1,
    locale: "es",
    nameEs: "Plan base 5 días — hipertrofia",
    goal: "hypertrophy",
    durationWeeks: 4,
    daysPerWeek: 5,
    sessionDurationMinutes: 60,
    safetySummaryEs:
      "Plan base editable: registra dolor en cada serie, evita progresar con dolor sobre 2 y modifica ejercicios con dolor sobre 3.",
    weeks: Array.from({ length: 4 }, (_, weekIndex) => ({
      weekNumber: weekIndex + 1,
      sessions: baseSessions.map((session) => ({
        weekNumber: weekIndex + 1,
        dayIndex: session.dayIndex,
        nameEs: session.nameEs,
        focus: session.focus,
        estimatedDurationMinutes: 60,
        mobilityNotesEs: "Incluye 5-8 minutos de movilidad específica y calentamiento progresivo.",
        exercises: session.exercises.map(
          ([exerciseNameEs, phase, sideMode, targetSets, targetRepMin, targetRepMax, targetRir, restSeconds]) => ({
            exerciseNameEs,
            phase,
            sideMode,
            targetSets,
            targetRepMin,
            targetRepMax,
            targetRir,
            restSeconds,
            notesEs: "Ajusta la carga usando tus pesos base y conserva técnica estricta.",
            painSensitive: exerciseNameEs.toLowerCase().includes("press"),
            substitutionOptionsEs: ["Máquina equivalente", "Cable equivalente"],
          }),
        ),
      })),
    })),
  });
}
