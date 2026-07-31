export type DurationUnit = "seconds" | "minutes";

export function secondsToDurationInput(totalSeconds: number | null): { unit: DurationUnit; value: number } {
  if (totalSeconds !== null && totalSeconds > 0 && totalSeconds % 60 === 0) {
    return { unit: "minutes", value: totalSeconds / 60 };
  }
  return { unit: "seconds", value: totalSeconds ?? 60 };
}

export function convertDurationValue(value: number, fromUnit: DurationUnit, toUnit: DurationUnit): number {
  if (fromUnit === toUnit) {
    return value;
  }
  return toUnit === "minutes" ? Math.round((value / 60) * 10) / 10 : Math.round(value * 60);
}

export function durationInputToSeconds(value: number, unit: DurationUnit): number {
  return unit === "minutes" ? Math.round(value * 60) : Math.round(value);
}
