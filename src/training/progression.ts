import type { PainLocation } from "./muscle-taxonomy";
import type { Rir } from "./rir";

export type ProgressionAction = "increase" | "hold" | "reduce_or_modify";
export type ProgressionRiskFlag = "none" | "pain" | "fatigue" | "technique";

export type LoggedSetForProgression = {
  actualReps: number;
  plannedRepMax: number;
  rir: Rir;
  // null means the athlete was never asked about this set, which is now the
  // normal case: pain is asked once per exercise, not once per set. It is NOT
  // a zero — see the setLog.painScore schema comment. Every read here skips
  // nulls explicitly rather than letting Math.max coerce them to 0.
  painScore: number | null;
  // Only present on a set carrying an escalated answer. A null location on a
  // set that DOES report pain means the athlete skipped the question, and is
  // treated as joint pain rather than as soreness — the conservative side.
  painLocation?: PainLocation | null;
  notes?: string | null;
  // A set logged beyond the plan's targetSets. Pain still scans every set
  // regardless (a safety brake shouldn't have blind spots), but the
  // performance signals below (RIR average, top-of-range completion, rep
  // drop, notes) are computed from planned sets only — a bonus set's
  // different character (a lighter backoff, an all-out AMRAP) shouldn't be
  // able to veto or dilute what the prescribed sets actually earned.
  isBonus?: boolean;
};

export type ProgressionInput = {
  sets: LoggedSetForProgression[];
  allPlannedSetsCompleted: boolean;
};

export type ProgressionSuggestion = {
  action: ProgressionAction;
  riskFlag: ProgressionRiskFlag;
  reasonEs: string;
};

const NEGATIVE_NOTE_PATTERN = /dolor|molest|t[eé]cnica|control|inestable|pinchazo|pain|discomfort|unstable/i;

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function hasSharpRepDrop(sets: LoggedSetForProgression[]) {
  if (sets.length < 2) {
    return false;
  }

  const firstSetReps = sets[0]?.actualReps ?? 0;
  const lastSetReps = sets.at(-1)?.actualReps ?? 0;

  return firstSetReps > 0 && lastSetReps <= firstSetReps * 0.8;
}

/**
 * Highest reported pain across these sets, ignoring sets nobody was asked
 * about. Returns null when there is no reported pain at all, so callers have
 * to decide what "no signal" means instead of receiving a 0 that looks like a
 * measurement.
 */
function maxPainScore(sets: LoggedSetForProgression[]): number | null {
  const reported = sets
    .map((set) => set.painScore)
    .filter((score): score is number => score !== null && score !== undefined);

  return reported.length > 0 ? Math.max(...reported) : null;
}

function hasNegativeNote(sets: LoggedSetForProgression[]) {
  return sets.some((set) => set.notes && NEGATIVE_NOTE_PATTERN.test(set.notes));
}

export function suggestProgression(input: ProgressionInput): ProgressionSuggestion {
  if (input.sets.length === 0) {
    return {
      action: "hold",
      riskFlag: "fatigue",
      reasonEs: "No hay suficientes series registradas para progresar con seguridad.",
    };
  }

  // Skipping nulls explicitly. `Math.max(...[null])` is 0 and would look
  // correct here by accident; this is a safety brake, so it does not get to
  // rely on a coercion. An exercise nobody was asked about reports no pain
  // signal at all, which is different from reporting zero.
  const maxPain = maxPainScore(input.sets);

  // Ordinary soreness is not an injury signal. DOMS is the expected response
  // to effective hypertrophy work, and forcing a load reduction on it teaches
  // an athlete to stop reporting it — the exact failure this whole change is
  // undoing. Joint pain keeps every guard it had.
  //
  // A set that reports pain with NO location falls in here, not in the
  // muscular bucket: an unanswered "where" is treated as the worse case.
  const maxNonMuscularPain = maxPainScore(
    input.sets.filter((set) => set.painLocation !== "muscular"),
  );

  // Fall back to the full set list if every logged set happens to be a
  // bonus set (shouldn't normally happen — allPlannedSetsCompleted requires
  // at least targetSets planned sets — but avoids an empty-array average).
  const plannedSets = input.sets.filter((set) => !set.isBonus);
  const signalSets = plannedSets.length > 0 ? plannedSets : input.sets;

  const averageRir = average(signalSets.map((set) => set.rir));
  const reachedTopOfRange = signalSets.every((set) => set.actualReps >= set.plannedRepMax);

  // Severe pain stops everything, wherever it is. Someone calling a 9
  // "muscular" does not make it one, so this branch deliberately runs before
  // the location split. New as an explicit rule: the >= 7 threshold was
  // documented in progression-rules.md and surfaced as a banner in the
  // runner, but suggestProgression itself only ever saw it as "> 3".
  if (maxPain !== null && maxPain >= 7) {
    return {
      action: "reduce_or_modify",
      riskFlag: "pain",
      reasonEs:
        "Dolor 7 o más: detén el patrón, reduce carga y consulta a un profesional si persiste.",
    };
  }

  if (maxNonMuscularPain !== null && maxNonMuscularPain > 3) {
    return {
      action: "reduce_or_modify",
      riskFlag: "pain",
      reasonEs: "Dolor mayor a 3: reduce carga, ajusta rango o cambia a una variante más segura.",
    };
  }

  if (maxNonMuscularPain !== null && maxNonMuscularPain > 2) {
    return {
      action: "hold",
      riskFlag: "pain",
      reasonEs: "Dolor sobre 2: no hagas progresión agresiva; repite o baja según sensaciones.",
    };
  }

  if (hasSharpRepDrop(signalSets)) {
    return {
      action: "hold",
      riskFlag: "fatigue",
      reasonEs: "Las repeticiones cayeron fuerte entre series; conserva la carga y mejora consistencia.",
    };
  }

  if (hasNegativeNote(signalSets)) {
    return {
      action: "hold",
      riskFlag: "technique",
      reasonEs: "Las notas indican molestia, técnica o control a revisar antes de subir carga.",
    };
  }

  if (input.allPlannedSetsCompleted && reachedTopOfRange && averageRir >= 2) {
    return {
      action: "increase",
      riskFlag: "none",
      // Deliberately no longer claims "dolor <= 2": agujetas can now reach
      // this branch with a higher score, and a reason that states a false
      // fact about the athlete's own data is worse than a vaguer one.
      reasonEs: "Completaste el rango objetivo con RIR promedio >= 2 y sin dolor articular; puedes subir carga.",
    };
  }

  return {
    action: "hold",
    riskFlag: "none",
    reasonEs: "Mantén la carga y busca más repeticiones, mejor control o menor RIR sin aumentar dolor.",
  };
}
