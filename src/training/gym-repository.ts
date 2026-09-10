import { randomUUID } from "node:crypto";

import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { athleteGym, exerciseSetup, type AthleteGym, type ExerciseSetup } from "@/db/schema";
import { athleteProfile } from "@/db/schema";
import { normalizeExerciseName } from "@/training/muscle-taxonomy";
import { plateBuildFromCounts } from "@/training/plate-build";
import type { LoadingModel, PlateCount } from "@/training/plate-math";
import type { PlateDenomination } from "@/training/units";

/**
 * The athlete's default gym, or null.
 *
 * Read-only, and separate from `getOrCreateDefaultGym` for that reason alone:
 * a page render must not write. `getSessionRunDetails` and the gym settings
 * page both used the creating variant, so opening a session INSERTed a row —
 * a GET with a side effect, on the hottest render in the app, for every
 * athlete who had never touched the feature. Next also renders routes during
 * a build and on prefetch, which is the same write from somewhere less
 * expected.
 *
 * Nothing is lost by waiting: with no gym row there are no setups and no
 * inventory either, so every reader's answer is the same as it would be for
 * an empty one. The row gets created when the athlete first SAVES something.
 */
export async function getDefaultGym(athleteProfileId: string): Promise<AthleteGym | null> {
  const [existing] = await db
    .select()
    .from(athleteGym)
    .where(and(eq(athleteGym.athleteProfileId, athleteProfileId), eq(athleteGym.isDefault, true)))
    .limit(1);

  return existing ?? null;
}

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
  const existing = await getDefaultGym(athleteProfileId);

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

  // Filtered in SQL, not in JS. Selecting every setup this athlete has at this
  // gym and discarding most of them costs more the longer they use the app,
  // and the keys are already exactly what the column stores.
  const wanted = [...new Set(exerciseNamesEs.map(normalizeExerciseName))];
  const rows = await db
    .select()
    .from(exerciseSetup)
    .where(
      and(
        eq(exerciseSetup.athleteProfileId, athleteProfileId),
        eq(exerciseSetup.gymId, gymId),
        inArray(exerciseSetup.exerciseKey, wanted),
      ),
    );

  const byKey = new Map<string, ExerciseSetup>();
  for (const row of rows) {
    byKey.set(row.exerciseKey, row);
  }
  return byKey;
}

export type ExerciseSetupInput = {
  setupNotesEs?: string | null;
  loadingModel?: LoadingModel | null;
  /** The per-side discs the athlete says are on the bar. `[]` clears it. */
  plateBuild?: PlateCount[] | null;
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
  if ("plateBuild" in input) {
    // The three columns are written as one unit, always. A build without its
    // total is a row every reader has to re-derive from, and a total without
    // a build is a number with no provenance — which is the exact failure
    // this feature exists to correct.
    const build = input.plateBuild && input.plateBuild.length > 0 ? plateBuildFromCounts(input.plateBuild) : null;
    patch.plateBuild = build ? build.perSide : null;
    patch.plateBuildTotalKg = build ? build.totalKg.toFixed(2) : null;
    patch.plateBuildRecordedAt = build ? new Date() : null;
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

/** The rack this exercise draws on: its own override, else the room's — and
 *  nothing at all for an athlete with no gym recorded yet, which reads the
 *  same as a gym with an empty rack. */
export function resolvePlateInventory(
  gym: Pick<AthleteGym, "plateInventory"> | null,
  setup: Pick<ExerciseSetup, "plateInventory"> | undefined,
): PlateDenomination[] {
  const override = setup?.plateInventory;
  if (override && override.length > 0) {
    return override;
  }
  return gym?.plateInventory ?? [];
}
