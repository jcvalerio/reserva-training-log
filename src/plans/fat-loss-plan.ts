import { generatedWorkoutPlanSchema, type GeneratedWorkoutPlan } from "./generated-plan-schema";

// Source: a printed "Plan 8 semanas" circuit template (Rutina A / Rutina B
// alternating, LUN:A MAR:B MIÉ:A JUE:B VIE:A). The app has no fixed-week or
// superset/circuit-grouping concept (see docs/product/implementation-log.md
// for why), so this is adapted rather than transcribed literally:
// - "8 semanas" and the week-numbered progression (sem 1-2 learn technique,
//   sem 3-4 +load, sem 5-6 shorter rest, sem 7-8 +1 round) become ongoing,
//   readiness-based guidance instead of week-indexed milestones — the plan
//   repeats indefinitely like every other plan in this app.
// - Each block ("Calentamiento", "Fuerza principal", "Bloque 1", "Bloque 2",
//   "Acondicionamiento", "Cardio opcional") has no grouping field to live in,
//   so it's prefixed onto the exercise name itself — the only place in the
//   current UI where this context is guaranteed to actually be visible to
//   the user (plan preview and /entrenar both show exerciseNameEs; neither
//   surfaces notesEs or mobilityNotesEs today).
// - "12 cal Bike" (calorie-target bike sprint) and similar calorie/distance
//   targets don't fit sets×reps or a clean duration either — approximated as
//   duration-type with the target noted in notesEs.
const BLOCK_LABELS = {
  warmup: "Calentamiento",
  strength: "Fuerza principal",
  block1: "Bloque 1",
  block2: "Bloque 2",
  conditioning: "Acondicionamiento",
  cardio: "Cardio opcional",
} as const;

type BlockKey = keyof typeof BLOCK_LABELS;
type LoadMechanism = "bodyweight" | "dumbbell" | "machine" | "barbell";
type Rir = 0 | 1 | 2 | 3 | 4;

function blockPhase(block: BlockKey): "warmup" | "main" | "accessory" {
  if (block === "warmup") return "warmup";
  if (block === "strength") return "main";
  return "accessory";
}

function name(block: BlockKey, exerciseName: string) {
  return `${BLOCK_LABELS[block]} · ${exerciseName}`;
}

function isLikelyPainSensitive(exerciseName: string) {
  return ["press", "squat", "peso muerto", "hip thrust"].some((keyword) =>
    exerciseName.toLowerCase().includes(keyword),
  );
}

function strengthEx(
  block: BlockKey,
  exerciseName: string,
  opts: {
    isUnilateral?: boolean;
    sets: number;
    repMin: number;
    repMax: number;
    rir: Rir;
    rest: number;
    mechanism: LoadMechanism;
    compound?: boolean;
    notesEs?: string;
    substitutions?: string[];
    painSensitive?: boolean;
  },
) {
  return {
    prescriptionType: "strength" as const,
    exerciseNameEs: name(block, exerciseName),
    phase: blockPhase(block),
    isUnilateral: opts.isUnilateral ?? false,
    targetSets: opts.sets,
    targetRepMin: opts.repMin,
    targetRepMax: opts.repMax,
    targetRir: opts.rir,
    restSeconds: opts.rest,
    notesEs: opts.notesEs ?? `${BLOCK_LABELS[block]}: mantén buena técnica durante todo el circuito.`,
    painSensitive: opts.painSensitive ?? isLikelyPainSensitive(exerciseName),
    substitutionOptionsEs: opts.substitutions ?? [],
    loadMechanism: opts.mechanism,
    isCompound: opts.compound,
  };
}

function durationEx(
  block: BlockKey,
  exerciseName: string,
  opts: { sets?: number; seconds: number; rest: number; notesEs: string },
) {
  return {
    prescriptionType: "duration" as const,
    exerciseNameEs: name(block, exerciseName),
    phase: blockPhase(block),
    isUnilateral: false,
    targetSets: opts.sets ?? 1,
    durationSeconds: opts.seconds,
    restSeconds: opts.rest,
    notesEs: opts.notesEs,
    painSensitive: false,
    substitutionOptionsEs: [],
  };
}

const cardioFinisher = () =>
  durationEx("cardio", "Caminata en banda", {
    seconds: 900,
    rest: 30,
    notesEs: "Opcional, 15-20 min. Inclinación 10-12%, velocidad 5-6 km/h. Ajusta el tiempo según lo que tengas disponible.",
  });

