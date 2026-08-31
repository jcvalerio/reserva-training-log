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
  /** Needed in full, not as a count: a swap must be legal in both directions. */
  loggedSets: SetLog[];
};

export type ReassignSource = {
  id: string;
  prescriptionType: "strength" | "duration";
  isUnilateral: boolean;
  loggedSets: SetLog[];
};

/**
 * `move` — the target has nothing logged, so its `exerciseLog` does not exist
 * yet and the source log simply changes which prescription it points at.
 *
 * `swap` — the target already has sets, and they are very likely the ones that
 * belong *here*. Refusing that case made the feature useless for the situation
 * it was built for: the plan-reorder bug shifted a whole day's values one
 * position, so every exercise held its neighbour's work and no target was ever
 * empty. A swap fixes a pair at a time, and since any permutation decomposes
 * into transpositions, repeated swaps can reach any correct arrangement —
 * A↔B, then B↔C, until everything is home.
 */
export type ReassignMode = "move" | "swap";

export type ReassignCheck = { ok: true; mode: ReassignMode } | { ok: false; reasonEs: string };

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

/**
 * Whether `sets` can live under a prescription of this shape. Both the strength
 * and unilateral rules are one-directional checks, so a swap runs this twice —
 * once each way — and is only allowed if both hold.
 */
function setsFitPrescription(
  sets: SetLog[],
  prescription: { prescriptionType: "strength" | "duration"; isUnilateral: boolean },
  subjectEs: "Tus series" | "Sus series",
): ReassignCheck | null {
  // The rule this exists to enforce. Strength-shaped sets under a duration
  // prescription — or the reverse — is exactly the state that threw inside a
  // client component and blanked a whole workout (see the 2026-08-30 entries).
  // Refuse the move rather than allow it and rely on the downstream guards.
  if (prescription.prescriptionType === "duration" && hasStrengthShapedSets(sets)) {
    return { ok: false, reasonEs: `${subjectEs} tienen peso y reps; ese ejercicio se mide por tiempo.` };
  }
  if (prescription.prescriptionType === "strength" && hasDurationShapedSets(sets)) {
    return { ok: false, reasonEs: `${subjectEs} están medidas por tiempo; ese ejercicio se mide con peso y reps.` };
  }

  // targetSets means sets *per side* for a unilateral exercise, so per-side
  // sets on a bilateral exercise would read as one shared total — and
  // bilateral sets on a unilateral one leave a side permanently empty.
  if (!prescription.isUnilateral && hasPerSideSets(sets)) {
    return { ok: false, reasonEs: `${subjectEs} están registradas por lado; ese ejercicio no es unilateral.` };
  }
  if (prescription.isUnilateral && !hasPerSideSets(sets)) {
    return { ok: false, reasonEs: `Ese ejercicio es unilateral y ${subjectEs.toLowerCase()} no tienen lado.` };
  }

  return null;
}

export function canReassignTo(source: ReassignSource, target: ReassignCandidate): ReassignCheck {
  if (target.id === source.id) {
    return { ok: false, reasonEs: "Es el mismo ejercicio." };
  }

  if (source.loggedSets.length === 0) {
    return { ok: false, reasonEs: "Este ejercicio no tiene series registradas." };
  }

  const sourceFitsTarget = setsFitPrescription(source.loggedSets, target, "Tus series");
  if (sourceFitsTarget) {
    return sourceFitsTarget;
  }

  // Nothing on the other side: the source log just changes which prescription
  // it points at.
  if (target.loggedSets.length === 0) {
    return { ok: true, mode: "move" };
  }

  // The target has work of its own, which in the case this was built for is
  // very likely the work that belongs here. A swap keeps exactly one log per
  // exercise, so nothing is ever double-counted — but it has to be legal in
  // BOTH directions, so the target's sets are checked against this exercise
  // too.
  const targetFitsSource = setsFitPrescription(target.loggedSets, source, "Sus series");
  if (targetFitsSource) {
    return targetFitsSource;
  }

  return { ok: true, mode: "swap" };
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
