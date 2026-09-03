import { randomUUID } from "node:crypto";

import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { functionalTest } from "@/db/schema";
import type { FunctionalTestRecord } from "@/workouts/functional-capacity";

import type { FunctionalTestInput } from "./functional-test-schema";

export type FunctionalTest = typeof functionalTest.$inferSelect;

/**
 * Ascending, and uncapped unlike the measurement queries: the trend compares
 * the oldest test against the newest, so dropping the oldest rows would move
 * the baseline every time a new test is recorded and quietly shrink every
 * reported gain. At a test every eight weeks this stays tiny for years.
 */
export async function getFunctionalTestsForProfile(
  athleteProfileId: string,
): Promise<FunctionalTestRecord[]> {
  const rows = await db
    .select()
    .from(functionalTest)
    .where(eq(functionalTest.athleteProfileId, athleteProfileId))
    .orderBy(asc(functionalTest.testedAt));

  return rows.map((row) => ({
    id: row.id,
    testedAt: row.testedAt,
    sitToStandReps: row.sitToStandReps,
    balanceLeftSeconds: row.balanceLeftSeconds,
    balanceRightSeconds: row.balanceRightSeconds,
  }));
}

export async function createFunctionalTestForProfile(
  athleteProfileId: string,
  input: FunctionalTestInput,
): Promise<FunctionalTest | null> {
  const [created] = await db
    .insert(functionalTest)
    .values({
      id: randomUUID(),
      athleteProfileId,
      sitToStandReps: input.sitToStandReps,
      balanceLeftSeconds: input.balanceLeftSeconds === null ? null : input.balanceLeftSeconds.toFixed(2),
      balanceRightSeconds: input.balanceRightSeconds === null ? null : input.balanceRightSeconds.toFixed(2),
      notes: input.notes ?? null,
    })
    .returning();

  return created ?? null;
}
