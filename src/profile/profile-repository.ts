import { randomUUID } from "node:crypto";

import { and, asc, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { athleteProfile, limitation, musclePriority } from "@/db/schema";
import { assertOwnedByUser } from "@/lib/ownership";

import type { AthleteProfileInput } from "./profile-schema";
import { parseProfileListInput } from "./profile-schema";

export type AthleteProfile = typeof athleteProfile.$inferSelect;
export type Limitation = typeof limitation.$inferSelect;
export type MusclePriority = typeof musclePriority.$inferSelect;

export type AthleteProfileContext = {
  profile: AthleteProfile | null;
  limitations: Limitation[];
  musclePriorities: MusclePriority[];
};

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

export async function getAthleteProfileContextForUser(userId: string): Promise<AthleteProfileContext> {
  const profile = await getAthleteProfileForUser(userId);

  if (!profile) {
    return {
      profile: null,
      limitations: [],
      musclePriorities: [],
    };
  }

  const [limitations, musclePriorities] = await Promise.all([
    db
      .select()
      .from(limitation)
      .where(eq(limitation.athleteProfileId, profile.id))
      .orderBy(asc(limitation.createdAt)),
    db
      .select()
      .from(musclePriority)
      .where(eq(musclePriority.athleteProfileId, profile.id))
      .orderBy(asc(musclePriority.createdAt)),
  ]);

  return { profile, limitations, musclePriorities };
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

    await replaceProfileDetails(createdProfile.id, input);
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

  await replaceProfileDetails(updatedProfile.id, input);
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
    notes: input.notes ?? null,
  } satisfies Omit<typeof athleteProfile.$inferInsert, "id" | "createdAt" | "updatedAt">;
}

async function replaceProfileDetails(profileId: string, input: AthleteProfileInput) {
  await Promise.all([
    db.delete(limitation).where(eq(limitation.athleteProfileId, profileId)),
    db.delete(musclePriority).where(eq(musclePriority.athleteProfileId, profileId)),
  ]);

  const limitationItems = parseProfileListInput(input.painSensitiveAreas);
  const priorityItems = parseProfileListInput(input.musclePriorities);

  await Promise.all([
    limitationItems.length > 0
      ? db.insert(limitation).values(
          limitationItems.map((item) => ({
            id: randomUUID(),
            athleteProfileId: profileId,
            bodyRegion: "unknown",
            conditionName: item,
            notes: item,
          })),
        )
      : Promise.resolve(),
    priorityItems.length > 0
      ? db.insert(musclePriority).values(
          priorityItems.map((item) => ({
            id: randomUUID(),
            athleteProfileId: profileId,
            muscleGroup: item,
            notes: item,
          })),
        )
      : Promise.resolve(),
  ]);
}
