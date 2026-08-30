import { z } from "zod";

const currentYear = new Date().getFullYear();

const optionalTrimmedString = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  },
  z.string().optional(),
);

const optionalInteger = (min: number, max: number) =>
  z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined) {
        return undefined;
      }

      if (typeof value === "string") {
        return Number(value);
      }

      return value;
    },
    z.number().int().min(min).max(max).optional(),
  );

export const athleteProfileInputSchema = z.object({
  name: z.string().trim().min(2).max(100),
  sex: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
  birthYear: optionalInteger(1900, currentYear),
  trainingAgeYears: optionalInteger(0, 70),
  recentTrainingFrequencyDaysPerWeek: optionalInteger(0, 7),
  targetTrainingDaysPerWeek: optionalInteger(1, 7).default(5),
  targetSessionDurationMinutes: optionalInteger(30, 150).default(60),
  primaryGoal: z.literal("hypertrophy").default("hypertrophy"),
  secondaryGoals: z.array(z.enum(["mobility", "fat_loss"])).default(["mobility", "fat_loss"]),
  progressionAggressiveness: z.enum(["conservative", "normal", "aggressive"]).default("aggressive"),
  preferredLocale: z.enum(["es", "en"]).default("es"),
  timezone: z.string().trim().min(1).default("America/Costa_Rica"),
  gymContext: z.string().trim().min(1).max(200).default("Gimnasio con equipo completo"),
  notes: optionalTrimmedString,
  painSensitiveAreas: optionalTrimmedString,
  musclePriorities: optionalTrimmedString,
});

export type AthleteProfileInput = z.infer<typeof athleteProfileInputSchema>;

export function parseAthleteProfileFormData(formData: FormData): AthleteProfileInput {
  return athleteProfileInputSchema.parse({
    name: formData.get("name"),
    sex: formData.get("sex") || undefined,
    birthYear: formData.get("birthYear"),
    trainingAgeYears: formData.get("trainingAgeYears"),
    recentTrainingFrequencyDaysPerWeek: formData.get("recentTrainingFrequencyDaysPerWeek"),
    targetTrainingDaysPerWeek: formData.get("targetTrainingDaysPerWeek") || undefined,
    targetSessionDurationMinutes: formData.get("targetSessionDurationMinutes") || undefined,
    progressionAggressiveness: formData.get("progressionAggressiveness") || undefined,
    preferredLocale: formData.get("preferredLocale") || undefined,
    timezone: formData.get("timezone") || undefined,
    gymContext: formData.get("gymContext") || undefined,
    notes: formData.get("notes") || undefined,
    painSensitiveAreas: formData.get("painSensitiveAreas") || undefined,
    musclePriorities: formData.get("musclePriorities") || undefined,
  });
}

export function parseProfileListInput(value: string | undefined): string[] {
  return (
    value
      ?.split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 20) ?? []
  );
}
