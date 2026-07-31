import { generatedWorkoutPlanSchema, type GeneratedWorkoutPlan } from "./generated-plan-schema";

// loadMechanism × isCompound classification (docs/product/progression-rules.md
// "Suggested increase"):
// - machine: any fixed-machine or cable-stack movement (multi-joint or
//   single-joint), regardless of upper/lower body — isCompound distinguishes
//   the two (true for multi-joint main/accessory lifts, false for isolation).
// - barbell: free-weight barbell-style compounds. Unused by this seeded plan
//   today (no barbell work in it) but kept for future plans.
// - dumbbell: free-dumbbell movements, which increment in fixed physical
//   steps rather than a percentage (isCompound doesn't affect that branch,
//   set true here since these are all compound presses/RDLs).
// - isCompound=false marks single-joint movements regardless of equipment
//   (curls, extensions, lateral raises, pushdowns, pullovers, face pulls).
const baseSessions = [
  {
    dayIndex: 1,
    nameEs: "Pierna — cuádriceps y pantorrilla",
    focus: "Cuádriceps, pantorrilla y unilateral controlado",
    exercises: [
      ["Prensa de piernas", "main", false, 4, 8, 12, 2, 150, "machine", true],
      ["Prensa unilateral", "accessory", true, 3, 10, 12, 2, 120, "machine", true],
      ["Extensión de piernas", "accessory", false, 3, 12, 15, 2, 90, "machine", false],
      ["Elevación de pantorrillas", "accessory", false, 4, 10, 15, 2, 75, "machine", true],
    ],
  },
  {
    dayIndex: 2,
    nameEs: "Torso — empuje seguro",
    focus: "Pecho, tríceps y hombro con control de dolor",
    exercises: [
      ["Press de pecho en máquina", "main", false, 4, 8, 12, 2, 150, "machine", true],
      ["Press inclinado con mancuernas neutras", "accessory", false, 3, 8, 12, 2, 120, "dumbbell", true],
      ["Elevaciones laterales en cable", "accessory", false, 3, 12, 20, 3, 75, "machine", false],
      ["Tríceps en cuerda", "accessory", false, 3, 10, 15, 2, 75, "machine", false],
    ],
  },
  {
    dayIndex: 3,
    nameEs: "Tirón — espalda y bíceps",
    focus: "Dorsal, remos y brazos sin irritar hombro",
    exercises: [
      ["Jalón al pecho agarre neutro", "main", false, 4, 8, 12, 2, 150, "machine", true],
      ["Remo sentado en cable", "main", false, 4, 8, 12, 2, 150, "machine", true],
      ["Pullover en cable", "accessory", false, 3, 12, 15, 2, 90, "machine", false],
      ["Curl de bíceps en cable", "accessory", false, 3, 10, 15, 2, 75, "machine", false],
    ],
  },
  {
    dayIndex: 4,
    nameEs: "Pierna — posterior y glúteo",
    focus: "Femoral, glúteo y estabilidad",
    exercises: [
      ["Curl femoral sentado", "main", false, 4, 8, 12, 2, 120, "machine", true],
      ["Hack squat controlado", "main", false, 3, 8, 10, 2, 150, "machine", true],
      ["Peso muerto rumano con mancuernas", "accessory", false, 3, 8, 12, 3, 150, "dumbbell", true],
      ["Pantorrilla sentado", "accessory", false, 4, 12, 20, 2, 75, "machine", true],
    ],
  },
  {
    dayIndex: 5,
    nameEs: "Upper/lower accesorio",
    focus: "Volumen extra, brazos, deltoides y movilidad",
    exercises: [
      ["Remo pecho apoyado", "main", false, 3, 8, 12, 2, 120, "machine", true],
      ["Press de pecho en cable", "accessory", false, 3, 10, 15, 2, 90, "machine", true],
      ["Extensión unilateral de pierna", "accessory", true, 3, 12, 15, 2, 75, "machine", false],
      ["Face pull", "mobility", false, 3, 12, 20, 3, 60, "machine", false],
    ],
  },
] as const;

export function createSeededHypertrophyPlan(): GeneratedWorkoutPlan {
  return generatedWorkoutPlanSchema.parse({
    schemaVersion: 1,
    locale: "es",
    nameEs: "Plan base 5 días — hipertrofia",
    goal: "hypertrophy",
    daysPerWeek: 5,
    sessionDurationMinutes: 60,
    safetySummaryEs:
      "Plan base editable: registra dolor en cada serie, evita progresar con dolor sobre 2 y modifica ejercicios con dolor sobre 3.",
    sessions: baseSessions.map((session) => ({
      dayIndex: session.dayIndex,
      nameEs: session.nameEs,
      focus: session.focus,
      estimatedDurationMinutes: 60,
      mobilityNotesEs: "Incluye 5-8 minutos de movilidad específica y calentamiento progresivo.",
      exercises: session.exercises.map(
        ([
          exerciseNameEs,
          phase,
          isUnilateral,
          targetSets,
          targetRepMin,
          targetRepMax,
          targetRir,
          restSeconds,
          loadMechanism,
          isCompound,
        ]) => ({
          // Every seeded exercise is sets x reps x RIR — duration-type
          // exercises (cardio warmups, mobility holds) are only created
          // through the custom plan builder for now.
          prescriptionType: "strength" as const,
          exerciseNameEs,
          phase,
          isUnilateral,
          targetSets,
          targetRepMin,
          targetRepMax,
          targetRir,
          restSeconds,
          notesEs: "Ajusta la carga usando tus pesos base y conserva técnica estricta.",
          painSensitive: exerciseNameEs.toLowerCase().includes("press"),
          substitutionOptionsEs: ["Máquina equivalente", "Cable equivalente"],
          loadMechanism,
          isCompound,
        }),
      ),
    })),
  });
}
