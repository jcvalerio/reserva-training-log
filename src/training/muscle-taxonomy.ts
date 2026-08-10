// The exercise taxonomy: what muscle an exercise trains, how it moves, and
// which joints it loads.
//
// This reopens a decision the project declined twice before (see
// exercisePrescription.loadMechanism's doc comment in src/db/schema.ts, and
// the 2026-08-02 implementation-log entry). The old objection was never
// "taxonomies are bad" — it was that incrementCategory conflated equipment
// type with body region while only ever driving a weight-suggestion
// percentage, and users read it as a classification it wasn't. This module is
// the opposite: a classification that is only a classification. loadMechanism
// keeps driving increments and is untouched.
//
// It exists because weekly effective sets per muscle group is the report a
// hypertrophy coach actually reads, and it is the one view that is meaningful
// at a single logged session per exercise — which is the real data state.
//
// CLASSIFICATION RESOLUTION ORDER (the whole design rests on this):
//   1. exercisePrescription.exerciseId -> catalog row. Authoritative, and
//      user-correctable from /plan/builder.
//   2. else findCatalogEntryByName(exerciseNameEs) — accent/case/block-prefix/
//      alias tolerant, evaluated at read time.
//   3. else "sin clasificar", surfaced in the UI, never an error.
//
// Step 2 is why the SQL backfill in drizzle/0019 is an optimization rather
// than a correctness requirement: accounts whose plans this machine has never
// seen still classify correctly even if lower()-equality matches none of
// their rows.

/**
 * The 13 groups weekly volume is counted against.
 *
 * Ordered anatomically (empuje -> tirón -> pierna -> core), not
 * alphabetically: the dashboard renders rows in this order and a coach reads
 * pecho/dorsal/hombro/brazo/pierna/core, not "abductores" first.
 *
 * Dorsal and espalda alta are separate because jalón and remo train different
 * things and the real plan contains both. Deltoides lateral and posterior are
 * separate because they are the two most commonly under-trained groups, which
 * is precisely what the report exists to catch.
 */
export const muscleGroups = [
  "pecho",
  "deltoides_lateral",
  "triceps",
  "dorsal",
  "espalda_alta",
  "deltoides_posterior",
  "biceps",
  "cuadriceps",
  "femorales",
  "gluteos",
  "abductores_aductores",
  "pantorrillas",
  "core",
] as const;

export type MuscleGroup = (typeof muscleGroups)[number];

export const muscleGroupLabelsEs: Record<MuscleGroup, string> = {
  pecho: "Pecho",
  deltoides_lateral: "Hombro lateral",
  triceps: "Tríceps",
  dorsal: "Dorsal",
  espalda_alta: "Espalda alta",
  deltoides_posterior: "Hombro posterior",
  biceps: "Bíceps",
  cuadriceps: "Cuádriceps",
  femorales: "Femorales",
  gluteos: "Glúteos",
  abductores_aductores: "Abductores y aductores",
  pantorrillas: "Pantorrillas",
  core: "Core",
};

/**
 * Derived from the primary muscle group, never stored. Storing a region
 * alongside a muscle group is exactly how incrementCategory drifted into
 * meaning two things at once; a pure function cannot drift.
 */
export const bodyRegions = ["empuje", "tiron", "pierna", "core"] as const;

export type BodyRegion = (typeof bodyRegions)[number];

export const bodyRegionLabelsEs: Record<BodyRegion, string> = {
  empuje: "Empuje",
  tiron: "Tirón",
  pierna: "Pierna",
  core: "Core",
};

const REGION_BY_MUSCLE_GROUP: Record<MuscleGroup, BodyRegion> = {
  pecho: "empuje",
  deltoides_lateral: "empuje",
  triceps: "empuje",
  dorsal: "tiron",
  espalda_alta: "tiron",
  deltoides_posterior: "tiron",
  biceps: "tiron",
  cuadriceps: "pierna",
  femorales: "pierna",
  gluteos: "pierna",
  abductores_aductores: "pierna",
  pantorrillas: "pierna",
  core: "core",
};

