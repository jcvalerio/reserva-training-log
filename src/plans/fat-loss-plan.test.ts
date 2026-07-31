import { describe, expect, it } from "vitest";

import { generatedWorkoutPlanSchema, MAX_SESSION_EXERCISES, MIN_SESSION_EXERCISES } from "./generated-plan-schema";
import { createFatLossPlan } from "./fat-loss-plan";

describe("createFatLossPlan", () => {
  it("returns a valid 5-day routine alternating Rutina A/B per the source template's weekly suggestion", () => {
    const plan = createFatLossPlan();

    expect(() => generatedWorkoutPlanSchema.parse(plan)).not.toThrow();
    expect(plan.goal).toBe("fat_loss");
    expect(plan.daysPerWeek).toBe(5);
    expect(plan.sessions).toHaveLength(5);
    expect(plan.sessions.map((session) => session.dayIndex)).toEqual([1, 2, 3, 4, 5]);

    // LUN:A MAR:B MIÉ:A JUE:B VIE:A
    const routineByDay = plan.sessions.map((session) => (session.nameEs.includes("Rutina A") ? "A" : "B"));
    expect(routineByDay).toEqual(["A", "B", "A", "B", "A"]);
  });

  it("keeps every session within the exercise-count bounds despite the circuit structure's high exercise count", () => {
    const plan = createFatLossPlan();

    for (const session of plan.sessions) {
      expect(session.exercises.length).toBeGreaterThanOrEqual(MIN_SESSION_EXERCISES);
      expect(session.exercises.length).toBeLessThanOrEqual(MAX_SESSION_EXERCISES);
    }
  });

  it("excludes duration-type exercises (calorie/time targets, optional cardio) from strength-only assumptions", () => {
    const plan = createFatLossPlan();
    const rutinaA = plan.sessions[0]!;

    const durationExerciseNames = rutinaA.exercises
      .filter((exercise) => exercise.prescriptionType === "duration")
      .map((exercise) => exercise.exerciseNameEs);

    expect(durationExerciseNames).toContain("Cardio opcional · Caminata en banda");
    expect(durationExerciseNames.length).toBeGreaterThan(0);
  });

  it("gives every exercise a block-prefixed name so the grouping is visible without new UI", () => {
    const plan = createFatLossPlan();
    const rutinaA = plan.sessions[0]!;

    for (const exercise of rutinaA.exercises) {
      expect(exercise.exerciseNameEs).toMatch(/^(Calentamiento|Fuerza principal|Bloque 1|Bloque 2|Acondicionamiento|Cardio opcional) · /);
    }
  });

  it("does not collide same-named movements used in two different blocks within one session", () => {
    const plan = createFatLossPlan();
    const rutinaA = plan.sessions[0]!;

    const names = rutinaA.exercises.map((exercise) => exercise.exerciseNameEs);
    expect(new Set(names).size).toBe(names.length);
  });
});
