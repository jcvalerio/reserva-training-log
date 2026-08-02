import { z } from "zod";

export const planShareInputSchema = z.object({
  recipientEmail: z.preprocess(
    (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
    z.email({ error: "Correo inválido." }),
  ),
});

export type PlanShareInput = z.infer<typeof planShareInputSchema>;

export function parsePlanShareFormData(formData: FormData): PlanShareInput {
  return planShareInputSchema.parse({ recipientEmail: formData.get("recipientEmail") });
}
