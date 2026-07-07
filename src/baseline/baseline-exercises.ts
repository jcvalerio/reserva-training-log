export type BaselineExerciseDefinition = {
  slug: string;
  nameEs: string;
  nameEn: string;
  equipmentType: string;
  primaryMuscles: string[];
  isUnilateral: boolean;
};

export const baselineExerciseDefinitions = [
  {
    slug: "leg-press",
    nameEs: "Prensa de piernas",
    nameEn: "Leg press",
    equipmentType: "machine",
    primaryMuscles: ["quadriceps", "glutes"],
    isUnilateral: false,
  },
  {
    slug: "single-leg-leg-press",
    nameEs: "Prensa de pierna unilateral",
    nameEn: "Single-leg leg press",
    equipmentType: "machine",
    primaryMuscles: ["quadriceps", "glutes"],
    isUnilateral: true,
  },
  {
    slug: "leg-extension",
    nameEs: "Extensión de piernas",
    nameEn: "Leg extension",
    equipmentType: "machine",
    primaryMuscles: ["quadriceps"],
    isUnilateral: true,
  },
  {
    slug: "hack-or-smith-squat",
    nameEs: "Hack squat o sentadilla Smith",
    nameEn: "Hack squat or Smith squat",
    equipmentType: "machine",
    primaryMuscles: ["quadriceps", "glutes"],
    isUnilateral: false,
  },
  {
    slug: "leg-curl",
    nameEs: "Curl femoral sentado/acostado",
    nameEn: "Seated/lying leg curl",
    equipmentType: "machine",
    primaryMuscles: ["hamstrings"],
    isUnilateral: true,
  },
  {
    slug: "calf-raise",
    nameEs: "Elevación de pantorrillas",
    nameEn: "Calf raise",
    equipmentType: "machine",
    primaryMuscles: ["calves"],
    isUnilateral: true,
  },
  {
    slug: "chest-press-or-db-bench",
    nameEs: "Press de pecho o banco con mancuernas",
    nameEn: "Chest press or dumbbell bench",
    equipmentType: "machine_or_dumbbell",
    primaryMuscles: ["chest"],
    isUnilateral: false,
  },
  {
    slug: "lat-pulldown",
    nameEs: "Jalón al pecho",
    nameEn: "Lat pulldown",
    equipmentType: "cable",
    primaryMuscles: ["back"],
    isUnilateral: false,
  },
  {
    slug: "seated-row",
    nameEs: "Remo sentado",
    nameEn: "Seated row",
    equipmentType: "cable",
    primaryMuscles: ["back"],
    isUnilateral: false,
  },
  {
    slug: "shoulder-friendly-press-or-lateral-raise",
    nameEs: "Press amigable de hombro o elevación lateral",
    nameEn: "Shoulder-friendly press or lateral raise",
    equipmentType: "machine_or_dumbbell",
    primaryMuscles: ["shoulders"],
    isUnilateral: true,
  },
  {
    slug: "cable-triceps",
    nameEs: "Tríceps en cable",
    nameEn: "Cable triceps",
    equipmentType: "cable",
    primaryMuscles: ["triceps"],
    isUnilateral: false,
  },
  {
    slug: "cable-or-db-curl",
    nameEs: "Curl en cable o mancuerna",
    nameEn: "Cable/biceps curl",
    equipmentType: "cable_or_dumbbell",
    primaryMuscles: ["biceps"],
    isUnilateral: true,
  },
] satisfies BaselineExerciseDefinition[];

export const baselineExerciseSlugs = baselineExerciseDefinitions.map((exercise) => exercise.slug);
