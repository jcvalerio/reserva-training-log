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

// A session must have enough exercises to be a real training day. Anything
// that writes sessions later read through this schema (the plan builder,
// specifically) must enforce this same bound at write time — a plan that
// satisfies the builder's own "day complete" check but not this one will
// activate successfully yet fail every subsequent read of /plan.
export const MIN_SESSION_EXERCISES = 3;
export const MAX_SESSION_EXERCISES = 10;

export const generatedPlanSessionSchema = z.object({
  dayIndex: z.number().int().min(1).max(7),
  nameEs: z.string().min(1),
  nameEn: z.string().min(1).optional(),
  focus: z.string().min(1),
  estimatedDurationMinutes: z.number().int().min(15).max(180),
  mobilityNotesEs: z.string().min(1),
  exercises: z.array(generatedExercisePrescriptionSchema).min(MIN_SESSION_EXERCISES).max(MAX_SESSION_EXERCISES),
});

export const generatedWorkoutPlanSchema = z.object({
  schemaVersion: z.literal(1),
  locale: z.enum(["es", "en"]),
  nameEs: z.string().min(1),
  nameEn: z.string().min(1).optional(),
  goal: z.literal("hypertrophy"),
  // A plan is one routine that repeats indefinitely (no fixed week count) —
  // daysPerWeek is the number of distinct training days in the rotation.
  daysPerWeek: z.number().int().min(1).max(7),
  sessionDurationMinutes: z.number().int().min(15).max(180),
  safetySummaryEs: z.string().min(1),
  sessions: z.array(generatedPlanSessionSchema).min(1).max(7),
});

export type GeneratedWorkoutPlan = z.infer<typeof generatedWorkoutPlanSchema>;
