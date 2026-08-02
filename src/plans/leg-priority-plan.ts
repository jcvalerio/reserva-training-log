import { generatedWorkoutPlanSchema, type GeneratedWorkoutPlan } from "./generated-plan-schema";

// Source: "Plan detallado de entrenamiento semanal — Hipertrofia con
// prioridad en piernas" (5 days, all-machine gym, unilateral-leg-priority
// progression). Adapted rather than transcribed literally:
// - The source gives a per-set RIR scheme (e.g. "3-2-2": first/second/third
//   effective set) — this schema only has one targetRir per exercise, so the
//   last (hardest) set's RIR becomes targetRir, and the full scheme is kept
//   verbatim in notesEs so it's still visible while training.
// - "Core" is a free choice ("Elige un ejercicio de core de la plataforma")
//   with a rep-or-duration range (8-15 reps o 20-40s) — modeled as
//   strength/8-15 reps since this app's set logger is rep-first, with the
//   isometric alternative kept in notesEs.
// - Every exercise in the source is machine/cable-based (no barbell/dumbbell
//   work at all), so loadMechanism is "machine" throughout.
type Rir = 0 | 1 | 2 | 3 | 4;

function strengthEx(
  exerciseNameEs: string,
  opts: {
    phase?: "warmup" | "main" | "accessory" | "mobility";
    isUnilateral?: boolean;
    sets: number;
    repMin: number;
    repMax: number;
    rirScheme: string;
    rest: number;
    compound: boolean;
    painSensitive?: boolean;
    notesEs: string;
  },
) {
  const lastRir = Number(opts.rirScheme.split("-").pop()) as Rir;

  return {
    prescriptionType: "strength" as const,
    exerciseNameEs,
    phase: opts.phase ?? "main",
    isUnilateral: opts.isUnilateral ?? false,
    targetSets: opts.sets,
    targetRepMin: opts.repMin,
    targetRepMax: opts.repMax,
    targetRir: lastRir,
    restSeconds: opts.rest,
    notesEs: `RIR ${opts.rirScheme} por serie. ${opts.notesEs}`,
    painSensitive: opts.painSensitive ?? false,
    substitutionOptionsEs: ["Máquina equivalente", "Cable equivalente"],
    loadMechanism: "machine" as const,
    isCompound: opts.compound,
  };
}

function coreEx() {
  return strengthEx("Core", {
    phase: "accessory",
    sets: 2,
    repMin: 8,
    repMax: 15,
    rirScheme: "2",
    rest: 75,
    compound: false,
    notesEs:
      "Elige un ejercicio de core de la plataforma (alternativa isométrica: 20-40s). Mantén respiración controlada.",
  });
}

const MOBILITY_LOWER_ES =
  "Movilidad tren inferior (6-8 min): tobillo rodilla-adelante 8/lado, rotación de cadera 90/90 6/lado, sentadilla con apoyo y pausa 8 reps, bisagra de cadera sin peso 8 reps, elevación de pantorrilla sin peso 10 reps.";
const MOBILITY_UPPER_ES =
  "Movilidad tren superior (5-7 min): círculos de hombro 10/dirección, deslizamiento de brazos en pared 8 reps, retracción/protracción escapular 10 reps, rotación torácica 6/lado.";

const UNILATERAL_RULE_ES =
  "Regla unilateral: comienza siempre por la pierna más delgada, elige la carga según su capacidad, y la pierna fuerte usa el mismo peso sin superar sus repeticiones — no agregues series extra a la pierna delgada sin valoración profesional.";