function rutinaAExercises() {
  return [
    durationEx("warmup", "Bici estática", {
      sets: 2,
      seconds: 75,
      rest: 30,
      notesEs: "Objetivo aproximado: 12 calorías en el bike por ronda. Sin descanso entre ejercicios del calentamiento.",
    }),
    strengthEx("warmup", "Bird dog", { isUnilateral: true, sets: 2, repMin: 8, repMax: 10, rir: 3, rest: 30, mechanism: "bodyweight" }),
    strengthEx("warmup", "Sentadilla con giro", { sets: 2, repMin: 8, repMax: 10, rir: 3, rest: 30, mechanism: "bodyweight" }),
    strengthEx("warmup", "Walking lunges", { isUnilateral: true, sets: 2, repMin: 8, repMax: 10, rir: 3, rest: 30, mechanism: "bodyweight" }),
    strengthEx("warmup", "Push-ups inclinados", { sets: 2, repMin: 8, repMax: 10, rir: 3, rest: 30, mechanism: "bodyweight" }),

    strengthEx("strength", "Sentadilla trasera (Back Squat)", {
      sets: 5,
      repMin: 2,
      repMax: 5,
      rir: 2,
      rest: 120,
      mechanism: "barbell",
      compound: true,
      painSensitive: true,
      notesEs:
        "Series descendentes 5-4-3-3-2: baja las reps y sube el peso en cada serie. Primero domina la técnica y completa todas las rondas; luego progresa 2.5-5kg cuando el RIR se sienta fácil; cuando el descanso te sobre, redúcelo a 45s antes de subir más peso.",
      substitutions: ["Sentadilla en máquina Smith", "Prensa de piernas"],
    }),

    strengthEx("block1", "KB swing", { sets: 3, repMin: 10, repMax: 10, rir: 2, rest: 60, mechanism: "dumbbell", compound: true }),
    strengthEx("block1", "Step-ups por pierna", { isUnilateral: true, sets: 3, repMin: 10, repMax: 10, rir: 2, rest: 60, mechanism: "bodyweight" }),
    strengthEx("block1", "Remo con mancuerna", { isUnilateral: true, sets: 3, repMin: 12, repMax: 12, rir: 2, rest: 60, mechanism: "dumbbell", compound: true }),
    strengthEx("block1", "Flexiones", { sets: 3, repMin: 10, repMax: 10, rir: 2, rest: 60, mechanism: "bodyweight" }),

    strengthEx("block2", "Goblet squat", { sets: 3, repMin: 12, repMax: 15, rir: 2, rest: 60, mechanism: "dumbbell", compound: true }),
    strengthEx("block2", "Press de hombro con mancuernas", { sets: 3, repMin: 10, repMax: 12, rir: 2, rest: 60, mechanism: "dumbbell", compound: true }),
    strengthEx("block2", "Elevaciones posteriores", { sets: 3, repMin: 12, repMax: 15, rir: 2, rest: 60, mechanism: "dumbbell", compound: false }),
    strengthEx("block2", "Escaladores", { sets: 3, repMin: 20, repMax: 20, rir: 3, rest: 60, mechanism: "bodyweight" }),

    strengthEx("conditioning", "Box jumps", { sets: 3, repMin: 10, repMax: 10, rir: 2, rest: 75, mechanism: "bodyweight", compound: true }),
    durationEx("conditioning", "Remo (máquina)", { sets: 3, seconds: 60, rest: 75, notesEs: "Ritmo alto, esfuerzo casi máximo por ronda." }),
    strengthEx("conditioning", "Walking lunges", { isUnilateral: true, sets: 3, repMin: 10, repMax: 10, rir: 2, rest: 75, mechanism: "bodyweight" }),

    cardioFinisher(),
  ];
}

