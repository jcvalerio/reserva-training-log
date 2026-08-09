export type SubstitutionReason = "machine_busy" | "machine_broken" | "felt_wrong" | "other";

export const substitutionReasonLabelsEs: Record<SubstitutionReason, string> = {
  machine_busy: "Máquina ocupada",
  machine_broken: "Máquina dañada",
  felt_wrong: "No me sentí bien",
  other: "Otra razón",
};

export const substitutionReasons = Object.keys(substitutionReasonLabelsEs) as SubstitutionReason[];

/**
 * "No me sentí bien" is the one reason that isn't logistics. A busy or broken
 * machine is a scheduling problem; not feeling right on a movement is a
 * symptom report, and swapping the exercise is exactly the moment that signal
 * would otherwise vanish — the original ends the session with no logged sets,
 * so nothing records that anything was wrong.
 *
 * The app deliberately doesn't try to interpret it (there is no muscle-group
 * taxonomy here, so it can't judge what the swap costs). It just makes sure
 * the reason is written down and prompts for the pain score that would
 * otherwise go unrecorded.
 */
export function isSymptomReason(reason: SubstitutionReason): boolean {
  return reason === "felt_wrong";
}

type PrescriptionLike = {
  id: string;
  exerciseNameEs: string;
  orderIndex: number;
  substitutedForPrescriptionId: string | null;
};

/**
 * Decides which of a day's prescriptions the session runner actually shows.
 *
 * A substitute is a real, permanent prescription, so without this filter every
 * swap would make the day visibly grow by one exercise for good. Instead the
 * main list stays the plan itself, and a substitute only appears once it has
 * been chosen *in this session*. "Chosen" means an exerciseLog row exists for
 * it in this session — not that sets exist — because the exercise has to be
 * on screen before you can log the first set against it. Alternatives created
 * on earlier days stay tucked under their original (see groupSubstitutes)
 * rather than cluttering the list.
 *
 * Order is preserved: substitutes sort immediately after the exercise they
 * stand in for, not at the end where their orderIndex would otherwise put them.
 */
export function selectVisibleExercises<T extends PrescriptionLike>(
  exercises: T[],
  wasChosenThisSession: (exercise: T) => boolean,
): T[] {
  const planExercises = exercises
    .filter((exercise) => exercise.substitutedForPrescriptionId === null)
    .sort((a, b) => a.orderIndex - b.orderIndex);

  const usedSubstitutesByOriginal = new Map<string, T[]>();
  for (const exercise of exercises) {
    const originalId = exercise.substitutedForPrescriptionId;
    if (originalId === null || !wasChosenThisSession(exercise)) {
      continue;
    }
    const bucket = usedSubstitutesByOriginal.get(originalId);
    if (bucket) {
      bucket.push(exercise);
    } else {
      usedSubstitutesByOriginal.set(originalId, [exercise]);
    }
  }

  const visible: T[] = [];
  for (const exercise of planExercises) {
    visible.push(exercise);
    const substitutes = usedSubstitutesByOriginal.get(exercise.id);
    if (substitutes) {
      visible.push(...substitutes.sort((a, b) => a.orderIndex - b.orderIndex));
    }
  }

  // A substitute chosen this session whose original isn't in this day at all
  // (the original was removed in the builder, say) still belongs on screen
  // rather than silently disappearing along with any sets logged against it.
  for (const [originalId, substitutes] of usedSubstitutesByOriginal) {
    if (!planExercises.some((exercise) => exercise.id === originalId)) {
      visible.push(...substitutes);
    }
  }

  return visible;
}

/**
 * Groups every substitute under the exercise it stands in for — used by the
 * plan previews and by the runner's picker, so a day reads as "5 exercises,
 * two of which have alternatives" rather than as 7 unrelated exercises.
 */
export function groupSubstitutes<T extends PrescriptionLike>(exercises: T[]): Map<string, T[]> {
  const grouped = new Map<string, T[]>();

  for (const exercise of exercises) {
    const originalId = exercise.substitutedForPrescriptionId;
    if (originalId === null) {
      continue;
    }
    const bucket = grouped.get(originalId);
    if (bucket) {
      bucket.push(exercise);
    } else {
      grouped.set(originalId, [exercise]);
    }
  }

  for (const bucket of grouped.values()) {
    bucket.sort((a, b) => a.orderIndex - b.orderIndex);
  }

  return grouped;
}

/**
 * The exercises offered as swap targets: everything already in the athlete's
 * plan, deduplicated by Spanish name and excluding the one being replaced (and
 * its own existing alternatives, which the picker lists separately).
 *
 * Deduplicating by name is deliberate rather than incidental — progression
 * history is matched by exerciseNameEs across the whole profile
 * (getPreviousExercisePerformance), so two prescriptions sharing a name are
 * one exercise as far as the athlete's history is concerned. "Core" genuinely
 * appears on all five days of the real plan.
 */
export function buildSubstituteChoices<T extends { exerciseNameEs: string }>(
  planExercises: T[],
  excludeNames: string[],
): T[] {
  const excluded = new Set(excludeNames.map((name) => name.toLocaleLowerCase("es")));
  const seen = new Set<string>();
  const choices: T[] = [];

  for (const exercise of planExercises) {
    const key = exercise.exerciseNameEs.toLocaleLowerCase("es");
    if (excluded.has(key) || seen.has(key)) {
      continue;
    }
    seen.add(key);
    choices.push(exercise);
  }

  return choices.sort((a, b) => a.exerciseNameEs.localeCompare(b.exerciseNameEs, "es"));
}

/**
 * Normalises a typed-in exercise name. Returns null when there's nothing
 * usable, so callers can reject rather than create a blank exercise.
 */
export function normalizeSubstituteName(raw: string): string | null {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  return trimmed === "" ? null : trimmed.slice(0, 120);
}

/**
 * Finds an already-created alternative with the same name, so repeatedly
 * swapping to the same machine reuses one prescription (and keeps one
 * continuous progression history) instead of minting a near-duplicate each
 * time.
 */
export function findReusableSubstitute<T extends { exerciseNameEs: string }>(
  existingSubstitutes: T[],
  name: string,
): T | null {
  const key = name.toLocaleLowerCase("es");
  return existingSubstitutes.find((exercise) => exercise.exerciseNameEs.toLocaleLowerCase("es") === key) ?? null;
}
