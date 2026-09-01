import { z } from "zod";

import { painLocations } from "@/training/muscle-taxonomy";

const sideSchema = z.enum(["bilateral", "left", "right"]);
const prescriptionTypeSchema = z.enum(["strength", "duration"]);

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

/**
 * Absent → null, meaning "not asked". The set-logging form no longer carries
 * a pain field at all; pain arrives once per exercise through
 * exercisePainAnswerSchema below. Kept accepting a value because the
 * edit-a-logged-set form still offers one, and because a set that already
 * carries an answer must be correctable.
 */
const optionalPainScore = z.preprocess(
  (value) => {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === "string") {
      return value.trim() === "" ? null : Number(value);
    }
    return value;
  },
  z.number().int().min(0).max(10).nullable(),
);

const optionalPainLocation = z.preprocess(
  (value) => (typeof value === "string" && value.trim() !== "" ? value.trim() : undefined),
  z.enum(painLocations).optional(),
);

const commonSetLogFields = {
  side: sideSchema,
  painScore: optionalPainScore,
  painLocation: optionalPainLocation,
  notes: optionalTrimmedString,
};

const strengthSetLogInputSchema = z.object({
  prescriptionType: z.literal("strength"),
  ...commonSetLogFields,
  actualWeightKg: requiredNumber("kg", 0.5, 999).transform((value) => value.toFixed(2)),
  actualReps: requiredNumber("reps", 1, 50).pipe(z.number().int()),
  rir: requiredNumber("RIR", 0, 4).pipe(z.number().int()),
});

const durationSetLogInputSchema = z.object({
  prescriptionType: z.literal("duration"),
  ...commonSetLogFields,
  actualDurationSeconds: requiredNumber("duración", 1, 3600).pipe(z.number().int()),
});

export const setLogInputSchema = z.discriminatedUnion("prescriptionType", [
  strengthSetLogInputSchema,
  durationSetLogInputSchema,
]);

export type SetLogInput = z.infer<typeof setLogInputSchema>;

/**
 * The one pain question, asked after an exercise rather than after a set.
 *
 * "No" is a real answer and is stored as 0, not as null — that is the whole
 * point of the change. null stays reserved for "never asked", so the two are
 * still distinguishable a month from now when someone reads this data.
 *
 * A "sí" with no score is not a validation error: an athlete who taps "sí"
 * and then abandons the scale has still told us something, and refusing the
 * write would lose it. It lands as 1 — the lowest value that is not "no".
 */
export const exercisePainAnswerSchema = z
  .object({
    bothered: z.enum(["si", "no"]),
    painScore: optionalPainScore,
    painLocation: optionalPainLocation,
  })
  .transform((input) => {
    if (input.bothered === "no") {
      return { painScore: 0, painLocation: null };
    }

    return {
      painScore: input.painScore === null || input.painScore < 1 ? 1 : input.painScore,
      painLocation: input.painLocation ?? null,
    };
  });

export type ExercisePainAnswer = z.infer<typeof exercisePainAnswerSchema>;

export function parseExercisePainAnswer(formData: FormData): ExercisePainAnswer {
  return exercisePainAnswerSchema.parse({
    bothered: formData.get("bothered"),
    painScore: formData.get("painScore"),
    painLocation: formData.get("painLocation"),
  });
}

export function parseSetLogFormData(formData: FormData): SetLogInput {
  // Defaults to "strength" when omitted, matching every set-logging form
  // that existed before duration-type exercises did.
  const prescriptionType = prescriptionTypeSchema.catch("strength").parse(formData.get("prescriptionType"));

  return setLogInputSchema.parse({
    prescriptionType,
    side: formData.get("side"),
    actualWeightKg: formData.get("actualWeightKg"),
    actualReps: formData.get("actualReps"),
    rir: formData.get("rir"),
    actualDurationSeconds: formData.get("actualDurationSeconds"),
    painScore: formData.get("painScore"),
    painLocation: formData.get("painLocation"),
    notes: formData.get("notes") || undefined,
  });
}
