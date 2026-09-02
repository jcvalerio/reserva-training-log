import { randomUUID } from "node:crypto";

import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { limbSymmetryTest } from "@/db/schema";
import type { LimbSymmetryTestRecord } from "@/workouts/limb-symmetry";

import type { LimbSymmetryTestInput } from "./limb-symmetry-schema";

export type LimbSymmetryTest = typeof limbSymmetryTest.$inferSelect;

/**
 * Capped like getRecentBodyMeasurementsForProfile: the summary only keeps the
 * newest test per exercise, so an unbounded history buys nothing on a screen
 * that reports current state.
 */
export async function getRecentLimbSymmetryTestsForProfile(
  athleteProfileId: string,
  limit = 20,
): Promise<LimbSymmetryTestRecord[]> {
  const rows = await db
    .select()
    .from(limbSymmetryTest)
    .where(eq(limbSymmetryTest.athleteProfileId, athleteProfileId))
    .orderBy(desc(limbSymmetryTest.testedAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    testedAt: row.testedAt,
    exerciseNameEs: row.exerciseNameEs,
    testWeightKg: row.testWeightKg,
    leftReps: row.leftReps,
    rightReps: row.rightReps,
  }));
}

export async function createLimbSymmetryTestForProfile(
  athleteProfileId: string,
  input: LimbSymmetryTestInput,
): Promise<LimbSymmetryTest | null> {
  const [created] = await db
    .insert(limbSymmetryTest)
    .values({
      id: randomUUID(),
      athleteProfileId,
      exerciseNameEs: input.exerciseNameEs,
      testWeightKg: input.testWeightKg,
      leftReps: input.leftReps,
      rightReps: input.rightReps,
      notes: input.notes ?? null,
    })
    .returning();

  return created ?? null;
}
