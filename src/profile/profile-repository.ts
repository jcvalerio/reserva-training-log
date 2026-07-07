import { randomUUID } from "node:crypto";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { athleteProfile } from "@/db/schema";
import { assertOwnedByUser } from "@/lib/ownership";

import type { AthleteProfileInput } from "./profile-schema";
import { composeProfileNotes } from "./profile-schema";

export type AthleteProfile = typeof athleteProfile.$inferSelect;

export async function getAthleteProfileForUser(userId: string): Promise<AthleteProfile | null> {
  const [profile] = await db
    .select()
    .from(athleteProfile)
    .where(eq(athleteProfile.userId, userId))
    .orderBy(desc(athleteProfile.createdAt))
    .limit(1);

  if (!profile) {
    return null;
  }

  assertOwnedByUser(profile, userId, "perfil");
  return profile;
}

export async function saveAthleteProfileForUser(
  userId: string,
  input: AthleteProfileInput,
): Promise<AthleteProfile> {
  const existingProfile = await getAthleteProfileForUser(userId);
  const values = toAthleteProfileValues(userId, input);

  if (!existingProfile) {
    const [createdProfile] = await db
      .insert(athleteProfile)
      .values({
        id: randomUUID(),
        ...values,
      })
      .returning();

    if (!createdProfile) {
      throw new Error("No se pudo crear el perfil de atleta.");
    }

    return createdProfile;
  }

  assertOwnedByUser(existingProfile, userId, "perfil");

  const [updatedProfile] = await db
    .update(athleteProfile)
    .set(values)
    .where(and(eq(athleteProfile.id, existingProfile.id), eq(athleteProfile.userId, userId)))
    .returning();

  if (!updatedProfile) {
    throw new Error("No se pudo actualizar el perfil de atleta.");
  }

  return updatedProfile;
}

function toAthleteProfileValues(userId: string, input: AthleteProfileInput) {
  return {
    userId,
    name: input.name,
    sex: input.sex ?? null,
    birthYear: input.birthYear ?? null,
    trainingAgeYears: input.trainingAgeYears ?? null,
    recentTrainingFrequencyDaysPerWeek: input.recentTrainingFrequencyDaysPerWeek ?? null,
    targetTrainingDaysPerWeek: input.targetTrainingDaysPerWeek,
    targetSessionDurationMinutes: input.targetSessionDurationMinutes,
    primaryGoal: input.primaryGoal,
    secondaryGoals: input.secondaryGoals,
    progressionAggressiveness: input.progressionAggressiveness,
    preferredLocale: input.preferredLocale,
    timezone: input.timezone,
    gymContext: input.gymContext,
    notes: composeProfileNotes(input) ?? null,
  } satisfies Omit<typeof athleteProfile.$inferInsert, "id" | "createdAt" | "updatedAt">;
}
