import { z } from "zod";

const optionalNumber = (min: number, max: number) =>
  z.preprocess(
    (value) => {
      if (value === null || value === undefined) {
        return null;
      }
      if (typeof value === "string") {
        return value.trim() === "" ? null : Number(value);
      }
      return value;
    },
    z.number().min(min).max(max).nullable(),
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
 * Every metric is optional individually, but a save has to carry at least one
 * — the same rule body measurements already use. An athlete with a chair and
 * no wall to steady themselves should be able to record half the picture
 * rather than being blocked into recording none of it.
 *
 * Zero is a legitimate value for balance: failing to hold the position at all
 * is a real, and serious, result. Rejecting it would discard the finding.
 *
 * The upper bounds are sanity rails rather than clinical limits. Balance is
 * capped at 120s because the protocol says to stop at 60 and anything past two
 * minutes is a typo, not a feat.
 */
export const functionalTestInputSchema = z
  .object({
    sitToStandReps: optionalNumber(0, 100).pipe(z.number().int().nullable()),
    balanceLeftSeconds: optionalNumber(0, 120),
    balanceRightSeconds: optionalNumber(0, 120),
    notes: optionalTrimmedString,
  })
  .refine(
    (input) =>
      input.sitToStandReps !== null ||
      input.balanceLeftSeconds !== null ||
      input.balanceRightSeconds !== null,
    { message: "Registra al menos una prueba." },
  );

export type FunctionalTestInput = z.infer<typeof functionalTestInputSchema>;

export function parseFunctionalTestFormData(formData: FormData): FunctionalTestInput {
  return functionalTestInputSchema.parse({
    sitToStandReps: formData.get("sitToStandReps"),
    balanceLeftSeconds: formData.get("balanceLeftSeconds"),
    balanceRightSeconds: formData.get("balanceRightSeconds"),
    notes: formData.get("notes") || undefined,
  });
}
