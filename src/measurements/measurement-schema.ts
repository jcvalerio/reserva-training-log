import { z } from "zod";

export const measurementNumericFields = [
  "bodyWeightKg",
  "waistCm",
  "chestCm",
  "hipsCm",
  "rightThighCm",
  "leftThighCm",
  "rightCalfCm",
  "leftCalfCm",
  "rightArmCm",
  "leftArmCm",
] as const;

const optionalTrimmedString = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  },
  z.string().max(500).optional(),
);

const optionalMeasurement = (fieldName: string, min: number, max: number) =>
  z
    .preprocess(
      (value) => {
        if (value === "" || value === null || value === undefined) {
          return undefined;
        }

        if (typeof value === "string") {
          return Number(value);
        }

        return value;
      },
      z.number({ error: `${fieldName} debe ser numérico.` }).min(min).max(max).optional(),
    )
    .transform((value) => (value === undefined ? undefined : value.toFixed(2)));

const optionalMeasuredAt = z.preprocess(
  (value) => {
    if (value === "" || value === null || value === undefined) {
      return undefined;
    }

    if (typeof value === "string") {
      return new Date(value);
    }

    return value;
  },
  z.date().optional(),
);

export const bodyMeasurementInputSchema = z
  .object({
    measuredAt: optionalMeasuredAt,
    bodyWeightKg: optionalMeasurement("peso corporal", 20, 400),
    waistCm: optionalMeasurement("cintura", 30, 250),
    chestCm: optionalMeasurement("pecho", 30, 250),
    hipsCm: optionalMeasurement("caderas", 30, 250),
    rightThighCm: optionalMeasurement("muslo derecho", 20, 120),
    leftThighCm: optionalMeasurement("muslo izquierdo", 20, 120),
    rightCalfCm: optionalMeasurement("pantorrilla derecha", 15, 80),
    leftCalfCm: optionalMeasurement("pantorrilla izquierda", 15, 80),
    rightArmCm: optionalMeasurement("brazo derecho", 15, 80),
    leftArmCm: optionalMeasurement("brazo izquierdo", 15, 80),
    notes: optionalTrimmedString,
  })
  .refine(
    (input) => measurementNumericFields.some((field) => input[field] !== undefined),
    "Registra al menos una medida numérica antes de guardar.",
  );

export type BodyMeasurementInput = z.infer<typeof bodyMeasurementInputSchema>;

export function parseBodyMeasurementFormData(formData: FormData): BodyMeasurementInput {
  return bodyMeasurementInputSchema.parse({
    measuredAt: formData.get("measuredAt") || undefined,
    bodyWeightKg: formData.get("bodyWeightKg"),
    waistCm: formData.get("waistCm"),
    chestCm: formData.get("chestCm"),
    hipsCm: formData.get("hipsCm"),
    rightThighCm: formData.get("rightThighCm"),
    leftThighCm: formData.get("leftThighCm"),
    rightCalfCm: formData.get("rightCalfCm"),
    leftCalfCm: formData.get("leftCalfCm"),
    rightArmCm: formData.get("rightArmCm"),
    leftArmCm: formData.get("leftArmCm"),
    notes: formData.get("notes") || undefined,
  });
}

type MeasurementGapSource = {
  leftThighCm?: string | number | null;
  rightThighCm?: string | number | null;
  leftCalfCm?: string | number | null;
  rightCalfCm?: string | number | null;
};

export function calculateMeasurementGaps(measurement: MeasurementGapSource) {
  return {
    thighGapCm: calculateGap(measurement.leftThighCm, measurement.rightThighCm),
    calfGapCm: calculateGap(measurement.leftCalfCm, measurement.rightCalfCm),
  };
}

function calculateGap(leftValue: string | number | null | undefined, rightValue: string | number | null | undefined) {
  const left = toFiniteNumber(leftValue);
  const right = toFiniteNumber(rightValue);

  if (left === null || right === null) {
    return null;
  }

  return Number((left - right).toFixed(2));
}

function toFiniteNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}