export function regionForMuscleGroup(group: MuscleGroup): BodyRegion {
  return REGION_BY_MUSCLE_GROUP[group];
}

/**
 * Kept as free-ish text in the DB (the exercise.movement_pattern column
 * already existed as text and is NULL on every legacy row) rather than a
 * pgEnum: no aggregation partitions on it — the push:pull ratio derives from
 * regionForMuscleGroup — and it is the vocabulary most likely to be argued
 * about and extended, where an ALTER TYPE per iteration is pure friction.
 */
export const movementPatterns = [
  "empuje_horizontal",
  "empuje_vertical",
  "tiron_horizontal",
  "tiron_vertical",
  "dominante_rodilla",
  "bisagra_cadera",
  "aduccion_abduccion",
  "aislamiento",
  "core_flexion",
  "core_rotacion",
  "core_antiextension",
  "core_antirrotacion",
  "core_antiflexion_lateral",
  "cardio",
] as const;

export type MovementPattern = (typeof movementPatterns)[number];

export const movementPatternLabelsEs: Record<MovementPattern, string> = {
  empuje_horizontal: "Empuje horizontal",
  empuje_vertical: "Empuje vertical",
  tiron_horizontal: "Tirón horizontal",
  tiron_vertical: "Tirón vertical",
  dominante_rodilla: "Dominante de rodilla",
  bisagra_cadera: "Bisagra de cadera",
  aduccion_abduccion: "Aducción y abducción",
  aislamiento: "Aislamiento",
  core_flexion: "Flexión de tronco",
  core_rotacion: "Rotación de tronco",
  core_antiextension: "Antiextensión",
  core_antirrotacion: "Antirrotación",
  core_antiflexion_lateral: "Antiflexión lateral",
  cardio: "Cardio",
};

/**
 * Which joints an exercise loads. The physio half of the taxonomy — it makes
 * "¿cómo va mi hombro?" answerable across every exercise, which a per-set pain
 * score alone never could.
 *
 * Since 2026-08-09 this is the FALLBACK, not the primary source:
 * setLog.painLocation records where it actually hurt. These tags are still
 * used for sets logged before that column existed, where all the app can do is
 * attribute a set's pain to every joint its exercise loads — an inference that
 * would confidently report "hombro" for someone whose wrist hurt. The UI must
 * keep distinguishing the two: reported location is a measurement, this is not.
 */
export const jointLoads = [
  "hombro",
  "codo",
  "muneca",
  "columna_lumbar",
  "cadera",
  "rodilla",
  "tobillo",
] as const;

export type JointLoad = (typeof jointLoads)[number];

/**
 * Where the athlete says it hurts, recorded per set alongside the pain score.
 *
 * Supersedes the inference this app had to make before 2026-08-09: with no
 * location field, a set's pain was attributed to every joint its exercise
 * loads, which would confidently report "hombro" for someone whose wrist hurt.
 * Historical sets have no location and still fall back to that inference — the
 * UI has to keep saying which is which.
 *
 * "muscular" is the clinically important addition, not a filler option. A
 * physio reads ordinary muscle soreness after a hard session completely
 * differently from joint pain, and until now the app could not tell them
 * apart. Note it does NOT yet change the progression thresholds: pain > 2 still
 * blocks aggressive progression regardless of where it is. Loosening a safety
 * rule needs real logged evidence first, and there is none — every set logged
 * to date carries pain 0.
 */
export const painLocations = [...jointLoads, "muscular", "otro"] as const;

export type PainLocation = (typeof painLocations)[number];

export const painLocationLabelsEs: Record<PainLocation, string> = {
  hombro: "Hombro",
  codo: "Codo",
  muneca: "Muñeca",
  columna_lumbar: "Zona lumbar",
  cadera: "Cadera",
  rodilla: "Rodilla",
  tobillo: "Tobillo",
  muscular: "Muscular (agujetas)",
  otro: "Otro",
};

/** True for a location that is a joint, i.e. one the pain-by-joint report can
 *  attribute directly rather than by inference. */
export function isJointLocation(location: PainLocation): location is JointLoad {
  return (jointLoads as readonly string[]).includes(location);
}

