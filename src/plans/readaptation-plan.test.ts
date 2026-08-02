import { describe, expect, it } from "vitest";

import { generatedWorkoutPlanSchema, MAX_SESSION_EXERCISES, MIN_SESSION_EXERCISES } from "./generated-plan-schema";
import { createReadaptationPlan } from "./readaptation-plan";

describe("createReadaptationPlan", () => {
  it("returns a valid 5-day hypertrophy routine that repeats indefinitely", () => {
    const plan = createReadaptationPlan();

    expect(() => generatedWorkoutPlanSchema.parse(plan)).not.toThrow();
    expect(plan.goal).toBe("hypertrophy");
    expect(plan.daysPerWeek).toBe(5);
    expect(plan.sessions).toHaveLength(5);
    expect(plan.sessions.map((session) => session.dayIndex)).toEqual([1, 2, 3, 4, 5]);
  });

  it("keeps every session within the exercise-count bounds, including the lighter Miércoles recovery day", () => {
    const plan = createReadaptationPlan();

    for (const session of plan.sessions) {
      expect(session.exercises.length).toBeGreaterThanOrEqual(MIN_SESSION_EXERCISES);
      expect(session.exercises.length).toBeLessThanOrEqual(MAX_SESSION_EXERCISES);
    }
  });

  it("marks each day's star exercise(s) at RIR 2 and everything else at RIR 3", () => {
    const plan = createReadaptationPlan();
    const monday = plan.sessions[0]!;
    const prensa = monday.exercises.find((exercise) => exercise.exerciseNameEs === "Prensa (pies bajos)");
    const extension = monday.exercises.find((exercise) => exercise.exerciseNameEs === "Extensión de cuádriceps");

    expect(prensa?.prescriptionType).toBe("strength");
    expect(extension?.prescriptionType).toBe("strength");
    if (prensa?.prescriptionType === "strength" && extension?.prescriptionType === "strength") {
      expect(prensa.targetRir).toBe(2);
      expect(extension.targetRir).toBe(3);
    }
  });

  it("gives Thursday two star exercises (peso muerto rumano and sentadilla sumo)", () => {
    const plan = createReadaptationPlan();
    const thursday = plan.sessions[3]!;
    const stars = thursday.exercises.filter((exercise) => exercise.notesEs.startsWith("Ejercicio estrella"));

    expect(stars.map((exercise) => exercise.exerciseNameEs)).toEqual(["Peso muerto rumano", "Sentadilla sumo"]);
  });

  it("models timed holds (plancha, plancha lateral, caminadora) as duration-type, not reps", () => {
    const plan = createReadaptationPlan();
    const allExercises = plan.sessions.flatMap((session) => session.exercises);

    const plancha = allExercises.find((exercise) => exercise.exerciseNameEs === "Plancha");
    const planchaLateral = allExercises.find((exercise) => exercise.exerciseNameEs === "Plancha lateral");
    const caminadora = allExercises.find((exercise) => exercise.exerciseNameEs === "Caminadora inclinada o bicicleta");

    expect(plancha?.prescriptionType).toBe("duration");
    expect(planchaLateral?.prescriptionType).toBe("duration");
    expect(caminadora?.prescriptionType).toBe("duration");
    if (caminadora?.prescriptionType === "duration") {
      expect(caminadora.durationSeconds).toBe(1200); // 20 minutes
    }
  });

  it("marks unilateral exercises correctly (remo unilateral, sentadilla búlgara, bird dog, plancha lateral)", () => {
    const plan = createReadaptationPlan();
    const allExercises = plan.sessions.flatMap((session) => session.exercises);

    const unilateralNames = allExercises.filter((exercise) => exercise.isUnilateral).map((exercise) => exercise.exerciseNameEs);

    expect(unilateralNames).toEqual(
      expect.arrayContaining(["Sentadilla búlgara", "Bird dog", "Remo unilateral en polea", "Plancha lateral"]),
    );
  });

  it("gives Miércoles a lighter session duration matching its own shorter source guidance", () => {
    const plan = createReadaptationPlan();
    const wednesday = plan.sessions[2]!;

    expect(wednesday.estimatedDurationMinutes).toBe(35);
    expect(plan.sessions[0]!.estimatedDurationMinutes).toBe(45);
  });
});
