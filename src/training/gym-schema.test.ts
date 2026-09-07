import { describe, expect, it } from "vitest";

import { formatDenominationList, gymInventorySchema } from "./gym-schema";

function parse(platesLb: string, platesKg: string) {
  return gymInventorySchema.parse({ nameEs: "", displayUnit: "kg", platesLb, platesKg });
}

describe("gymInventorySchema", () => {
  it("parses the real gym's two families from plain text", () => {
    const { plateInventory } = parse("45, 35, 25, 10, 5, 2.5", "25, 20, 15, 10, 5");

    expect(plateInventory).toHaveLength(11);
    expect(plateInventory.filter((p) => p.unit === "lb").map((p) => p.value)).toEqual([45, 35, 25, 10, 5, 2.5]);
    expect(plateInventory.filter((p) => p.unit === "kg").map((p) => p.value)).toEqual([25, 20, 15, 10, 5]);
  });

  it("takes a dot as the decimal mark", () => {
    expect(parse("2.5", "").plateInventory).toEqual([{ value: 2.5, unit: "lb" }]);
  });

  /**
   * Documented, not a bug. Comma is the separator, so "2,5" is a 2 and a 5.
   * The two readings genuinely conflict — no heuristic resolves "45,35,25"
   * without guessing, and guessing wrong invents discs the gym does not own.
   * The field hint says so; this pins the choice so it is not "fixed" blind.
   */
  it("reads a comma as a separator even between digits", () => {
    expect(parse("2,5", "").plateInventory.map((p) => p.value)).toEqual([5, 2]);
  });

  it("tolerates spaces, semicolons and stray separators", () => {
    expect(parse("45  35;25", "").plateInventory.map((p) => p.value)).toEqual([45, 35, 25]);
  });

  it("drops junk rather than rejecting the whole form", () => {
    // A half-typed inventory is the normal state of this form.
    expect(parse("45, abc, -10, 0, 25", "").plateInventory.map((p) => p.value)).toEqual([45, 25]);
  });

  it("deduplicates within a family but keeps the same number in both", () => {
    const { plateInventory } = parse("25, 25", "25");
    expect(plateInventory).toEqual([
      { value: 25, unit: "kg" },
      { value: 25, unit: "lb" },
    ]);
  });

  it("caps the list so the enumeration stays bounded, keeping the heaviest", () => {
    const { plateInventory } = parse("1 2 3 4 5 6 7 8 9 10 11 12 13 14", "");
    expect(plateInventory).toHaveLength(12);
    expect(plateInventory[0]!.value).toBe(14);
    expect(plateInventory.map((p) => p.value)).not.toContain(1);
  });

  it("falls back to a usable name rather than an empty heading", () => {
    expect(gymInventorySchema.parse({ nameEs: "   ", displayUnit: "kg", platesLb: "", platesKg: "" }).nameEs).toBe(
      "Mi gimnasio",
    );
  });

  it("round-trips back into the form", () => {
    const { plateInventory } = parse("45, 2.5", "20");
    expect(formatDenominationList(plateInventory, "lb")).toBe("45, 2.5");
    expect(formatDenominationList(plateInventory, "kg")).toBe("20");
  });
});