export const jointLoadLabelsEs: Record<JointLoad, string> = {
  hombro: "Hombro",
  codo: "Codo",
  muneca: "Muñeca",
  columna_lumbar: "Zona lumbar",
  cadera: "Cadera",
  rodilla: "Rodilla",
  tobillo: "Tobillo",
};

/**
 * Weekly effective-set reference ranges per muscle group, for hypertrophy.
 *
 * Deliberately called a "rango de referencia" and never a goal. A 5-day
 * rotation with 2-set accessories trained roughly once per 7 days genuinely
 * lands below most of these bands, and a chart that reads "you are failing"
 * every week is both demotivating and an implicit nudge toward junk volume.
 * The below-range state is styled neutrally for that reason — colour in this
 * app is reserved for pain. See /guia.
 */
export const weeklySetReferenceRange: Record<MuscleGroup, { min: number; max: number }> = {
  pecho: { min: 10, max: 20 },
  deltoides_lateral: { min: 8, max: 22 },
  triceps: { min: 8, max: 20 },
  dorsal: { min: 10, max: 20 },
  espalda_alta: { min: 10, max: 20 },
  deltoides_posterior: { min: 6, max: 20 },
  biceps: { min: 8, max: 20 },
  cuadriceps: { min: 8, max: 20 },
  femorales: { min: 6, max: 16 },
  gluteos: { min: 4, max: 16 },
  abductores_aductores: { min: 0, max: 12 },
  pantorrillas: { min: 8, max: 16 },
  core: { min: 0, max: 16 },
};

/**
 * Folds a user-facing exercise name down to a comparison key.
 *
 * The block-prefix strip is required by fat-loss-plan.ts, which prefixes every
 * name with "Bloque 1 · ", "Calentamiento · " etc. because the app has no
 * circuit-grouping field. Parentheticals are kept — "Peso muerto (Deadlift)"
 * and "Escalera (finalizador)" carry real identity.
 *
 * Kept intentionally simple so drizzle/0019's backfill can match with plain
 * lower()-equality against catalog name_es values rather than reimplementing
 * accent folding in SQL (Neon does not guarantee the unaccent extension, and a
 * hand-rolled translate() duplicate would be a maintenance trap). Anything the
 * SQL misses is caught by this function at read time instead.
 */
