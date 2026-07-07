import { z } from "zod";

import { baselineExerciseDefinitions } from "./baseline-exercises";

const sideSchema = z.enum(["bilateral", "left", "right"]);
const requiredNumber = (fieldName: string, min: number, max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() !== "" ? Number(value) : value),
    z.number({ error: `${fieldName} es requerido.` }).min(min).max(max),
  );

const optionalTrimmedString = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  },
  z.string().max(500).optional(),
);

export const baselineLiftInputSchema = z.object({
  exerciseSlug: z.enum(baselineExerciseDefinitions.map((exercise) => exercise.slug)),
  side: sideSchema,
  weightKg: requiredNumber("kg", 0.5, 999).transform((value) => value.toFixed(2)),
  reps: requiredNumber("reps", 1, 50).pipe(z.number().int()),
  sets: requiredNumber("sets", 1, 10).pipe(z.number().int()),
  rir: requiredNumber("RIR", 0, 4).pipe(z.number().int()),
  painScore: requiredNumber("dolor", 0, 10).pipe(z.number().int()),
  notes: optionalTrimmedString,
});

export type BaselineLiftInput = z.infer<typeof baselineLiftInputSchema>;

export function getBaselineSides(isUnilateral: boolean): Array<BaselineLiftInput["side"]> {
  return isUnilateral ? ["left", "right"] : ["bilateral"];
}

export function parseBaselineFormData(formData: FormData): BaselineLiftInput[] {
  const entries = baselineExerciseDefinitions.flatMap((exercise) =>
    getBaselineSides(exercise.isUnilateral).map((side) => parseMaybeBaselineEntry(formData, exercise.slug, side)),
  );
  const completedEntries = entries.filter((entry): entry is BaselineLiftInput => entry !== null);

  if (completedEntries.length === 0) {
    throw new Error("Registra al menos un peso base antes de continuar.");
  }

  return completedEntries;
}

function parseMaybeBaselineEntry(
  formData: FormData,
  exerciseSlug: string,
  side: BaselineLiftInput["side"],
): BaselineLiftInput | null {
  const prefix = `${exerciseSlug}:${side}`;
  const raw = {
    exerciseSlug,
    side,
    weightKg: formData.get(`${prefix}:weightKg`),
    reps: formData.get(`${prefix}:reps`),
    sets: formData.get(`${prefix}:sets`),
    rir: formData.get(`${prefix}:rir`),
    painScore: formData.get(`${prefix}:painScore`),
    notes: formData.get(`${prefix}:notes`) || undefined,
  };

  const hasAnyValue = [raw.weightKg, raw.reps, raw.sets, raw.rir, raw.painScore, raw.notes].some(
    (value) => typeof value === "string" && value.trim() !== "",
  );

  if (!hasAnyValue) {
    return null;
  }

  return baselineLiftInputSchema.parse(raw);
}
