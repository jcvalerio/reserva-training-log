import { describe, expect, it } from "vitest";

import { renumberSets } from "./set-editing";

describe("renumberSets", () => {
  it("closes the gap left by deleting a middle set", () => {
    // Sets 1,2,3 with #2 deleted leaves 1 and 3.
    expect(renumberSets([{ id: "a", setNumber: 1 }, { id: "c", setNumber: 3 }])).toEqual([
      { id: "c", setNumber: 2 },
    ]);
  });

  it("returns no changes when deleting the last set", () => {
    // Sets 1,2,3 with #3 deleted leaves 1 and 2 — already contiguous.
    expect(renumberSets([{ id: "a", setNumber: 1 }, { id: "b", setNumber: 2 }])).toEqual([]);
  });

  it("renumbers every survivor when the first set is deleted", () => {
    expect(
      renumberSets([
        { id: "b", setNumber: 2 },
        { id: "c", setNumber: 3 },
        { id: "d", setNumber: 4 },
      ]),
    ).toEqual([
      { id: "b", setNumber: 1 },
      { id: "c", setNumber: 2 },
      { id: "d", setNumber: 3 },
    ]);
  });

  it("returns no changes for an already-contiguous list", () => {
    expect(
      renumberSets([
        { id: "a", setNumber: 1 },
        { id: "b", setNumber: 2 },
        { id: "c", setNumber: 3 },
      ]),
    ).toEqual([]);
  });

  it("handles the single-remaining-set and empty cases", () => {
    expect(renumberSets([{ id: "c", setNumber: 3 }])).toEqual([{ id: "c", setNumber: 1 }]);
    expect(renumberSets([{ id: "a", setNumber: 1 }])).toEqual([]);
    expect(renumberSets([])).toEqual([]);
  });

  it("leaves the resulting numbering contiguous, so the next saved set can't collide", () => {
    // The actual bug this guards: saveSetForSession uses existingSets.length + 1.
    const survivors = [
      { id: "a", setNumber: 1 },
      { id: "c", setNumber: 3 },
      { id: "d", setNumber: 4 },
    ];
    const changes = renumberSets(survivors);
    const byId = new Map(changes.map((change) => [change.id, change.setNumber]));
    const finalNumbers = survivors.map((set) => byId.get(set.id) ?? set.setNumber);

    expect(finalNumbers).toEqual([1, 2, 3]);
    // length + 1 must be free.
    expect(finalNumbers).not.toContain(survivors.length + 1);
  });
});
