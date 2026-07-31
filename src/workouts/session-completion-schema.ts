import { z } from "zod";

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

const optionalRpe = z.preprocess(
  (value) => (typeof value === "string" && value.trim() !== "" ? Number(value) : undefined),
  z.number().int().min(1).max(10).optional(),
);

export const sessionCompletionInputSchema = z.object({
  notes: optionalTrimmedString,
  sessionRpe: optionalRpe,
});

export type SessionCompletionInput = z.infer<typeof sessionCompletionInputSchema>;

export function parseSessionCompletionFormData(formData: FormData): SessionCompletionInput {
  return sessionCompletionInputSchema.parse({
    notes: formData.get("notes") || undefined,
    sessionRpe: formData.get("sessionRpe") || undefined,
  });
}