function sessions() {
  return [
    {
      dayIndex: 1,
      nameEs: "Cuádriceps y pantorrillas",
      focus: "Piernas — cuádriceps, prensa unilateral y pantorrilla",
      mobilityNotesEs: `${MOBILITY_LOWER_ES} Aproximaciones: 2-3 series progresivas antes de la prensa unilateral; 1 serie ligera antes de pantorrilla si se necesita. ${UNILATERAL_RULE_ES}`,
      exercises: [
        strengthEx("Prensa unilateral", {
          isUnilateral: true,
          sets: 3,
          repMin: 6,
          repMax: 10,
          rirScheme: "3-2-2",
          rest: 120,
          compound: true,
          painSensitive: true,
          notesEs: "Comienza por la pierna más delgada. Completa ambas piernas antes de iniciar el descanso.",
        }),
        strengthEx("Prensa bilateral", {
          sets: 3,
          repMin: 6,
          repMax: 10,
          rirScheme: "3-2-2",
          rest: 150,
          compound: true,
          painSensitive: true,
          notesEs: "Pies estables y recorrido controlado. No despegar la pelvis del respaldo.",
        }),
        strengthEx("Extensión de cuádriceps unilateral", {
          phase: "accessory",
          isUnilateral: true,
          sets: 2,
          repMin: 8,
          repMax: 15,
          rirScheme: "2-1",
          rest: 90,
          compound: false,
          notesEs: "Alinea la rodilla con el eje de la máquina. Evita el impulso. Comienza por la pierna más delgada.",
        }),
        strengthEx("Pantorrilla sentada unilateral", {
          phase: "accessory",
          isUnilateral: true,
          sets: 3,
          repMin: 10,
          repMax: 20,
          rirScheme: "2-1-1",
          rest: 90,
          compound: false,
          notesEs: "Pausa breve arriba y descenso controlado; rango completo sin rebotes. Comienza por la pierna más delgada.",
        }),
        coreEx(),
      ],
    },
    {
      dayIndex: 2,
      nameEs: "Tren superior completo A",
      focus: "Empuje (pecho, hombro, tríceps) y tirón (jalón, bíceps)",
      mobilityNotesEs: `${MOBILITY_UPPER_ES} Aproximaciones: bloque de empuje antes del press de pecho; 1-2 antes del jalón al pecho si la carga lo requiere.`,
      exercises: [
        strengthEx("Press de pecho en máquina", {
          sets: 3,
          repMin: 6,
          repMax: 10,
          rirScheme: "3-2-2",
          rest: 120,
          compound: true,
          painSensitive: true,
          notesEs: "Escápulas estables; no extender de más los codos.",
        }),
        strengthEx("Jalón al pecho agarre ancho", {
          sets: 3,
          repMin: 6,
          repMax: 10,
          rirScheme: "3-2-2",
          rest: 120,
          compound: true,
          notesEs: "Lleva la barra hacia la parte alta del pecho sin balancear el tronco.",
        }),
        strengthEx("Press de hombros en máquina", {
          phase: "accessory",
          sets: 2,
          repMin: 8,
          repMax: 12,
          rirScheme: "3-2",
          rest: 120,
          compound: true,
          painSensitive: true,
          notesEs: "Recorrido sin dolor; mantén el tronco apoyado.",
        }),
        strengthEx("Extensión de tríceps en máquina o polea", {
          phase: "accessory",
          sets: 2,
          repMin: 8,
          repMax: 15,
          rirScheme: "2-1",
          rest: 90,
          compound: false,
          notesEs: "Codos estables junto al cuerpo; evita usar el peso corporal.",
        }),
        strengthEx("Curl de bíceps en máquina", {
          phase: "accessory",
          sets: 2,
          repMin: 8,
          repMax: 15,
          rirScheme: "2-1",
          rest: 90,
          compound: false,
          notesEs: "Mantén los brazos apoyados y controla el descenso.",
        }),
        coreEx(),
      ],
    },
    {
      dayIndex: 3,
      nameEs: "Femorales, glúteos y pantorrillas",
      focus: "Bisagra de cadera, femoral unilateral y glúteo",
      mobilityNotesEs: `${MOBILITY_LOWER_ES} Aproximaciones: 2-3 series antes del peso muerto rumano; 1 serie ligera antes de pantorrilla si se necesita. ${UNILATERAL_RULE_ES}`,
      exercises: [
        strengthEx("Peso muerto rumano", {
          sets: 3,
          repMin: 5,
          repMax: 8,
          rirScheme: "3-3-2",
          rest: 150,
          compound: true,
          painSensitive: true,
          notesEs: "Finaliza el descenso mientras puedas mantener espalda neutra y cadera controlada.",
        }),
        strengthEx("Curl femoral sentado unilateral", {
          isUnilateral: true,
          sets: 3,
          repMin: 8,
          repMax: 15,
          rirScheme: "2-2-1",
          rest: 90,
          compound: false,
          notesEs: "Comienza por la pierna más delgada y evita levantar la cadera del asiento.",
        }),
        strengthEx("Hip thrust en máquina", {
          sets: 3,
          repMin: 6,
          repMax: 10,
          rirScheme: "3-2-2",
          rest: 120,
          compound: true,
          painSensitive: true,
          notesEs: "Extiende la cadera sin hiperextender la zona lumbar; pausa breve arriba.",
        }),
        strengthEx("Pantorrilla de pie unilateral", {
          phase: "accessory",
          isUnilateral: true,
          sets: 3,
          repMin: 8,
          repMax: 15,
          rirScheme: "2-1-1",
          rest: 90,
          compound: false,
          notesEs: "Apoyo estable, movimiento sin rebotes. Comienza por la pierna más delgada.",
        }),
        coreEx(),
      ],
    },
    {
      dayIndex: 4,
      nameEs: "Tren superior completo B",
      focus: "Empuje (press inclinado) y tirón (remo, posteriores)",
      mobilityNotesEs: `${MOBILITY_UPPER_ES} Aproximaciones: bloque de empuje antes del press inclinado; 1-2 antes del remo si la carga lo requiere.`,
      exercises: [
        strengthEx("Press inclinado en máquina", {
          sets: 3,
          repMin: 6,
          repMax: 10,
          rirScheme: "3-2-2",
          rest: 120,
          compound: true,
          painSensitive: true,
          notesEs: "Espalda apoyada; recorrido cómodo para el hombro.",
        }),
        strengthEx("Remo sentado en máquina", {
          sets: 3,
          repMin: 6,
          repMax: 10,
          rirScheme: "3-2-2",
          rest: 120,
          compound: true,
          notesEs: "Inicia con retracción escapular; evita inclinar el tronco hacia atrás.",
        }),
        strengthEx("Vuelos posteriores en máquina", {
          phase: "accessory",
          sets: 2,
          repMin: 10,
          repMax: 20,
          rirScheme: "2-1",
          rest: 90,
          compound: false,
          notesEs: "Movimiento controlado, hombros bajos y sin impulso.",
        }),
        strengthEx("Extensión de tríceps en máquina o polea", {
          phase: "accessory",
          sets: 2,
          repMin: 8,
          repMax: 15,
          rirScheme: "2-1",
          rest: 90,
          compound: false,
          notesEs: "Codos fijos; completa el recorrido sin balanceo.",
        }),
        strengthEx("Curl martillo", {
          phase: "accessory",
          sets: 2,
          repMin: 8,
          repMax: 15,
          rirScheme: "2-1",
          rest: 90,
          compound: false,
          notesEs: "Muñecas neutras y brazos cerca del cuerpo.",
        }),
        coreEx(),
      ],
    },
    {
      dayIndex: 5,
      nameEs: "Pierna completa",
      focus: "Unilateral, femoral, cuádriceps, glúteo medio y pantorrilla",
      mobilityNotesEs: `${MOBILITY_LOWER_ES} Aproximaciones: antes de la sentadilla búlgara; 1 serie ligera de curl femoral si se necesita. ${UNILATERAL_RULE_ES}`,
      exercises: [
        strengthEx("Sentadilla búlgara con apoyo", {
          isUnilateral: true,
          sets: 3,
          repMin: 6,
          repMax: 10,
          rirScheme: "3-2-2",
          rest: 120,
          compound: true,
          painSensitive: true,
          notesEs:
            "Sujétate para mejorar la estabilidad; profundidad solo hasta donde pelvis y rodilla permanezcan controladas. Comienza por la pierna más delgada.",
        }),
        strengthEx("Curl femoral acostado", {
          sets: 3,
          repMin: 8,
          repMax: 15,
          rirScheme: "2-2-1",
          rest: 90,
          compound: false,
          notesEs: "Mantén la pelvis apoyada y evita arquear la espalda.",
        }),
        strengthEx("Extensión de cuádriceps bilateral", {
          phase: "accessory",
          sets: 2,
          repMin: 10,
          repMax: 15,
          rirScheme: "2-1",
          rest: 90,
          compound: false,
          notesEs: "Movimiento controlado y sin impulso; no bloquear bruscamente las rodillas.",
        }),
        strengthEx("Abducción de cadera en máquina", {
          phase: "accessory",
          sets: 2,
          repMin: 12,
          repMax: 20,
          rirScheme: "2-1",
          rest: 75,
          compound: false,
          notesEs: "Mantén la pelvis estable y controla el regreso.",
        }),
        strengthEx("Pantorrilla en la prensa", {
          phase: "accessory",
          sets: 3,
          repMin: 10,
          repMax: 20,
          rirScheme: "2-1-1",
          rest: 90,
          compound: false,
          notesEs: "Mueve únicamente el tobillo, descenso controlado y sin rebotes.",
        }),
        coreEx(),
      ],
    },
  ];
}

