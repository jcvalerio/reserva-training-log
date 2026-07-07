import { randomUUID } from "node:crypto";

import { asc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { baselineLift, exercise } from "@/db/schema";

import { baselineExerciseDefinitions, baselineExerciseSlugs } from "./baseline-exercises";
import type { BaselineLiftInput } from "./baseline-schema";

export type BaselineLift = typeof baselineLift.$inferSelect;
export type BaselineLiftWithExercise = BaselineLift & {
  exercise: typeof exercise.$inferSelect;
};

export async function getBaselineLiftsForProfile(athleteProfileId: string): Promise<BaselineLiftWithExercise[]> {
  const rows = await db
    .select({ baseline: baselineLift, exercise })
    .from(baselineLift)
    .innerJoin(exercise, eq(baselineLift.exerciseId, exercise.id))
    .where(eq(baselineLift.athleteProfileId, athleteProfileId))
    .orderBy(asc(exercise.nameEs), asc(baselineLift.side));

  return rows.map((row) => ({ ...row.baseline, exercise: row.exercise }));
}

export async function saveBaselineLiftsForProfile(athleteProfileId: string, inputs: BaselineLiftInput[]) {
  const exerciseBySlug = await ensureBaselineExercises();

  await db.delete(baselineLift).where(eq(baselineLift.athleteProfileId, athleteProfileId));

  if (inputs.length === 0) {
    return [];
  }

  const rows = inputs.map((input) => {
    const exerciseRow = exerciseBySlug.get(input.exerciseSlug);

    if (!exerciseRow) {
      throw new Error(`Ejercicio base no configurado: ${input.exerciseSlug}`);
    }

    return {
      id: randomUUID(),
      athleteProfileId,
      exerciseId: exerciseRow.id,
      side: input.side,
      weightKg: input.weightKg,
      reps: input.reps,
      sets: input.sets,
      rir: input.rir,
      painScore: input.painScore,
      notes: input.notes ?? null,
    } satisfies typeof baselineLift.$inferInsert;
  });

  return db.insert(baselineLift).values(rows).returning();
}

async function ensureBaselineExercises() {
  await db
    .insert(exercise)
    .values(
      baselineExerciseDefinitions.map((definition) => ({
        id: randomUUID(),
        slug: definition.slug,
        nameEs: definition.nameEs,
        nameEn: definition.nameEn,
        primaryMuscles: definition.primaryMuscles,
        equipmentType: definition.equipmentType,
        isUnilateralCapable: definition.isUnilateral,
      })),
    )
    .onConflictDoNothing({ target: exercise.slug });

  const exerciseRows = await db.select().from(exercise).where(inArray(exercise.slug, baselineExerciseSlugs));

  return new Map(exerciseRows.map((exerciseRow) => [exerciseRow.slug, exerciseRow]));
}
