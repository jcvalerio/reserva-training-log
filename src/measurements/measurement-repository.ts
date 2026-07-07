import { randomUUID } from "node:crypto";

import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { bodyMeasurement } from "@/db/schema";

import type { BodyMeasurementInput } from "./measurement-schema";

export type BodyMeasurement = typeof bodyMeasurement.$inferSelect;

export async function getRecentBodyMeasurementsForProfile(
  athleteProfileId: string,
  limit = 10,
): Promise<BodyMeasurement[]> {
  return db
    .select()
    .from(bodyMeasurement)
    .where(eq(bodyMeasurement.athleteProfileId, athleteProfileId))
    .orderBy(desc(bodyMeasurement.measuredAt))
    .limit(limit);
}

export async function createBodyMeasurementForProfile(athleteProfileId: string, input: BodyMeasurementInput) {
  const values: typeof bodyMeasurement.$inferInsert = {
    id: randomUUID(),
    athleteProfileId,
    bodyWeightKg: input.bodyWeightKg ?? null,
    waistCm: input.waistCm ?? null,
    rightThighCm: input.rightThighCm ?? null,
    leftThighCm: input.leftThighCm ?? null,
    rightCalfCm: input.rightCalfCm ?? null,
    leftCalfCm: input.leftCalfCm ?? null,
    rightArmCm: input.rightArmCm ?? null,
    leftArmCm: input.leftArmCm ?? null,
    notes: input.notes ?? null,
  };

  if (input.measuredAt) {
    values.measuredAt = input.measuredAt;
  }

  const [createdMeasurement] = await db.insert(bodyMeasurement).values(values).returning();

  if (!createdMeasurement) {
    throw new Error("No se pudo guardar la medición.");
  }

  return createdMeasurement;
}