export function createLegPriorityPlan(): GeneratedWorkoutPlan {
  return generatedWorkoutPlanSchema.parse({
    schemaVersion: 1,
    locale: "es",
    nameEs: "Hipertrofia con prioridad en piernas — 5 días",
    goal: "hypertrophy",
    daysPerWeek: 5,
    sessionDurationMinutes: 60,
    safetySummaryEs:
      "Series de aproximación (2-3 progresivas, nunca cerca del fallo) antes del primer ejercicio de cada bloque; no cuentan como series efectivas. RIR = repeticiones que aún podrías hacer con buena técnica al terminar la serie. " +
      `${UNILATERAL_RULE_ES} Progresión: mantén la carga mientras repeticiones y RIR coincidan con lo planificado; al llegar al tope del rango con el RIR correcto, sube 2.5-5% (o el incremento mínimo disponible) sin subir peso, reps y series a la vez. Detén una serie ante pérdida de técnica, dolor articular agudo, hormigueo, mareo o falta de aire fuera de lo habitual. Registra dolor en cada serie: pain >2 bloquea aumentos agresivos, pain >3 exige reducir o modificar.`,
    sessions: sessions().map((session) => ({
      dayIndex: session.dayIndex,
      nameEs: session.nameEs,
      focus: session.focus,
      estimatedDurationMinutes: 60,
      mobilityNotesEs: session.mobilityNotesEs,
      exercises: session.exercises,
    })),
  });
}
