import { z } from "zod";

import { rirValues } from "@/training/rir";

const rirSchema = z.union(rirValues.map((value) => z.literal(value)) as [
  z.ZodLiteral<0>,
  z.ZodLiteral<1>,
  z.ZodLiteral<2>,
  z.ZodLiteral<3>,
  z.ZodLiteral<4>,
]);

export const generatedExercisePrescriptionSchema = z
  .object({
    exerciseNameEs: z.string().min(1),
    exerciseNameEn: z.string().min(1).optional(),
    phase: z.enum(["warmup", "main", "accessory", "mobility"]),
    sideMode: z.enum(["bilateral", "unilateral_separate", "unilateral_matched"]),
    targetSets: z.number().int().min(1).max(6),
    targetRepMin: z.number().int().min(1).max(30),
    targetRepMax: z.number().int().min(1).max(30),
    targetRir: rirSchema,
    restSeconds: z.number().int().min(30).max(240),
    notesEs: z.string().min(1),
    notesEn: z.string().min(1).optional(),
    painSensitive: z.boolean().default(false),
    substitutionOptionsEs: z.array(z.string().min(1)).max(3).default([]),
    // Optional: absent for plans persisted before this field existed, so
    // consumers (weight-increment suggestions) must fall back gracefully.
    incrementCategory: z.enum(["machine_or_lower_body", "upper_compound", "isolation", "dumbbell"]).optional(),
  })
  .refine((exercise) => exercise.targetRepMin <= exercise.targetRepMax, {
    message: "targetRepMin must be <= targetRepMax",
    path: ["targetRepMin"],
  });

export const generatedPlanSessionSchema = z.object({
  weekNumber: z.number().int().min(1).max(4),
  dayIndex: z.number().int().min(1).max(5),
  nameEs: z.string().min(1),
  nameEn: z.string().min(1).optional(),
  focus: z.string().min(1),
  estimatedDurationMinutes: z.number().int().min(30).max(60),
  mobilityNotesEs: z.string().min(1),
  exercises: z.array(generatedExercisePrescriptionSchema).min(3).max(10),
});

export const generatedPlanWeekSchema = z.object({
  weekNumber: z.number().int().min(1).max(4),
  sessions: z.array(generatedPlanSessionSchema).length(5),
});

export const generatedWorkoutPlanSchema = z.object({
  schemaVersion: z.literal(1),
  locale: z.enum(["es", "en"]),
  nameEs: z.string().min(1),
  nameEn: z.string().min(1).optional(),
  goal: z.literal("hypertrophy"),
  durationWeeks: z.literal(4),
  daysPerWeek: z.literal(5),
  sessionDurationMinutes: z.literal(60),
  safetySummaryEs: z.string().min(1),
  weeks: z.array(generatedPlanWeekSchema).length(4),
});

export type GeneratedWorkoutPlan = z.infer<typeof generatedWorkoutPlanSchema>;
