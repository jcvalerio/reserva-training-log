import { z } from "zod";

import { rirValues } from "@/training/rir";

const requiredNumber = (fieldName: string, min: number, max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() !== "" ? Number(value) : value),
    z.number({ error: `${fieldName} es requerido.` }).min(min).max(max),
  );

const requiredTrimmedString = (fieldName: string, max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z.string({ error: `${fieldName} es requerido.` }).min(1, `${fieldName} es requerido.`).max(max),
  );

const withDefault = <Value extends string>(fallback: Value, schema: z.ZodType<Value>) =>
  z.preprocess((value) => (typeof value === "string" && value.trim() !== "" ? value : fallback), schema);

const phaseSchema = z.enum(["warmup", "main", "accessory", "mobility"]);
const sideModeSchema = z.enum(["bilateral", "unilateral_separate", "unilateral_matched"]);
const incrementCategorySchema = z.enum(["machine_or_lower_body", "upper_compound", "isolation", "dumbbell"]);
const rirSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() !== "" ? Number(value) : value),
  z.union(rirValues.map((value) => z.literal(value)) as [
    z.ZodLiteral<0>,
    z.ZodLiteral<1>,
    z.ZodLiteral<2>,
    z.ZodLiteral<3>,
    z.ZodLiteral<4>,
  ], { error: "RIR es requerido." }),
);

export const planBuilderSetupInputSchema = z.object({
  nameEs: requiredTrimmedString("Nombre del plan", 120),
  daysPerWeek: requiredNumber("Días de entrenamiento", 1, 7).pipe(z.number().int()),
});

export type PlanBuilderSetupInput = z.infer<typeof planBuilderSetupInputSchema>;

export function parsePlanBuilderSetupFormData(formData: FormData): PlanBuilderSetupInput {
  return planBuilderSetupInputSchema.parse({
    nameEs: formData.get("nameEs"),
    daysPerWeek: formData.get("daysPerWeek"),
  });
}

export const planBuilderSessionInfoInputSchema = z.object({
  nameEs: requiredTrimmedString("Nombre de la sesión", 120),
  focus: requiredTrimmedString("Enfoque de la sesión", 200),
  estimatedDurationMinutes: z.preprocess(
    (value) => (typeof value === "string" && value.trim() !== "" ? Number(value) : 60),
    z.number().int().min(15).max(180),
  ),
  mobilityNotesEs: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() !== ""
        ? value.trim()
        : "Incluye 5-8 minutos de movilidad específica y calentamiento progresivo.",
    z.string().min(1).max(500),
  ),
});

export type PlanBuilderSessionInfoInput = z.infer<typeof planBuilderSessionInfoInputSchema>;

export function parsePlanBuilderSessionInfoFormData(formData: FormData): PlanBuilderSessionInfoInput {
  return planBuilderSessionInfoInputSchema.parse({
    nameEs: formData.get("nameEs"),
    focus: formData.get("focus"),
    estimatedDurationMinutes: formData.get("estimatedDurationMinutes"),
    mobilityNotesEs: formData.get("mobilityNotesEs"),
  });
}

export const planBuilderExerciseInputSchema = z
  .object({
    exerciseNameEs: requiredTrimmedString("Nombre del ejercicio", 200),
    phase: withDefault("main", phaseSchema),
    sideMode: withDefault("bilateral", sideModeSchema),
    targetSets: requiredNumber("Series", 1, 6).pipe(z.number().int()),
    targetRepMin: requiredNumber("Reps mínimas", 1, 30).pipe(z.number().int()),
    targetRepMax: requiredNumber("Reps máximas", 1, 30).pipe(z.number().int()),
    targetRir: rirSchema,
    restSeconds: z.preprocess(
      (value) => (typeof value === "string" && value.trim() !== "" ? Number(value) : 90),
      z.number().int().min(30).max(240),
    ),
    notesEs: z.preprocess(
      (value) => (typeof value === "string" && value.trim() !== "" ? value.trim() : "Ajusta la carga y conserva técnica."),
      z.string().min(1).max(500),
    ),
    painSensitive: z.preprocess((value) => value === "on" || value === "true", z.boolean()),
    substitutionOptionsEs: z.preprocess((value) => {
      if (typeof value !== "string" || value.trim() === "") {
        return [];
      }
      return value
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item !== "");
    }, z.array(z.string().min(1)).max(3)),
    incrementCategory: z.preprocess(
      (value) => (typeof value === "string" && value.trim() !== "" ? value : undefined),
      incrementCategorySchema.optional(),
    ),
  })
  .refine((exercise) => exercise.targetRepMin <= exercise.targetRepMax, {
    message: "Las reps mínimas deben ser menores o iguales a las máximas.",
    path: ["targetRepMin"],
  });

export type PlanBuilderExerciseInput = z.infer<typeof planBuilderExerciseInputSchema>;

export function parsePlanBuilderSessionFormData(formData: FormData): PlanBuilderExerciseInput[] {
  const rowCount = Number(formData.get("rowCount") ?? 0);
  const exercises: PlanBuilderExerciseInput[] = [];

  for (let index = 0; index < rowCount; index += 1) {
    const prefix = `exercise-${index}`;
    const nameValue = formData.get(`${prefix}:exerciseNameEs`);
    const hasName = typeof nameValue === "string" && nameValue.trim() !== "";

    if (!hasName) {
      continue;
    }

    exercises.push(
      planBuilderExerciseInputSchema.parse({
        exerciseNameEs: nameValue,
        phase: formData.get(`${prefix}:phase`),
        sideMode: formData.get(`${prefix}:sideMode`),
        targetSets: formData.get(`${prefix}:targetSets`),
        targetRepMin: formData.get(`${prefix}:targetRepMin`),
        targetRepMax: formData.get(`${prefix}:targetRepMax`),
        targetRir: formData.get(`${prefix}:targetRir`),
        restSeconds: formData.get(`${prefix}:restSeconds`),
        notesEs: formData.get(`${prefix}:notesEs`),
        painSensitive: formData.get(`${prefix}:painSensitive`),
        substitutionOptionsEs: formData.get(`${prefix}:substitutionOptionsEs`),
        incrementCategory: formData.get(`${prefix}:incrementCategory`),
      }),
    );
  }

  if (exercises.length === 0) {
    throw new Error("Agrega al menos un ejercicio antes de guardar esta sesión.");
  }

  return exercises;
}
