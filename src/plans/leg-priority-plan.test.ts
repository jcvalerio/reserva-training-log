import { describe, expect, it } from "vitest";

import { generatedWorkoutPlanSchema, MAX_SESSION_EXERCISES, MIN_SESSION_EXERCISES } from "./generated-plan-schema";
import { createLegPriorityPlan } from "./leg-priority-plan";

describe("createLegPriorityPlan", () => {
  it("returns a valid 5-day hypertrophy routine that repeats indefinitely", () => {
    const plan = createLegPriorityPlan();

    expect(() => generatedWorkoutPlanSchema.parse(plan)).not.toThrow();
    expect(plan.goal).toBe("hypertrophy");
    expect(plan.daysPerWeek).toBe(5);
    expect(plan.sessions).toHaveLength(5);
    expect(plan.sessions.map((session) => session.dayIndex)).toEqual([1, 2, 3, 4, 5]);
  });

  it("keeps every session within the exercise-count bounds", () => {
    const plan = createLegPriorityPlan();

    for (const session of plan.sessions) {
      expect(session.exercises.length).toBeGreaterThanOrEqual(MIN_SESSION_EXERCISES);
      expect(session.exercises.length).toBeLessThanOrEqual(MAX_SESSION_EXERCISES);
    }
  });

  it("marks every unilateral exercise from the source (leg-priority) plan as unilateral", () => {
    const plan = createLegPriorityPlan();
    const allExercises = plan.sessions.flatMap((session) => session.exercises);

    const unilateralNames = allExercises.filter((exercise) => exercise.isUnilateral).map((exercise) => exercise.exerciseNameEs);

    expect(unilateralNames).toEqual(
      expect.arrayContaining([
        "Prensa unilateral",
        "Extensión de cuádriceps unilateral",
        "Pantorrilla sentada unilateral",
        "Curl femoral sentado unilateral",
        "Pantorrilla de pie unilateral",
        "Sentadilla búlgara con apoyo",
      ]),
    );
  });

  it("uses the last (hardest) RIR from the source's per-set scheme as targetRir, keeping the full scheme in notesEs", () => {
    const plan = createLegPriorityPlan();
    const monday = plan.sessions[0]!;
    const pressaUnilateral = monday.exercises.find((exercise) => exercise.exerciseNameEs === "Prensa unilateral");

    expect(pressaUnilateral?.prescriptionType).toBe("strength");
    if (pressaUnilateral?.prescriptionType === "strength") {
      expect(pressaUnilateral.targetRir).toBe(2); // "3-2-2" -> last set is RIR 2
      expect(pressaUnilateral.notesEs).toContain("RIR 3-2-2");
    }
  });

  it("uses only machine/cable equipment, matching the all-machine source plan", () => {
    const plan = createLegPriorityPlan();
    const allExercises = plan.sessions.flatMap((session) => session.exercises);

    for (const exercise of allExercises) {
      if (exercise.prescriptionType === "strength") {
        expect(exercise.loadMechanism).toBe("machine");
      }
    }
  });

  it("gives every session a Core exercise as a free choice with a rep range, not duration-locked", () => {
    const plan = createLegPriorityPlan();

    for (const session of plan.sessions) {
      const core = session.exercises.find((exercise) => exercise.exerciseNameEs === "Core");
      expect(core?.prescriptionType).toBe("strength");
    }
  });
});
