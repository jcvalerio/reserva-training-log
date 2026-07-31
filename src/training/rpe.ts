// Whole-session Borg CR10-style effort rating ("how did the whole session
// feel?"), distinct from per-set RIR (src/training/rir.ts): RIR is effort
// relative to failure on one specific lift; this is systemic fatigue across
// the entire session, independent of how any individual set went.
export const rpeValues = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export type Rpe = (typeof rpeValues)[number];

export const rpeLabelsEs: Record<Rpe, string> = {
  1: "Extremadamente ligero",
  2: "Muy ligero",
  3: "Ligero",
  4: "Moderado",
  5: "Cansado",
  6: "Desafiante",
  7: "Duro",
  8: "Muy duro",
  9: "Extremadamente duro",
  10: "Esfuerzo máximo",
};

export function isRpe(value: number): value is Rpe {
  return Number.isInteger(value) && value >= 1 && value <= 10;
}
