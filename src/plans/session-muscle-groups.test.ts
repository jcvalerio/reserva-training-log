import { describe, expect, it } from "vitest";

import { classifySessionMuscleGroups } from "./session-muscle-groups";

describe("classifySessionMuscleGroups", () => {
  it("classifies via the catalog link when linked", () => {
    const groups = classifySessionMuscleGroups(
      [{ exerciseId: "ex-1", exerciseNameEs: "Ejercicio con nombre libre" }],
      new Map([["ex-1", "pecho"]]),
    );

    expect(groups).toEqual(["pecho"]);
  });

  it("falls back to the free-text catalog name when there is no catalog link", () => {
    const groups = classifySessionMuscleGroups(
      [{ exerciseId: null, exerciseNameEs: "Sentadilla trasera (Back Squat)" }],
      new Map(),
    );

    expect(groups).toEqual(["cuadriceps"]);
  });

  it("falls back to the free-text name when the exerciseId is linked but the id is unresolved", () => {
    // A prescription can carry an exerciseId whose row this call's map wasn't
    // asked about — treat "not in the map" like "no link" rather than typing
    // through an unsafe cast.
    const groups = classifySessionMuscleGroups(
      [{ exerciseId: "ex-unknown", exerciseNameEs: "Prensa de piernas" }],
      new Map(),
    );

    expect(groups).toEqual(["cuadriceps"]);
  });

  it("silently drops cardio (a known exercise with no primary group)", () => {
    const groups = classifySessionMuscleGroups([{ exerciseId: null, exerciseNameEs: "Bici estática" }], new Map());

    expect(groups).toEqual([]);
  });

  it("silently drops an unclassifiable exercise", () => {
    const groups = classifySessionMuscleGroups(
      [{ exerciseId: null, exerciseNameEs: "Ejercicio inventado que no existe" }],
      new Map(),
    );

    expect(groups).toEqual([]);
  });

  it("deduplicates and orders the result anatomically, not by insertion order", () => {
    const groups = classifySessionMuscleGroups(
      [
        { exerciseId: null, exerciseNameEs: "Curl femoral sentado" }, // femorales
        { exerciseId: null, exerciseNameEs: "Press de pecho en máquina" }, // pecho
        { exerciseId: null, exerciseNameEs: "Prensa de piernas" }, // cuadriceps, duplicate group below
        { exerciseId: null, exerciseNameEs: "Extensión de cuádriceps" }, // cuadriceps again
      ],
      new Map(),
    );

    // muscleGroups is declared pecho, ..., cuadriceps, femorales, ... — pecho
    // first, cuadriceps before femorales, no duplicate for the two
    // cuadriceps-training exercises.
    expect(groups).toEqual(["pecho", "cuadriceps", "femorales"]);
  });
});
