import { z } from "zod";

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

const commonSetLogFields = {
  side: sideSchema,
  painScore: requiredNumber("dolor", 0, 10).pipe(z.number().int()),
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
    notes: formData.get("notes") || undefined,
  });
}
