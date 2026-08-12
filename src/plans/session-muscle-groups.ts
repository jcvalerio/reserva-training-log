import { findCatalogEntryByName, muscleGroups, type MuscleGroup } from "@/training/muscle-taxonomy";

export type ClassifiableExercise = {
  exerciseId: string | null;
  exerciseNameEs: string;
};

/**
 * Distinct primary muscle groups a session's exercises train, for the
 * plan-builder body-map thumbnail. Same classification order as everywhere
 * else in the app — the catalog link first, the free-text name as fallback
 * (see muscle-taxonomy.ts's resolution-order comment) — but unlike
 * /progreso's volume report this only asks "does this day touch this muscle
 * at all", not how much: a draft day has no logged sets to weigh by. Cardio
 * (a known exercise with no primary group) and anything unclassified both
 * silently contribute nothing, same as elsewhere.
 *
 * Returned in muscleGroups' own anatomical order, matching every other
 * muscle-group list in the app, not insertion or alphabetical order.
 */
export function classifySessionMuscleGroups(
  exercises: ClassifiableExercise[],
  linkedMuscleGroupByExerciseId: ReadonlyMap<string, MuscleGroup | null>,
): MuscleGroup[] {
  const found = new Set<MuscleGroup>();
  for (const exercise of exercises) {
    const linked = exercise.exerciseId ? linkedMuscleGroupByExerciseId.get(exercise.exerciseId) : undefined;
    const group = linked ?? findCatalogEntryByName(exercise.exerciseNameEs)?.primaryMuscleGroup ?? null;
    if (group) {
      found.add(group);
    }
  }
  return muscleGroups.filter((group) => found.has(group));
}
