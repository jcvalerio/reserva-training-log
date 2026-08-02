import { generatedWorkoutPlanSchema, type GeneratedWorkoutPlan } from "./generated-plan-schema";

// Source: "Plan de entrenamiento — Readaptación (4 semanas)" infographic —
// a 5-day (Lun-Vie) return-to-training plan (recover strength/muscle, trim
// fat) built around one "ejercicio estrella" (star exercise) per day that
// gets real week-over-week load progression, while the rest of that day's
// exercises "complementan el trabajo" (complement the work) without the
// same progression pressure. Adapted, not transcribed literally:
// - The source's 4-week, %-of-previous-weight progression schedule (semana
//   1: ~70%, semana 2: 80-85%, semana 3: pesos habituales, semana 4: +2-5%
//   on the star exercise only) has no week-indexed home in this schema (see
//   fat-loss-plan.ts for the same kind of adaptation) — folded into
//   safetySummaryEs as ongoing reference guidance instead of an enforced
//   week counter.
// - No per-exercise RIR is given in the source at all — approximated as
//   RIR 2 for each day's star exercise (the one meant to genuinely progress)
//   and RIR 3 for everything else (the source's own "complementar, no
//   progresar tan agresivo" framing), both conservative choices matching
//   this plan's "volver con seguridad" theme.
// - The source's own "Viernes: Sentadilla sumo" star label is almost
//   certainly a labeling slip in the infographic — sentadilla sumo is a
//   Jueves exercise, so it's treated as Thursday's second star here.
// - Miércoles's "Movilidad de cadera / Movilidad de hombros / Estiramientos"
//   bullets have no explicit sets/reps/duration in the source (unlike every
//   other line item), so they're folded into that day's mobilityNotesEs
//   instead of invented as discrete exercises with a made-up duration.
type Rir = 2 | 3;
type LoadMechanism = "bodyweight" | "dumbbell" | "machine" | "barbell";

function strengthEx(
  exerciseNameEs: string,
  opts: {
    phase?: "warmup" | "main" | "accessory" | "mobility";
    isUnilateral?: boolean;
    sets: number;
    repMin: number;
    repMax: number;
    rir: Rir;
    rest: number;
    mechanism: LoadMechanism;
    compound: boolean;
    painSensitive?: boolean;
    isStar?: boolean;
    notesEs?: string;
  },
) {
  const starNote = opts.isStar
    ? "Ejercicio estrella del día: progresa el peso poco a poco semana a semana cuando la técnica sea buena."
    : "Ejercicio complementario: prioriza técnica y control, sin la misma presión de progresar en peso.";

  return {
    prescriptionType: "strength" as const,
    exerciseNameEs,
    phase: opts.phase ?? (opts.isStar ? "main" : "accessory"),
    isUnilateral: opts.isUnilateral ?? false,
    targetSets: opts.sets,
    targetRepMin: opts.repMin,
    targetRepMax: opts.repMax,
    targetRir: opts.rir,
    restSeconds: opts.rest,
    notesEs: opts.notesEs ? `${starNote} ${opts.notesEs}` : starNote,
    painSensitive: opts.painSensitive ?? false,
    substitutionOptionsEs:
      opts.mechanism === "machine" ? ["Máquina equivalente", "Cable equivalente"] : opts.mechanism === "dumbbell" ? ["Mancuerna equivalente", "Máquina equivalente"] : [],
    loadMechanism: opts.mechanism,
    isCompound: opts.compound,
  };
}

function durationEx(
  exerciseNameEs: string,
  opts: {
    phase?: "warmup" | "main" | "accessory" | "mobility";
    isUnilateral?: boolean;
    sets?: number;
    seconds: number;
    rest: number;
    notesEs: string;
  },
) {
  return {
    prescriptionType: "duration" as const,
    exerciseNameEs,
    phase: opts.phase ?? "accessory",
    isUnilateral: opts.isUnilateral ?? false,
    targetSets: opts.sets ?? 1,
    durationSeconds: opts.seconds,
    restSeconds: opts.rest,
    notesEs: opts.notesEs,
    painSensitive: false,
    substitutionOptionsEs: [],
  };
}

function stairFinisher() {
  return durationEx("Escalera (finalizador)", {
    seconds: 540,
    rest: 30,
    notesEs: "Finalizador de 8-10 min a ritmo sostenido, después del bloque de fuerza.",
  });
}

