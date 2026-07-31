import { z } from "zod";

import { rirValues } from "@/training/rir";

const rirSchema = z.union(rirValues.map((value) => z.literal(value)) as [
  z.ZodLiteral<0>,
  z.ZodLiteral<1>,
  z.ZodLiteral<2>,
  z.ZodLiteral<3>,
  z.ZodLiteral<4>,
]);

const commonExerciseFields = {
  exerciseNameEs: z.string().min(1),
  exerciseNameEn: z.string().min(1).optional(),
  phase: z.enum(["warmup", "main", "accessory", "mobility"]),
  isUnilateral: z.boolean(),
  targetSets: z.number().int().min(1).max(6),
  restSeconds: z.number().int().min(30).max(240),
  notesEs: z.string().min(1),
  notesEn: z.string().min(1).optional(),
  painSensitive: z.boolean().default(false),
  substitutionOptionsEs: z.array(z.string().min(1)).max(3).default([]),
};

// Sets x rep-range x RIR — the original, and still most common, shape.
const strengthExercisePrescriptionSchema = z.object({
  prescriptionType: z.literal("strength"),
  ...commonExerciseFields,
  targetRepMin: z.number().int().min(1).max(30),
  targetRepMax: z.number().int().min(1).max(30),
  targetRir: rirSchema,
  // Both optional: absent for unclassified exercises, so consumers
  // (weight-increment suggestions) must fall back gracefully.
  loadMechanism: z.enum(["bodyweight", "dumbbell", "machine", "barbell"]).optional(),
  isCompound: z.boolean().optional(),
});

// A single timed bout — cardio warmups (stair climber, treadmill), mobility
// holds. RIR and a rep range don't apply: there's no "failure" concept for
// steady-state cardio or a stretch. targetSets still applies (e.g. 1 for a
// continuous warmup, 2 for "stretch each side once").
const durationExercisePrescriptionSchema = z.object({
  prescriptionType: z.literal("duration"),
  ...commonExerciseFields,
  durationSeconds: z.number().int().min(5).max(3600),
});

export const generatedExercisePrescriptionSchema = z
  .discriminatedUnion("prescriptionType", [strengthExercisePrescriptionSchema, durationExercisePrescriptionSchema])
  .refine((exercise) => exercise.prescriptionType !== "strength" || exercise.targetRepMin <= exercise.targetRepMax, {
    message: "targetRepMin must be <= targetRepMax",
    path: ["targetRepMin"],
  });

export type GeneratedExercisePrescription = z.infer<typeof generatedExercisePrescriptionSchema>;

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
