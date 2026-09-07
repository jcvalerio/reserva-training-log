/**
 * Weight units, and the one rule that keeps the history readable: kilograms
 * are canonical for everything stored and everything reported.
 *
 * Pounds exist here because a real gym stocks discs in both families at once
 * — the one this app was built around has 45/35/25/10/5/2.5 lb *and*
 * 25/20/15/10/5 kg — and an athlete thinks in the number printed on the disc.
 * So a denomination carries its own unit and the kilogram value is derived,
 * never stored. Store it pre-converted and "45 lb" can never be rendered back,
 * which is the whole reason anyone wants this feature.
 *
 * This is deliberately NOT a global lb mode. `exerciseNameEn`, `notesEn` and
 * `locale: "en"` are three standing pieces of unused i18n scaffolding in this
 * repo; a second global mode to keep consistent across every report surface
 * would be a fourth. The unit belongs to the disc, not to the app.
 */

/** Exact, by definition of the international pound. Not an approximation. */
export const KG_PER_LB = 0.45359237;

export const weightUnits = ["kg", "lb"] as const;

export type WeightUnit = (typeof weightUnits)[number];

export const weightUnitLabelsEs: Record<WeightUnit, string> = {
  kg: "kg",
  lb: "lb",
};

/**
 * One plate denomination as the athlete reads it off the disc: the printed
 * number plus which family it belongs to.
 */
export type PlateDenomination = {
  value: number;
  unit: WeightUnit;
};

/**
 * Full-precision conversion. Rounding happens once, at the edge, in roundKg —
 * never here. Converting and rounding in the same step is how a chain of
 * additions accumulates error.
 *
 * The drift this removes is real and was measured on live data: a hip thrust
 * carrying 6x45 lb was logged by hand as 122 kg. It is 122.47. Half a kilo per
 * entry, compounding into volume load and every estimated 1RM.
 */
export function toKg(value: number, unit: WeightUnit): number {
  return unit === "lb" ? value * KG_PER_LB : value;
}

export function fromKg(kg: number, unit: WeightUnit): number {
  return unit === "lb" ? kg / KG_PER_LB : kg;
}

/**
 * The storage precision, matching `numeric(6,2)` on setLog.actualWeightKg.
 * 0.01 kg is about 0.02 lb — finer than any disc anyone stocks — so nothing
 * real is lost here.
 */
export function roundKg(kg: number): number {
  return Math.round(kg * 100) / 100;
}

/** Sum of a plate list in kilograms, rounded once at the end. */
export function sumPlatesKg(plates: readonly PlateDenomination[]): number {
  return roundKg(plates.reduce((total, plate) => total + toKg(plate.value, plate.unit), 0));
}

/**
 * Deliberately not an extension of formatKg. A function named formatKg that
 * sometimes emits "45 lb" is the incrementCategory mistake — one name meaning
 * two things — and this repo has already paid for that once.
 *
 * DOT decimal, not the Spanish comma, because formatKg is dot-decimal and the
 * two land in the same sentence: "Añade 1 x 2.5 lb por lado -> 54.5kg". A
 * comma here would put both conventions one word apart. Consistency inside
 * one line beats locale purity; caught by reading the rendered string in a
 * browser, not from the code.
 */
export function formatWeight(value: number, unit: WeightUnit): string {
  const rounded = Math.round(value * 100) / 100;
  return `${rounded} ${unit}`;
}

/**
 * What the number in the weight box actually means, per implement.
 *
 * This is not a guess. It is the convention all three athletes were measured
 * to be using, consistently, before any of this was built:
 *
 * - Plate-loaded: total mass of the discs across BOTH sides, bar excluded.
 *   A hip thrust with 6x45 lb is logged 122, not 142 (bar) and not 61 (side).
 * - Fixed dumbbell: the mass of ONE dumbbell. A hammer curl with a 15 kg
 *   dumbbell in each hand is logged 15, not 30.
 * - Stack: the marked value on the selector.
 *
 * There is deliberately no stored per-exercise override. A nullable column
 * nobody ever sets is the `limitation.requiresPainTracking` failure — captured
 * everywhere, read by nothing — and this repo has that one open as issue #14
 * right now. The convention is stated to the athlete in words instead, which
 * is the cheaper detection mechanism: someone whose habit differs reads the
 * line and says so. Adding the column later is one additive migration.
 */
export type LoadConvention = "plates_both_sides" | "per_dumbbell" | "marked_value";

export const loadConventionLabelsEs: Record<LoadConvention, string> = {
  plates_both_sides: "discos en total, sin contar la barra",
  per_dumbbell: "por mancuerna",
  marked_value: "el valor marcado en la placa",
};