function coreCrunch() {
  return strengthEx("Crunch en máquina", {
    phase: "accessory",
    sets: 3,
    repMin: 15,
    repMax: 15,
    rir: 2,
    rest: 60,
    mechanism: "machine",
    compound: false,
    notesEs: "Movimiento controlado, evita tirar del cuello.",
  });
}

function sessions() {
  return [
    {
      dayIndex: 1,
      nameEs: "Cuádriceps",
      focus: "Prensa, unilateral de pierna y extensión de cuádriceps",
      mobilityNotesEs: "Incluye 5-8 minutos de movilidad de cadera y tobillo antes de la prensa.",
      exercises: [
        strengthEx("Prensa (pies bajos)", {
          isStar: true,
          sets: 4,
          repMin: 8,
          repMax: 10,
          rir: 2,
          rest: 75,
          mechanism: "machine",
          compound: true,
          painSensitive: true,
          notesEs: "Pies bajos en la plataforma.",
        }),
        strengthEx("Sentadilla búlgara", {
          isUnilateral: true,
          sets: 3,
          repMin: 10,
          repMax: 12,
          rir: 3,
          rest: 75,
          mechanism: "dumbbell",
          compound: true,
          painSensitive: true,
          notesEs: "Series por pierna. Sujétate para estabilidad si lo necesitas.",
        }),
        strengthEx("Extensión de cuádriceps", {
          sets: 3,
          repMin: 12,
          repMax: 15,
          rir: 3,
          rest: 75,
          mechanism: "machine",
          compound: false,
        }),
        coreCrunch(),
        strengthEx("Reverse crunch", {
          sets: 3,
          repMin: 12,
          repMax: 12,
          rir: 2,
          rest: 60,
          mechanism: "bodyweight",
          compound: false,
          notesEs: "Eleva la cadera con control, sin impulso.",
        }),
        stairFinisher(),
      ],
    },
    {
      dayIndex: 2,
      nameEs: "Empuje — hombros, pecho, tríceps",
      focus: "Tríceps, press francés y press militar sentado",
      mobilityNotesEs: "Incluye 5-7 minutos de movilidad de hombro antes del bloque de empuje.",
      exercises: [
        strengthEx("Tríceps en polea", {
          isStar: true,
          sets: 4,
          repMin: 10,
          repMax: 12,
          rir: 2,
          rest: 75,
          mechanism: "machine",
          compound: false,
        }),
        strengthEx("Press francés con mancuerna", {
          sets: 3,
          repMin: 10,
          repMax: 12,
          rir: 3,
          rest: 75,
          mechanism: "dumbbell",
          compound: false,
        }),
        strengthEx("Press militar sentado", {
          sets: 3,
          repMin: 10,
          repMax: 12,
          rir: 3,
          rest: 75,
          mechanism: "dumbbell",
          compound: true,
          painSensitive: true,
          notesEs: "Recorrido sin dolor en el hombro; tronco apoyado.",
        }),
        coreCrunch(),
        durationEx("Plancha", {
          sets: 3,
          seconds: 40,
          rest: 60,
          notesEs: "3 series de 40 segundos. Cadera alineada, sin hundir la zona lumbar.",
        }),
        stairFinisher(),
      ],
    },
    {
      dayIndex: 3,
      nameEs: "Recuperación activa",
      focus: "Cardio suave, movilidad, estiramientos y core",
      mobilityNotesEs:
        "Día de recuperación activa: movilidad de cadera, movilidad de hombros y estiramientos generales antes o después del bloque de cardio/core (sin sets/reps fijos — a tu ritmo). Duración total sugerida: 30-40 minutos.",
      exercises: [
        durationEx("Caminadora inclinada o bicicleta", {
          phase: "main",
          seconds: 1200,
          rest: 30,
          notesEs: "20 minutos a ritmo moderado y constante — caminadora inclinada o bicicleta, lo que tengas disponible.",
        }),
        coreCrunch(),
        durationEx("Plancha", {
          sets: 3,
          seconds: 40,
          rest: 60,
          notesEs: "3 series de 40 segundos. Cadera alineada, sin hundir la zona lumbar.",
        }),
        strengthEx("Bird dog", {
          isUnilateral: true,
          sets: 3,
          repMin: 12,
          repMax: 12,
          rir: 2,
          rest: 60,
          mechanism: "bodyweight",
          compound: false,
          notesEs: "3 repeticiones por lado. Movimiento controlado, zona lumbar neutra.",
        }),
      ],
    },
    {
      dayIndex: 4,
      nameEs: "Glúteo / femoral",
      focus: "Peso muerto rumano, curl femoral y sentadilla sumo",
      mobilityNotesEs: "Incluye 6-8 minutos de movilidad de cadera antes del peso muerto rumano.",
      exercises: [
        strengthEx("Peso muerto rumano", {
          isStar: true,
          sets: 4,
          repMin: 8,
          repMax: 10,
          rir: 2,
          rest: 75,
          mechanism: "dumbbell",
          compound: true,
          painSensitive: true,
          notesEs: "Finaliza el descenso manteniendo espalda neutra y cadera controlada.",
        }),
        strengthEx("Curl femoral", {
          sets: 3,
          repMin: 10,
          repMax: 12,
          rir: 3,
          rest: 75,
          mechanism: "machine",
          compound: false,
        }),
        strengthEx("Sentadilla sumo", {
          isStar: true,
          sets: 3,
          repMin: 10,
          repMax: 12,
          rir: 2,
          rest: 75,
          mechanism: "dumbbell",
          compound: true,
          painSensitive: true,
          notesEs: "Segundo ejercicio estrella del día, junto al peso muerto rumano.",
        }),
        strengthEx("Reverse crunch", {
          sets: 3,
          repMin: 15,
          repMax: 15,
          rir: 2,
          rest: 60,
          mechanism: "bodyweight",
          compound: false,
        }),
        strengthEx("Russian twist", {
          sets: 3,
          repMin: 20,
          repMax: 20,
          rir: 2,
          rest: 60,
          mechanism: "bodyweight",
          compound: false,
          notesEs: "Rotación controlada, sin jalar el cuello.",
        }),
        stairFinisher(),
      ],
    },
    {
      dayIndex: 5,
      nameEs: "Espalda / bíceps",
      focus: "Remo unilateral, curl martillo y extensión de espalda",
      mobilityNotesEs: "Incluye 5-7 minutos de movilidad de hombro y torácica antes del remo.",
      exercises: [
        strengthEx("Remo unilateral en polea", {
          isStar: true,
          isUnilateral: true,
          sets: 3,
          repMin: 10,
          repMax: 12,
          rir: 2,
          rest: 75,
          mechanism: "machine",
          compound: true,
          notesEs: "Series por lado. Inicia con retracción escapular.",
        }),
        strengthEx("Curl martillo con mancuernas", {
          sets: 3,
          repMin: 10,
          repMax: 12,
          rir: 3,
          rest: 75,
          mechanism: "dumbbell",
          compound: false,
        }),
        strengthEx("Extensión de espalda en máquina", {
          sets: 3,
          repMin: 12,
          repMax: 15,
          rir: 3,
          rest: 75,
          mechanism: "machine",
          compound: false,
          painSensitive: true,
          notesEs: "Rango controlado, sin hiperextender la zona lumbar.",
        }),
        coreCrunch(),
        durationEx("Plancha lateral", {
          isUnilateral: true,
          sets: 3,
          seconds: 35,
          rest: 60,
          notesEs: "3 series por lado, 30-40 segundos cada una.",
        }),
        stairFinisher(),
      ],
    },
  ];
}

