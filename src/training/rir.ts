export const rirValues = [0, 1, 2, 3, 4] as const;

export type Rir = (typeof rirValues)[number];

export const rirLabelsEs: Record<Rir, string> = {
  0: "0 Fallo",
  1: "1 rep en reserva",
  2: "2 reps en reserva",
  3: "3 reps en reserva",
  4: "4+ Fácil",
};

export function toDisplayRir(rir: Rir) {
  return rir === 4 ? "4+" : String(rir);
}
