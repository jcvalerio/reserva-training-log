import { describe, expect, it } from "vitest";

import type { PlanBuilderExerciseInput } from "./plan-builder-schema";
import { planPrescriptionWrites, type ExistingPrescriptionRow } from "./plan-prescription-writes";

function exercise(
  exerciseNameEs: string,
  prescriptionId: string | null,
  overrides: Partial<PlanBuilderExerciseInput> = {},
): PlanBuilderExerciseInput {
  return {
    prescriptionType: "strength",
    prescriptionId,
    exerciseNameEs,
    exerciseId: null,
    phase: "main",
    isUnilateral: false,
    targetSets: 3,
    targetRepMin: 8,
    targetRepMax: 12,
    targetRir: 2,
    restSeconds: 90,
    notesEs: "Ajusta la carga y conserva técnica.",
    painSensitive: false,
    substitutionOptionsEs: [],
    ...overrides,
  } as PlanBuilderExerciseInput;
}

const existing: ExistingPrescriptionRow[] = [
  { id: "presc-press", exerciseNameEs: "Press inclinado" },
  { id: "presc-curl", exerciseNameEs: "Curl de bíceps" },
];

describe("planPrescriptionWrites", () => {
  it("keeps each exercise on its own row when the order is unchanged", () => {
    const plan = planPrescriptionWrites(existing, [
      exercise("Press inclinado", "presc-press"),
      exercise("Curl de bíceps", "presc-curl"),
    ]);

    expect(plan.updates).toEqual([
      { id: "presc-press", exerciseInput: expect.objectContaining({ exerciseNameEs: "Press inclinado" }), orderIndex: 1 },
      { id: "presc-curl", exerciseInput: expect.objectContaining({ exerciseNameEs: "Curl de bíceps" }), orderIndex: 2 },
    ]);
    expect(plan.inserts).toEqual([]);
    expect(plan.leftovers).toEqual([]);
  });

  it("REGRESSION: reordering swaps orderIndex, never the row an exercise writes to", () => {
    // The reported bug. Position-based matching wrote Curl's name, type and
    // prescription into `presc-press` — the row that owned every logged Press
    // set — so /entrenar showed Press history under the name Curl.
    const plan = planPrescriptionWrites(existing, [
      exercise("Curl de bíceps", "presc-curl"),
      exercise("Press inclinado", "presc-press"),
    ]);

    const press = plan.updates.find((u) => u.id === "presc-press");
    const curl = plan.updates.find((u) => u.id === "presc-curl");

    // Each row still receives its OWN exercise — only the position moved.
    expect(press?.exerciseInput.exerciseNameEs).toBe("Press inclinado");
    expect(press?.orderIndex).toBe(2);
    expect(curl?.exerciseInput.exerciseNameEs).toBe("Curl de bíceps");
    expect(curl?.orderIndex).toBe(1);
    expect(plan.inserts).toEqual([]);
    expect(plan.leftovers).toEqual([]);
  });

  it("REGRESSION: a strength/duration swap never leaves a row owning the wrong set shape", () => {
    // This is the crash. A duration row rewritten as strength claimed sets
    // with null weight/reps/RIR, and `toStrengthSetLog` threw inside a client
    // component, blanking the session runner.
    const withDuration: ExistingPrescriptionRow[] = [
      { id: "presc-strength", exerciseNameEs: "Press inclinado" },
      { id: "presc-duration", exerciseNameEs: "Plancha" },
    ];

    const plan = planPrescriptionWrites(withDuration, [
      exercise("Plancha", "presc-duration", { prescriptionType: "duration", durationSeconds: 45 }),
      exercise("Press inclinado", "presc-strength"),
    ]);

    expect(plan.updates.find((u) => u.id === "presc-duration")?.exerciseInput.prescriptionType).toBe("duration");
    expect(plan.updates.find((u) => u.id === "presc-strength")?.exerciseInput.prescriptionType).toBe("strength");
  });

  it("inserts a newly added row, which has no id yet", () => {
    const plan = planPrescriptionWrites(existing, [
      exercise("Press inclinado", "presc-press"),
      exercise("Curl de bíceps", "presc-curl"),
      exercise("Remo con cable", null),
    ]);

    expect(plan.updates).toHaveLength(2);
    expect(plan.inserts).toEqual([
      { exerciseInput: expect.objectContaining({ exerciseNameEs: "Remo con cable" }), orderIndex: 3 },
    ]);
    expect(plan.leftovers).toEqual([]);
  });

  it("reports an unclaimed existing row as a leftover, for the delete path to vet", () => {
    const plan = planPrescriptionWrites(existing, [exercise("Press inclinado", "presc-press")]);

    expect(plan.updates).toHaveLength(1);
    expect(plan.leftovers).toEqual([{ id: "presc-curl", exerciseNameEs: "Curl de bíceps" }]);
  });

  it("keeps orderIndex tied to submitted position when a new row is inserted first", () => {
    const plan = planPrescriptionWrites(existing, [
      exercise("Calentamiento", null),
      exercise("Press inclinado", "presc-press"),
      exercise("Curl de bíceps", "presc-curl"),
    ]);

    expect(plan.inserts[0]?.orderIndex).toBe(1);
    expect(plan.updates.find((u) => u.id === "presc-press")?.orderIndex).toBe(2);
    expect(plan.updates.find((u) => u.id === "presc-curl")?.orderIndex).toBe(3);
  });

  it("treats a stale id — a row deleted elsewhere — as a new row rather than failing", () => {
    const plan = planPrescriptionWrites(existing, [exercise("Fantasma", "presc-gone")]);

    expect(plan.updates).toEqual([]);
    expect(plan.inserts).toHaveLength(1);
    expect(plan.leftovers).toHaveLength(2);
  });

  it("lets only the first of two rows claim a duplicated id", () => {
    // A hand-edited form, or a duplicated row. Two writes racing on one id
    // would silently lose one exercise; the second becomes its own row.
    const plan = planPrescriptionWrites(existing, [
      exercise("Press inclinado", "presc-press"),
      exercise("Press inclinado copia", "presc-press"),
    ]);

    expect(plan.updates).toHaveLength(1);
    expect(plan.updates[0]?.exerciseInput.exerciseNameEs).toBe("Press inclinado");
    expect(plan.inserts).toHaveLength(1);
    expect(plan.inserts[0]?.exerciseInput.exerciseNameEs).toBe("Press inclinado copia");
  });

  it("does NOT fall back to matching by name when the id is absent", () => {
    // Guessing by name would re-introduce the silent misattribution this
    // function exists to prevent. An idless row is a new row, full stop.
    const plan = planPrescriptionWrites(existing, [exercise("Press inclinado", null)]);

    expect(plan.updates).toEqual([]);
    expect(plan.inserts).toHaveLength(1);
    expect(plan.leftovers).toHaveLength(2);
  });

  it("handles a first save, where nothing exists yet", () => {
    const plan = planPrescriptionWrites([], [exercise("Press inclinado", null), exercise("Curl de bíceps", null)]);

    expect(plan.updates).toEqual([]);
    expect(plan.inserts.map((i) => i.orderIndex)).toEqual([1, 2]);
    expect(plan.leftovers).toEqual([]);
  });
});
