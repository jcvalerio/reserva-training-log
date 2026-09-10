import { z } from "zod";

import { MAX_DENOMINATIONS } from "@/training/plate-math";
import { byHeaviestFirst, weightUnits, type PlateDenomination } from "@/training/units";

/**
 * The gym inventory form.
 *
 * Denominations arrive as one free-text line per unit family — "45, 35, 25,
 * 10, 5, 2.5" — rather than as a repeating field group. On a 390px screen at
 * this app's raised type scale, eleven add/remove rows is a worse form than
 * two text inputs, and everyone already knows their rack as a list.
 *
 * The comma is a SEPARATOR here, never a decimal mark, and the decimal is a
 * dot. That is a real cost in a Spanish-first app where the comma is the
 * decimal everywhere else — including formatWeight, two files away — but the
 * two readings genuinely conflict: "2,5" is either two and a half pounds or a
 * 2 and a 5, and no heuristic resolves "45,35,25" without guessing. Guessing
 * wrong invents discs the gym does not own and silently poisons every recipe
 * built from them.
 *
 * So the rule is stated in the field hint and the placeholder instead, and
 * 2.5 lb is the only fractional plate anyone stocks. Chosen deliberately;
 * revisit if someone actually trips on it.
 */
const denominationList = (unit: (typeof weightUnits)[number]) =>
  z.preprocess(
    (value) => (typeof value === "string" ? value : ""),
    z
      .string()
      .max(200)
      .transform((raw): PlateDenomination[] =>
        raw
          .split(/[,;\s]+/)
          .map((token) => token.replace(",", ".").trim())
          .filter((token) => token !== "")
          .map((token) => Number(token))
          .filter((value) => Number.isFinite(value) && value > 0)
          .map((value) => ({ value, unit })),
      ),
  );

export const gymInventorySchema = z
  .object({
    nameEs: z.preprocess(
      (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : "Mi gimnasio"),
      z.string().min(1).max(200),
    ),
    displayUnit: z.enum(weightUnits).catch("kg"),
    platesLb: denominationList("lb"),
    platesKg: denominationList("kg"),
  })
  .transform((input) => {
    // Deduplicated, heaviest-first by real mass, and capped. The cap is what
    // keeps the from-scratch enumeration bounded without tracking how many of
    // each disc the gym owns — see plate-math.
    const seen = new Set<string>();
    const plateInventory: PlateDenomination[] = [];
    // Sorted BEFORE the cap, so an over-long list keeps the heaviest discs
    // rather than whichever were typed first — and sorted by real MASS, across
    // both families. Sorting each family separately and concatenating them
    // meant values were never compared across units, so the cap fell on the
    // list's tail rather than on its lightest discs: with twelve kg
    // denominations typed, every lb plate was dropped, 45 lb (20.41 kg)
    // included, in favour of 2.5 kg. `byHeaviestFirst` is the comparator that
    // already exists for exactly this trap.
    const ordered = [...input.platesKg, ...input.platesLb].sort(byHeaviestFirst);
    for (const plate of ordered) {
      const key = `${plate.value}${plate.unit}`;
      if (!seen.has(key) && plateInventory.length < MAX_DENOMINATIONS) {
        seen.add(key);
        plateInventory.push(plate);
      }
    }
    return { nameEs: input.nameEs, displayUnit: input.displayUnit, plateInventory };
  });

export type GymInventoryFormInput = z.infer<typeof gymInventorySchema>;

export function parseGymInventoryFormData(formData: FormData): GymInventoryFormInput {
  return gymInventorySchema.parse({
    nameEs: formData.get("nameEs"),
    displayUnit: formData.get("displayUnit"),
    platesLb: formData.get("platesLb"),
    platesKg: formData.get("platesKg"),
  });
}

/** "45, 35, 25, 10, 5, 2.5" for one family — how the form renders it back. */
export function formatDenominationList(
  plates: readonly PlateDenomination[],
  unit: (typeof weightUnits)[number],
): string {
  return plates
    .filter((plate) => plate.unit === unit)
    .map((plate) => String(plate.value))
    .join(", ");
}