export function createReadaptationPlan(): GeneratedWorkoutPlan {
  return generatedWorkoutPlanSchema.parse({
    schemaVersion: 1,
    locale: "es",
    nameEs: "Readaptación — 5 días, retorno seguro al entrenamiento",
    goal: "hypertrophy",
    daysPerWeek: 5,
    sessionDurationMinutes: 45,
    safetySummaryEs:
      "Progresión de referencia (no aplicada automáticamente, el plan se repite sin fin): empieza cerca del 70% de tus pesos habituales priorizando técnica, sube gradualmente hacia 80-85% y luego a tus pesos habituales mientras la técnica se mantenga sólida; una vez ahí, sube 2-5% el peso solo en el ejercicio estrella de cada día — el resto de ejercicios son para complementar el trabajo, sin la misma presión de progresar. Descansa 60-90s entre series; técnica primero, peso después; mantente hidratado durante el entrenamiento. Registra dolor en cada serie: dolor >2 bloquea aumentos agresivos, dolor >3 exige reducir o modificar el ejercicio, dolor >=7 significa detener y buscar orientación profesional si persiste.",
    sessions: sessions().map((session) => ({
      dayIndex: session.dayIndex,
      nameEs: session.nameEs,
      focus: session.focus,
      estimatedDurationMinutes: session.dayIndex === 3 ? 35 : 45,
      mobilityNotesEs: session.mobilityNotesEs,
      exercises: session.exercises,
    })),
  });
}
