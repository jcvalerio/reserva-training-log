import { z } from "zod";

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

export const setLogInputSchema = z.object({
  side: sideSchema,
  actualWeightKg: requiredNumber("kg", 0.5, 999).transform((value) => value.toFixed(2)),
  actualReps: requiredNumber("reps", 1, 50).pipe(z.number().int()),
  rir: requiredNumber("RIR", 0, 4).pipe(z.number().int()),
  painScore: requiredNumber("dolor", 0, 10).pipe(z.number().int()),
  notes: optionalTrimmedString,
});

export type SetLogInput = z.infer<typeof setLogInputSchema>;

export function parseSetLogFormData(formData: FormData): SetLogInput {
  return setLogInputSchema.parse({
    side: formData.get("side"),
    actualWeightKg: formData.get("actualWeightKg"),
    actualReps: formData.get("actualReps"),
    rir: formData.get("rir"),
    painScore: formData.get("painScore"),
    notes: formData.get("notes") || undefined,
  });
}
