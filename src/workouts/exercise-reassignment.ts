import type { SetLog } from "./workout-repository";

/**
 * Moving a logged exercise onto a different exercise in the same session.
 *
 * Logging against the wrong exercise is an ordinary mistake — you tap the card
 * above the one you meant, or the machine you actually used sits two rows down.
 * Until now the only remedies were deleting every set and re-entering them, or
 * living with it; the second silently corrupts progression, since
 * `getPreviousPerformance` reads whatever is filed under that exercise.
 *
 * The move is one row: `exerciseLog.exercisePrescriptionId`. A `setLog` hangs
 * off its `exerciseLog`, so the sets travel with it and are never touched.
 *
 * This module decides only whether a move is *allowed*. Every refusal is a
 * refusal on purpose — permitting any of them recreates a bug this project has
 * already paid for once.
 */

export type ReassignCandidate = {
  id: string;
  exerciseNameEs: string;
  prescriptionType: "strength" | "duration";
  isUnilateral: boolean;
  loggedSetCount: number;
};

export type ReassignSource = {
  id: string;
  prescriptionType: "strength" | "duration";
  isUnilateral: boolean;
  loggedSets: SetLog[];
};

export type ReassignCheck = { ok: true } | { ok: false; reasonEs: string };

/** A set that records a duration and no load is duration-shaped, and vice versa. */
function hasDurationShapedSets(sets: SetLog[]): boolean {
  return sets.some((set) => set.actualDurationSeconds !== null);
}

function hasStrengthShapedSets(sets: SetLog[]): boolean {
  return sets.some((set) => set.actualWeightKg !== null || set.actualReps !== null);
}

function hasPerSideSets(sets: SetLog[]): boolean {
  return sets.some((set) => set.side === "left" || set.side === "right");
}

export function canReassignTo(source: ReassignSource, target: ReassignCandidate): ReassignCheck {
  if (target.id === source.id) {
    return { ok: false, reasonEs: "Es el mismo ejercicio." };
  }

  if (source.loggedSets.length === 0) {
    return { ok: false, reasonEs: "Este ejercicio no tiene series registradas." };
  }

  // Two exerciseLog rows for one exercise in one session would double-count it
  // in every /progreso read. Merging is a different feature with its own
  // questions (which set numbers win, what order), so this refuses rather than
  // guessing.
  if (target.loggedSetCount > 0) {
    return { ok: false, reasonEs: "Ese ejercicio ya tiene series en esta sesión." };
  }

  // The rule this exists to enforce. Strength-shaped sets under a duration
  // prescription — or the reverse — is exactly the state that threw inside a
  // client component and blanked a whole workout (see the 2026-08-30 entries).
  // Refuse the move rather than allow it and rely on the downstream guards.
  if (target.prescriptionType === "duration" && hasStrengthShapedSets(source.loggedSets)) {
    return { ok: false, reasonEs: "Tus series tienen peso y reps; ese ejercicio se mide por tiempo." };
  }
  if (target.prescriptionType === "strength" && hasDurationShapedSets(source.loggedSets)) {
    return { ok: false, reasonEs: "Tus series están medidas por tiempo; ese ejercicio se mide con peso y reps." };
  }

  // targetSets means sets *per side* for a unilateral exercise, so moving
  // per-side sets onto a bilateral exercise would make its completion maths
  // read a single total — and moving bilateral sets onto a unilateral one
  // leaves a side with nothing logged, showing as permanently half-done.
  if (!target.isUnilateral && hasPerSideSets(source.loggedSets)) {
    return { ok: false, reasonEs: "Registraste series por lado; ese ejercicio no es unilateral." };
  }
  if (target.isUnilateral && !hasPerSideSets(source.loggedSets)) {
    return { ok: false, reasonEs: "Ese ejercicio es unilateral y tus series no tienen lado." };
  }

  return { ok: true };
}

export type ReassignOption = ReassignCandidate & ReassignCheck;

/**
 * Every other exercise in the session, each carrying whether it can be moved
 * to and why not. Unavailable options are returned rather than filtered out:
 * an athlete looking for the exercise they meant needs to see it and read why
 * it is refused, not wonder why it is missing.
 *
 * Plan order is preserved, so the list reads like the session does.
 */
export function reassignOptionsFor(source: ReassignSource, candidates: ReassignCandidate[]): ReassignOption[] {
  return candidates
    .filter((candidate) => candidate.id !== source.id)
    .map((candidate) => ({ ...candidate, ...canReassignTo(source, candidate) }));
}
