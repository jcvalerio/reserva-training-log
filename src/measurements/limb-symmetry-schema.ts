import { z } from "zod";

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
 * One load for both sides, deliberately. The index compares rep counts, and
 * rep counts at different loads compare nothing — so the form takes a single
 * weight rather than one per side, making the mistake unrepresentable instead
 * of merely discouraged.
 *
 * Zero reps is allowed: a side that cannot complete a single rep at a load the
 * other side handles is the most extreme finding this test can produce, and
 * rejecting it would discard exactly that.
 */
export const limbSymmetryTestInputSchema = z.object({
  exerciseNameEs: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z.string({ error: "El ejercicio es requerido." }).min(1).max(120),
  ),
  testWeightKg: requiredNumber("kg", 0, 999).transform((value) => value.toFixed(2)),
  leftReps: requiredNumber("reps izquierda", 0, 200).pipe(z.number().int()),
  rightReps: requiredNumber("reps derecha", 0, 200).pipe(z.number().int()),
  notes: optionalTrimmedString,
});

export type LimbSymmetryTestInput = z.infer<typeof limbSymmetryTestInputSchema>;

export function parseLimbSymmetryTestFormData(formData: FormData): LimbSymmetryTestInput {
  return limbSymmetryTestInputSchema.parse({
    exerciseNameEs: formData.get("exerciseNameEs"),
    testWeightKg: formData.get("testWeightKg"),
    leftReps: formData.get("leftReps"),
    rightReps: formData.get("rightReps"),
    notes: formData.get("notes") || undefined,
  });
}