function rutinaBExercises() {
  return [
    strengthEx("warmup", "Inchworms (gusanos)", { sets: 3, repMin: 8, repMax: 8, rir: 3, rest: 30, mechanism: "bodyweight" }),
    strengthEx("warmup", "Jumping jacks", { sets: 3, repMin: 10, repMax: 10, rir: 3, rest: 30, mechanism: "bodyweight" }),
    strengthEx("warmup", "Bird dog", { isUnilateral: true, sets: 3, repMin: 10, repMax: 10, rir: 3, rest: 30, mechanism: "bodyweight" }),
    strengthEx("warmup", "Sentadilla", { sets: 3, repMin: 10, repMax: 10, rir: 3, rest: 30, mechanism: "bodyweight" }),
    strengthEx("warmup", "Peso muerto con kettlebell", { sets: 3, repMin: 10, repMax: 10, rir: 3, rest: 30, mechanism: "dumbbell", compound: true }),

    strengthEx("strength", "Peso muerto (Deadlift)", {
      sets: 5,
      repMin: 2,
      repMax: 5,
      rir: 2,
      rest: 120,
      mechanism: "barbell",
      compound: true,
      painSensitive: true,
      notesEs:
        "Series descendentes 5-4-3-3-2: baja las reps y sube el peso en cada serie. Primero domina la técnica y completa todas las rondas; luego progresa 2.5-5kg cuando el RIR se sienta fácil; cuando el descanso te sobre, redúcelo a 45s antes de subir más peso.",
      substitutions: ["Peso muerto rumano con mancuernas", "Hip thrust en máquina"],
    }),

    strengthEx("block1", "Hip thrust", { sets: 3, repMin: 12, repMax: 12, rir: 2, rest: 60, mechanism: "barbell", compound: true }),
    strengthEx("block1", "Press inclinado con mancuernas", { sets: 3, repMin: 10, repMax: 10, rir: 2, rest: 60, mechanism: "dumbbell", compound: true, painSensitive: true }),
    strengthEx("block1", "Dominadas (o jalón al pecho)", { sets: 3, repMin: 8, repMax: 8, rir: 2, rest: 60, mechanism: "machine", compound: true }),
    strengthEx("block1", "Face pull", { sets: 3, repMin: 12, repMax: 12, rir: 2, rest: 60, mechanism: "machine", compound: false }),

    strengthEx("block2", "Bulgarian split squat", { isUnilateral: true, sets: 3, repMin: 10, repMax: 12, rir: 2, rest: 60, mechanism: "dumbbell", compound: true }),
    strengthEx("block2", "Push press", { sets: 3, repMin: 8, repMax: 10, rir: 2, rest: 60, mechanism: "barbell", compound: true, painSensitive: true }),
    strengthEx("block2", "Curl martillo", { sets: 3, repMin: 12, repMax: 15, rir: 2, rest: 60, mechanism: "dumbbell", compound: false }),
    strengthEx("block2", "Fondos en banco", { sets: 3, repMin: 10, repMax: 12, rir: 2, rest: 60, mechanism: "bodyweight", compound: false }),

    durationEx("conditioning", "Remo 500m", { sets: 3, seconds: 120, rest: 75, notesEs: "Objetivo: 500m por ronda a ritmo fuerte." }),
    durationEx("conditioning", "Farmer carry", { sets: 3, seconds: 30, rest: 75, notesEs: "Carga pesada, ~30 segundos o 20-30m por ronda manteniendo la postura." }),
    strengthEx("conditioning", "Burpees", { sets: 3, repMin: 10, repMax: 10, rir: 2, rest: 75, mechanism: "bodyweight", compound: true }),

    cardioFinisher(),
  ];
}

const RUTINA_A_META = {
  nameEs: "Rutina A — sentadilla y fuerza total",
  focus: "Circuito full body: sentadilla, empuje, tirón y acondicionamiento.",
};

const RUTINA_B_META = {
  nameEs: "Rutina B — peso muerto y fuerza total",
  focus: "Circuito full body: peso muerto, empuje, tirón y acondicionamiento.",
};

// LUN:A MAR:B MIÉ:A JUE:B VIE:A — the source template's own suggested weekly
// order, mapped onto 5 flat day slots (this app has no weekday concept,
// /entrenar just suggests whichever day was trained longest ago).
const sessionPlan: Array<{ dayIndex: number; routine: "A" | "B" }> = [
  { dayIndex: 1, routine: "A" },
  { dayIndex: 2, routine: "B" },
  { dayIndex: 3, routine: "A" },
  { dayIndex: 4, routine: "B" },
  { dayIndex: 5, routine: "A" },
];

export function createFatLossPlan(): GeneratedWorkoutPlan {
  return generatedWorkoutPlanSchema.parse({
    schemaVersion: 1,
    locale: "es",
    nameEs: "Reducción de grasa corporal — circuito A/B",
    goal: "fat_loss",
    daysPerWeek: 5,
    sessionDurationMinutes: 60,
    safetySummaryEs:
      "Plan de circuitos para reducción de grasa: registra dolor en cada serie, evita progresar con dolor sobre 2 y modifica ejercicios con dolor sobre 3. Progresión general: primero domina la técnica y completa todas las rondas; luego sube 2.5-5kg en el ejercicio principal; cuando el descanso te sobre, redúcelo a 45s antes de subir más peso; y agrega una ronda extra en Acondicionamiento cuando el ritmo se sienta cómodo. La caminata en banda al final es opcional.",
    sessions: sessionPlan.map(({ dayIndex, routine }) => {
      const meta = routine === "A" ? RUTINA_A_META : RUTINA_B_META;
      return {
        dayIndex,
        nameEs: meta.nameEs,
        focus: meta.focus,
        estimatedDurationMinutes: 60,
        mobilityNotesEs: "Incluye movilidad de cadera y tobillo antes del calentamiento si sientes rigidez.",
        exercises: routine === "A" ? rutinaAExercises() : rutinaBExercises(),
      };
    }),
  });
}