export function normalizeExerciseName(raw: string): string {
  const withoutBlockPrefix = raw.includes(" · ") ? raw.slice(raw.lastIndexOf(" · ") + 3) : raw;
  return withoutBlockPrefix
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export type ExerciseCatalogEntry = {
  /** Also the DB primary key — catalog ids are slugs, so migrations produce
   *  byte-identical rows on the dev and production Neon branches. */
  slug: string;
  nameEs: string;
  nameEn: string;
  /** Null for cardio and conditioning work, which trains no group for
   *  hypertrophy purposes. Distinct from "sin clasificar": this is a known
   *  exercise that deliberately contributes zero effective sets. */
  primaryMuscleGroup: MuscleGroup | null;
  secondaryMuscleGroups: MuscleGroup[];
  movementPattern: MovementPattern;
  jointLoads: JointLoad[];
  equipmentType: "bodyweight" | "dumbbell" | "machine" | "barbell";
  /** Name variants across the four plan templates that are the same movement.
   *  One catalog row per movement keeps classification in one place. */
  aliases?: string[];
};

function entry(
  slug: string,
  nameEs: string,
  nameEn: string,
  primaryMuscleGroup: MuscleGroup | null,
  secondaryMuscleGroups: MuscleGroup[],
  movementPattern: MovementPattern,
  jointLoads: JointLoad[],
  equipmentType: ExerciseCatalogEntry["equipmentType"],
  aliases?: string[],
): ExerciseCatalogEntry {
  return {
    slug,
    nameEs,
    nameEn,
    primaryMuscleGroup,
    secondaryMuscleGroups,
    movementPattern,
    jointLoads,
    equipmentType,
    ...(aliases ? { aliases } : {}),
  };
}

/**
 * Covers every exercise name emitted by the four shipped plan templates
 * (seeded-plan, leg-priority-plan, readaptation-plan, fat-loss-plan), plus the
 * five per-day abdominal exercises that replace the generic "Core" rows.
 * A test asserts that coverage, so a future template cannot quietly introduce
 * an unclassified exercise.
 */
export const exerciseCatalog: readonly ExerciseCatalogEntry[] = [
  // --- Pecho -------------------------------------------------------------
  entry("press-de-pecho-en-maquina", "Press de pecho en máquina", "Machine chest press",
    "pecho", ["triceps", "deltoides_lateral"], "empuje_horizontal", ["hombro", "codo"], "machine"),
  entry("press-de-pecho-en-cable", "Press de pecho en cable", "Cable chest press",
    "pecho", ["triceps", "deltoides_lateral"], "empuje_horizontal", ["hombro", "codo"], "machine"),
  entry("press-inclinado-en-maquina", "Press inclinado en máquina", "Machine incline press",
    "pecho", ["triceps", "deltoides_lateral"], "empuje_horizontal", ["hombro", "codo"], "machine"),
  entry("press-inclinado-con-mancuernas", "Press inclinado con mancuernas", "Incline dumbbell press",
    "pecho", ["triceps", "deltoides_lateral"], "empuje_horizontal", ["hombro", "codo"], "dumbbell",
    ["Press inclinado con mancuernas neutras"]),
  entry("flexiones", "Flexiones", "Push-ups",
    "pecho", ["triceps", "deltoides_lateral", "core"], "empuje_horizontal", ["hombro", "codo", "muneca"], "bodyweight",
    ["Push-ups inclinados"]),

  // --- Hombro ------------------------------------------------------------
  entry("press-de-hombros-en-maquina", "Press de hombros en máquina", "Machine shoulder press",
    "deltoides_lateral", ["triceps"], "empuje_vertical", ["hombro", "codo"], "machine",
    ["Press militar sentado"]),
  entry("press-de-hombro-con-mancuernas", "Press de hombro con mancuernas", "Dumbbell shoulder press",
    "deltoides_lateral", ["triceps"], "empuje_vertical", ["hombro", "codo"], "dumbbell"),
  entry("push-press", "Push press", "Push press",
    "deltoides_lateral", ["triceps", "cuadriceps"], "empuje_vertical", ["hombro", "codo"], "barbell"),
  entry("elevaciones-laterales-en-cable", "Elevaciones laterales en cable", "Cable lateral raise",
    "deltoides_lateral", [], "aislamiento", ["hombro"], "machine"),
  entry("vuelos-posteriores-en-maquina", "Vuelos posteriores en máquina", "Machine rear delt fly",
    "deltoides_posterior", ["espalda_alta"], "aislamiento", ["hombro"], "machine",
    ["Elevaciones posteriores"]),
  entry("face-pull", "Face pull", "Face pull",
    "deltoides_posterior", ["espalda_alta"], "tiron_horizontal", ["hombro"], "machine"),

  // --- Tríceps -----------------------------------------------------------
  entry("triceps-en-polea", "Tríceps en polea", "Cable triceps extension",
    "triceps", [], "aislamiento", ["codo"], "machine",
    ["Tríceps en cuerda", "Extensión de tríceps en máquina o polea"]),
  entry("press-frances-con-mancuerna", "Press francés con mancuerna", "Dumbbell skull crusher",
    "triceps", [], "aislamiento", ["codo"], "dumbbell"),
  entry("fondos-en-banco", "Fondos en banco", "Bench dips",
    "triceps", ["pecho", "deltoides_lateral"], "empuje_vertical", ["hombro", "codo"], "bodyweight"),

  // --- Dorsal / espalda --------------------------------------------------
  entry("jalon-al-pecho-agarre-neutro", "Jalón al pecho agarre neutro", "Neutral-grip lat pulldown",
    "dorsal", ["biceps", "espalda_alta"], "tiron_vertical", ["hombro", "codo"], "machine"),
  entry("jalon-al-pecho-agarre-ancho", "Jalón al pecho agarre ancho", "Wide-grip lat pulldown",
    "dorsal", ["biceps", "espalda_alta"], "tiron_vertical", ["hombro", "codo"], "machine",
    ["Dominadas (o jalón al pecho)", "Jalón al pecho"]),
  entry("pullover-en-cable", "Pullover en cable", "Cable pullover",
    "dorsal", ["pecho", "triceps"], "aislamiento", ["hombro"], "machine"),
  entry("remo-sentado-en-maquina", "Remo sentado en máquina", "Seated machine row",
    "espalda_alta", ["dorsal", "biceps", "deltoides_posterior"], "tiron_horizontal", ["hombro", "codo"], "machine",
    ["Remo sentado en cable"]),
  entry("remo-pecho-apoyado", "Remo pecho apoyado", "Chest-supported row",
    "espalda_alta", ["dorsal", "biceps", "deltoides_posterior"], "tiron_horizontal", ["hombro", "codo"], "machine"),
  entry("remo-unilateral-en-polea", "Remo unilateral en polea", "Single-arm cable row",
    "espalda_alta", ["dorsal", "biceps"], "tiron_horizontal", ["hombro", "codo"], "machine",
    ["Remo con mancuerna"]),
  entry("extension-de-espalda-en-maquina", "Extensión de espalda en máquina", "Machine back extension",
    "core", ["gluteos", "femorales"], "bisagra_cadera", ["columna_lumbar", "cadera"], "machine"),

  // --- Bíceps ------------------------------------------------------------
  entry("curl-de-biceps-en-cable", "Curl de bíceps en cable", "Cable biceps curl",
    "biceps", [], "aislamiento", ["codo"], "machine",
    ["Curl de bíceps en máquina"]),
  entry("curl-martillo", "Curl martillo", "Hammer curl",
    "biceps", [], "aislamiento", ["codo", "muneca"], "dumbbell",
    ["Curl martillo con mancuernas"]),

  // --- Cuádriceps --------------------------------------------------------
  entry("prensa-de-piernas", "Prensa de piernas", "Leg press",
    "cuadriceps", ["gluteos", "femorales"], "dominante_rodilla", ["rodilla", "cadera"], "machine",
    ["Prensa bilateral"]),
  entry("prensa-pies-bajos", "Prensa (pies bajos)", "Leg press (low foot position)",
    "cuadriceps", ["gluteos"], "dominante_rodilla", ["rodilla", "cadera"], "machine"),
  entry("prensa-unilateral", "Prensa unilateral", "Single-leg press",
    "cuadriceps", ["gluteos"], "dominante_rodilla", ["rodilla", "cadera"], "machine"),
  entry("extension-de-cuadriceps", "Extensión de cuádriceps", "Leg extension",
    "cuadriceps", [], "aislamiento", ["rodilla"], "machine",
    ["Extensión de piernas", "Extensión de cuádriceps bilateral"]),
  entry("extension-de-cuadriceps-unilateral", "Extensión de cuádriceps unilateral", "Single-leg extension",
    "cuadriceps", [], "aislamiento", ["rodilla"], "machine",
    ["Extensión unilateral de pierna"]),
  entry("hack-squat", "Hack squat controlado", "Controlled hack squat",
    "cuadriceps", ["gluteos"], "dominante_rodilla", ["rodilla", "cadera"], "machine"),
  entry("sentadilla-trasera", "Sentadilla trasera (Back Squat)", "Back squat",
    "cuadriceps", ["gluteos", "femorales"], "dominante_rodilla", ["rodilla", "cadera", "columna_lumbar"], "barbell"),
  entry("sentadilla", "Sentadilla", "Bodyweight squat",
    "cuadriceps", ["gluteos"], "dominante_rodilla", ["rodilla", "cadera"], "bodyweight",
    ["Sentadilla con giro"]),
  entry("goblet-squat", "Goblet squat", "Goblet squat",
    "cuadriceps", ["gluteos", "core"], "dominante_rodilla", ["rodilla", "cadera"], "dumbbell"),
  entry("sentadilla-sumo", "Sentadilla sumo", "Sumo squat",
    "cuadriceps", ["gluteos", "abductores_aductores"], "dominante_rodilla", ["rodilla", "cadera"], "bodyweight"),
  entry("sentadilla-bulgara", "Sentadilla búlgara con apoyo", "Bulgarian split squat",
    "cuadriceps", ["gluteos", "femorales"], "dominante_rodilla", ["rodilla", "cadera"], "machine",
    ["Sentadilla búlgara", "Bulgarian split squat"]),
  entry("walking-lunges", "Walking lunges", "Walking lunges",
    "cuadriceps", ["gluteos", "femorales"], "dominante_rodilla", ["rodilla", "cadera"], "bodyweight"),
  entry("step-ups", "Step-ups por pierna", "Step-ups",
    "cuadriceps", ["gluteos"], "dominante_rodilla", ["rodilla", "cadera"], "bodyweight"),
  entry("box-jumps", "Box jumps", "Box jumps",
    "cuadriceps", ["gluteos", "pantorrillas"], "dominante_rodilla", ["rodilla", "tobillo"], "bodyweight"),

  // --- Femorales / glúteos ----------------------------------------------
  entry("curl-femoral-sentado", "Curl femoral sentado", "Seated leg curl",
    "femorales", ["gluteos"], "aislamiento", ["rodilla"], "machine",
    ["Curl femoral"]),
  entry("curl-femoral-sentado-unilateral", "Curl femoral sentado unilateral", "Single-leg seated curl",
    "femorales", ["gluteos"], "aislamiento", ["rodilla"], "machine"),
  entry("curl-femoral-acostado", "Curl femoral acostado", "Lying leg curl",
    "femorales", ["gluteos"], "aislamiento", ["rodilla"], "machine"),
  entry("peso-muerto-rumano", "Peso muerto rumano", "Romanian deadlift",
    "femorales", ["gluteos", "espalda_alta"], "bisagra_cadera", ["cadera", "columna_lumbar"], "machine",
    ["Peso muerto rumano con mancuernas"]),
  entry("peso-muerto", "Peso muerto (Deadlift)", "Deadlift",
    "femorales", ["gluteos", "espalda_alta", "cuadriceps"], "bisagra_cadera", ["cadera", "columna_lumbar"], "barbell",
    ["Peso muerto con kettlebell"]),
  entry("hip-thrust", "Hip thrust en máquina", "Machine hip thrust",
    "gluteos", ["femorales"], "bisagra_cadera", ["cadera"], "machine",
    ["Hip thrust"]),
  entry("kb-swing", "KB swing", "Kettlebell swing",
    "gluteos", ["femorales", "espalda_alta"], "bisagra_cadera", ["cadera", "columna_lumbar"], "dumbbell"),
  entry("abduccion-de-cadera-en-maquina", "Abducción de cadera en máquina", "Machine hip abduction",
    "abductores_aductores", ["gluteos"], "aduccion_abduccion", ["cadera"], "machine"),

  // --- Pantorrillas ------------------------------------------------------
  entry("pantorrilla-sentada", "Pantorrilla sentada", "Seated calf raise",
    "pantorrillas", [], "aislamiento", ["tobillo"], "machine",
    ["Pantorrilla sentado", "Elevación de pantorrillas"]),
  entry("pantorrilla-sentada-unilateral", "Pantorrilla sentada unilateral", "Single-leg seated calf raise",
    "pantorrillas", [], "aislamiento", ["tobillo"], "machine"),
  entry("pantorrilla-de-pie-unilateral", "Pantorrilla de pie unilateral", "Single-leg standing calf raise",
    "pantorrillas", [], "aislamiento", ["tobillo"], "machine"),
  entry("pantorrilla-en-la-prensa", "Pantorrilla en la prensa", "Calf raise on leg press",
    "pantorrillas", [], "aislamiento", ["tobillo"], "machine"),

  // --- Core --------------------------------------------------------------
  // "Core" appears on all five days of the real plan as one generic label.
  // Kept so those rows classify on day one rather than reading as broken; the
  // per-day rename in drizzle/0019 replaces them with the specific entries.
  entry("core-generico", "Core", "Core",
    "core", [], "core_flexion", ["columna_lumbar"], "machine"),
  entry("crunch-en-maquina", "Crunch en máquina", "Machine crunch",
    "core", [], "core_flexion", ["columna_lumbar"], "machine"),
  entry("pallof-press-en-polea", "Pallof press en polea", "Cable Pallof press",
    "core", [], "core_antirrotacion", ["columna_lumbar"], "machine"),
  entry("elevacion-de-rodillas-en-paralelas", "Elevación de rodillas en paralelas", "Captain's chair knee raise",
    "core", [], "core_flexion", ["columna_lumbar", "cadera"], "bodyweight"),
  entry("plancha", "Plancha", "Plank",
    "core", [], "core_antiextension", ["columna_lumbar", "hombro"], "bodyweight"),
  entry("plancha-lateral", "Plancha lateral", "Side plank",
    "core", [], "core_antiflexion_lateral", ["columna_lumbar", "hombro"], "bodyweight"),
  entry("reverse-crunch", "Reverse crunch", "Reverse crunch",
    "core", [], "core_flexion", ["columna_lumbar"], "bodyweight"),
  entry("russian-twist", "Russian twist", "Russian twist",
    "core", [], "core_rotacion", ["columna_lumbar"], "bodyweight"),
  entry("bird-dog", "Bird dog", "Bird dog",
    "core", ["gluteos"], "core_antiextension", ["columna_lumbar"], "bodyweight"),
  entry("escaladores", "Escaladores", "Mountain climbers",
    "core", ["cuadriceps"], "core_antiextension", ["columna_lumbar", "hombro"], "bodyweight"),
  entry("inchworms", "Inchworms (gusanos)", "Inchworms",
    "core", ["pecho"], "core_antiextension", ["columna_lumbar", "hombro"], "bodyweight"),
  entry("farmer-carry", "Farmer carry", "Farmer carry",
    "core", ["espalda_alta", "pantorrillas"], "core_antiflexion_lateral", ["columna_lumbar", "hombro"], "dumbbell"),

  // --- Cardio / acondicionamiento ---------------------------------------
  // primaryMuscleGroup null: known exercises that deliberately contribute zero
  // effective sets, as distinct from "sin clasificar".
  entry("caminata-en-banda", "Caminata en banda", "Treadmill walk",
    null, [], "cardio", [], "machine",
    ["Caminadora inclinada o bicicleta"]),
  entry("bici-estatica", "Bici estática", "Stationary bike",
    null, [], "cardio", [], "machine"),
  entry("remo-maquina-cardio", "Remo (máquina)", "Rowing erg",
    null, [], "cardio", [], "machine",
    ["Remo 500m"]),
  entry("jumping-jacks", "Jumping jacks", "Jumping jacks",
    null, [], "cardio", [], "bodyweight"),
  entry("burpees", "Burpees", "Burpees",
    null, [], "cardio", [], "bodyweight"),
  entry("escalera-finalizador", "Escalera (finalizador)", "Stair finisher",
    null, [], "cardio", [], "machine"),
];

const CATALOG_BY_NORMALIZED_NAME: Map<string, ExerciseCatalogEntry> = (() => {
  const byName = new Map<string, ExerciseCatalogEntry>();
  for (const catalogEntry of exerciseCatalog) {
    for (const name of [catalogEntry.nameEs, ...(catalogEntry.aliases ?? [])]) {
      byName.set(normalizeExerciseName(name), catalogEntry);
    }
  }
  return byName;
})();

const CATALOG_BY_SLUG: Map<string, ExerciseCatalogEntry> = new Map(
  exerciseCatalog.map((catalogEntry) => [catalogEntry.slug, catalogEntry]),
);

/** Step 2 of the resolution order — tolerant of case, accents, whitespace and
 *  fat-loss-plan's "Bloque 1 · " prefixing. */
export function findCatalogEntryByName(nameEs: string): ExerciseCatalogEntry | null {
  return CATALOG_BY_NORMALIZED_NAME.get(normalizeExerciseName(nameEs)) ?? null;
}

export function findCatalogEntryBySlug(slug: string): ExerciseCatalogEntry | null {
  return CATALOG_BY_SLUG.get(slug) ?? null;
}
