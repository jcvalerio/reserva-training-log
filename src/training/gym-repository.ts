import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { athleteGym, exerciseSetup, type AthleteGym, type ExerciseSetup } from "@/db/schema";
import { athleteProfile } from "@/db/schema";
import { normalizeExerciseName } from "@/training/muscle-taxonomy";
import type { LoadingModel } from "@/training/plate-math";
import type { PlateDenomination } from "@/training/units";

/**
 * The athlete's default gym, created on first read.
 *
 * Lazy rather than seeded by SQL, deliberately. A migration that INSERTs one
 * row per athlete_profile can fail mid-`vercel build` and take the whole
 * deploy down — the hazard project-status.md calls out and the reason
 * exercise.primaryMuscleGroup is nullable. Created here instead, with the
 * partial unique index making a concurrent double-create harmless.
 *
 * The name comes from athleteProfile.gymContext, which has been written and
 * re-displayed since M0 and read by nothing. This is its first reader.
 */
export async function getOrCreateDefaultGym(athleteProfileId: string): Promise<AthleteGym> {
  const [existing] = await db
    .select()
    .from(athleteGym)
    .where(and(eq(athleteGym.athleteProfileId, athleteProfileId), eq(athleteGym.isDefault, true)))
    .limit(1);

  if (existing) {
    return existing;
  }

  const [profile] = await db
    .select({ gymContext: athleteProfile.gymContext })
    .from(athleteProfile)
    .where(eq(athleteProfile.id, athleteProfileId))
    .limit(1);

  const [created] = await db
    .insert(athleteGym)
    .values({
      id: randomUUID(),
      athleteProfileId,
      // gymContext is unvalidated free text up to 200 chars. Trim it and fall
      // back rather than trusting it into a heading.
      nameEs: profile?.gymContext?.trim() || "Mi gimnasio",
      isDefault: true,
    })
    .onConflictDoNothing()
    .returning();

  if (created) {
    return created;
  }

  // Lost the race against a concurrent create. The row now exists.
  const [raced] = await db
    .select()
    .from(athleteGym)
    .where(and(eq(athleteGym.athleteProfileId, athleteProfileId), eq(athleteGym.isDefault, true)))
    .limit(1);

  if (!raced) {
    throw new Error("No se pudo crear el gimnasio por defecto.");
  }
  return raced;
}

export type GymInventoryInput = {
  nameEs: string;
  displayUnit: "kg" | "lb";
  plateInventory: PlateDenomination[];
};

export async function saveGymInventory(athleteProfileId: string, input: GymInventoryInput): Promise<void> {
  const gym = await getOrCreateDefaultGym(athleteProfileId);

  await db
    .update(athleteGym)
    .set({
      nameEs: input.nameEs,
      displayUnit: input.displayUnit,
      plateInventory: input.plateInventory,
      updatedAt: new Date(),
    })
    .where(and(eq(athleteGym.id, gym.id), eq(athleteGym.athleteProfileId, athleteProfileId)));
}

/**
 * Setup rows for a whole session's exercises in one query.
 *
 * Batched on purpose. getSessionRunDetails already runs an N+1 over
 * getPreviousExercisePerformance on the hottest server render in the app;
 * adding N more round trips to it would be the wrong direction.
 *
 * Keyed by NORMALIZED name, reusing normalizeExerciseName rather than
 * reimplementing it — two normalizers drifting apart is exactly how the
 * classification order got its three-step comment.
 */
export async function getExerciseSetupsForNames(
  athleteProfileId: string,
  gymId: string,
  exerciseNamesEs: readonly string[],
): Promise<Map<string, ExerciseSetup>> {
  if (exerciseNamesEs.length === 0) {
    return new Map();
  }

  const rows = await db
    .select()
    .from(exerciseSetup)
    .where(and(eq(exerciseSetup.athleteProfileId, athleteProfileId), eq(exerciseSetup.gymId, gymId)));

  const wanted = new Set(exerciseNamesEs.map(normalizeExerciseName));
  const byKey = new Map<string, ExerciseSetup>();
  for (const row of rows) {
    if (wanted.has(row.exerciseKey)) {
      byKey.set(row.exerciseKey, row);
    }
  }
  return byKey;
}

export type ExerciseSetupInput = {
  setupNotesEs?: string | null;
  loadingModel?: LoadingModel | null;
};

/**
 * Upsert one exercise's setup. Only the fields present in `input` are written,
 * so answering "¿lleva discos?" mid-session cannot blank a setup note the
 * athlete typed last week.
 */
export async function saveExerciseSetup(
  athleteProfileId: string,
  gymId: string,
  exerciseNameEs: string,
  exerciseId: string | null,
  input: ExerciseSetupInput,
): Promise<void> {
  const exerciseKey = normalizeExerciseName(exerciseNameEs);
  const patch: Partial<typeof exerciseSetup.$inferInsert> = { updatedAt: new Date() };

  if ("setupNotesEs" in input) {
    patch.setupNotesEs = input.setupNotesEs?.trim() || null;
  }
  if ("loadingModel" in input) {
    patch.loadingModel = input.loadingModel ?? null;
  }

  await db
    .insert(exerciseSetup)
    .values({
      id: randomUUID(),
      athleteProfileId,
      gymId,
      exerciseKey,
      exerciseId,
      ...patch,
    })
    .onConflictDoUpdate({
      target: [exerciseSetup.athleteProfileId, exerciseSetup.gymId, exerciseSetup.exerciseKey],
      set: patch,
    });
}

/** The rack this exercise draws on: its own override, else the room's. */
export function resolvePlateInventory(
  gym: Pick<AthleteGym, "plateInventory">,
  setup: Pick<ExerciseSetup, "plateInventory"> | undefined,
): PlateDenomination[] {
  const override = setup?.plateInventory;
  return override && override.length > 0 ? override : gym.plateInventory;
}
