import type { Rir } from "./rir";

export type ProgressionAction = "increase" | "hold" | "reduce_or_modify";
export type ProgressionRiskFlag = "none" | "pain" | "fatigue" | "technique";

export type LoggedSetForProgression = {
  actualReps: number;
  plannedRepMax: number;
  rir: Rir;
  painScore: number;
  notes?: string | null;
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

  const maxPain = Math.max(...input.sets.map((set) => set.painScore));
  const averageRir = average(input.sets.map((set) => set.rir));
  const reachedTopOfRange = input.sets.every((set) => set.actualReps >= set.plannedRepMax);

  if (maxPain > 3) {
    return {
      action: "reduce_or_modify",
      riskFlag: "pain",
      reasonEs: "Dolor mayor a 3: reduce carga, ajusta rango o cambia a una variante más segura.",
    };
  }

  if (maxPain > 2) {
    return {
      action: "hold",
      riskFlag: "pain",
      reasonEs: "Dolor sobre 2: no hagas progresión agresiva; repite o baja según sensaciones.",
    };
  }

  if (hasSharpRepDrop(input.sets)) {
    return {
      action: "hold",
      riskFlag: "fatigue",
      reasonEs: "Las repeticiones cayeron fuerte entre series; conserva la carga y mejora consistencia.",
    };
  }

  if (hasNegativeNote(input.sets)) {
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
      reasonEs: "Completaste el rango objetivo con RIR promedio >= 2 y dolor <= 2; puedes subir carga.",
    };
  }

  return {
    action: "hold",
    riskFlag: "none",
    reasonEs: "Mantén la carga y busca más repeticiones, mejor control o menor RIR sin aumentar dolor.",
  };
}
