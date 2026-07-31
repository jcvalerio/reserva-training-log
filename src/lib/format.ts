// Rounds to maxDecimals and trims trailing zeros, so a whole-number value
// reads as "40kg" instead of "40.00kg" while a genuinely fractional value
// (e.g. a 42.5kg plate load) still shows its meaningful decimals. maxDecimals
// varies by context (0 for volume, 1 for averages/1RM/measurements, 2 for a
// single logged set) — those precision choices are intentional, this only
// fixes the trailing-zero display bug.
export function formatKg(value: number | string, maxDecimals: number): string {
  const numeric = typeof value === "string" ? Number(value) : value;
  return `${Number(numeric.toFixed(maxDecimals))}kg`;
}
