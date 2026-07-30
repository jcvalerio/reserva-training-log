import { generatedWorkoutPlanSchema, type GeneratedWorkoutPlan } from "./generated-plan-schema";

// incrementCategory classification (docs/product/progression-rules.md "Suggested increase"):
// - machine_or_lower_body: any fixed-machine or cable-stack compound movement
//   (multi-joint, seated/plate-loaded/cable), regardless of upper/lower body.
// - upper_compound: free-weight barbell-style upper-body compounds. Unused by
//   this seeded plan today (no barbell work in it) but kept for future plans.
// - isolation: single-joint movements regardless of equipment (curls,
//   extensions, lateral raises, pushdowns, pullovers, face pulls).
// - dumbbell: free-dumbbell movements, which increment in fixed physical
//   steps rather than a percentage.
const baseSessions = [
  {
    dayIndex: 1,
    nameEs: "Pierna — cuádriceps y pantorrilla",
    focus: "Cuádriceps, pantorrilla y unilateral controlado",
    exercises: [
      ["Prensa de piernas", "main", "bilateral", 4, 8, 12, 2, 150, "machine_or_lower_body"],
      ["Prensa unilateral", "accessory", "unilateral_matched", 3, 10, 12, 2, 120, "machine_or_lower_body"],
      ["Extensión de piernas", "accessory", "bilateral", 3, 12, 15, 2, 90, "isolation"],
      ["Elevación de pantorrillas", "accessory", "bilateral", 4, 10, 15, 2, 75, "machine_or_lower_body"],
    ],
  },
  {
    dayIndex: 2,
    nameEs: "Torso — empuje seguro",
    focus: "Pecho, tríceps y hombro con control de dolor",
    exercises: [
      ["Press de pecho en máquina", "main", "bilateral", 4, 8, 12, 2, 150, "machine_or_lower_body"],
      ["Press inclinado con mancuernas neutras", "accessory", "bilateral", 3, 8, 12, 2, 120, "dumbbell"],
      ["Elevaciones laterales en cable", "accessory", "bilateral", 3, 12, 20, 3, 75, "isolation"],
      ["Tríceps en cuerda", "accessory", "bilateral", 3, 10, 15, 2, 75, "isolation"],
    ],
  },
  {
    dayIndex: 3,
    nameEs: "Tirón — espalda y bíceps",
    focus: "Dorsal, remos y brazos sin irritar hombro",
    exercises: [
      ["Jalón al pecho agarre neutro", "main", "bilateral", 4, 8, 12, 2, 150, "machine_or_lower_body"],
      ["Remo sentado en cable", "main", "bilateral", 4, 8, 12, 2, 150, "machine_or_lower_body"],
      ["Pullover en cable", "accessory", "bilateral", 3, 12, 15, 2, 90, "isolation"],
      ["Curl de bíceps en cable", "accessory", "bilateral", 3, 10, 15, 2, 75, "isolation"],
    ],
  },
  {
    dayIndex: 4,
    nameEs: "Pierna — posterior y glúteo",
    focus: "Femoral, glúteo y estabilidad",
    exercises: [
      ["Curl femoral sentado", "main", "bilateral", 4, 8, 12, 2, 120, "machine_or_lower_body"],
      ["Hack squat controlado", "main", "bilateral", 3, 8, 10, 2, 150, "machine_or_lower_body"],
      ["Peso muerto rumano con mancuernas", "accessory", "bilateral", 3, 8, 12, 3, 150, "dumbbell"],
      ["Pantorrilla sentado", "accessory", "bilateral", 4, 12, 20, 2, 75, "machine_or_lower_body"],
    ],
  },
  {
    dayIndex: 5,
    nameEs: "Upper/lower accesorio",
    focus: "Volumen extra, brazos, deltoides y movilidad",
    exercises: [
      ["Remo pecho apoyado", "main", "bilateral", 3, 8, 12, 2, 120, "machine_or_lower_body"],
      ["Press de pecho en cable", "accessory", "bilateral", 3, 10, 15, 2, 90, "machine_or_lower_body"],
      ["Extensión unilateral de pierna", "accessory", "unilateral_matched", 3, 12, 15, 2, 75, "isolation"],
      ["Face pull", "mobility", "bilateral", 3, 12, 20, 3, 60, "isolation"],
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
          ([
            exerciseNameEs,
            phase,
            sideMode,
            targetSets,
            targetRepMin,
            targetRepMax,
            targetRir,
            restSeconds,
            incrementCategory,
          ]) => ({
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
            incrementCategory,
          }),
        ),
      })),
    })),
  });
}
