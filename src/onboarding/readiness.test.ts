import { describe, expect, it } from "vitest";

import { getM1Readiness } from "./readiness";

describe("getM1Readiness", () => {
  it("marks dependent onboarding steps as blocked before profile exists", () => {
    const readiness = getM1Readiness({
      hasProfile: false,
      baselineLiftCount: 0,
      bodyMeasurementCount: 0,
    });

    expect(readiness.completedFoundationSteps).toBe(0);
    expect(readiness.foundationReady).toBe(false);
    expect(readiness.nextStep.id).toBe("profile");
    expect(readiness.steps.map((step) => [step.id, step.status])).toEqual([
      ["profile", "incomplete"],
      ["baseline", "blocked"],
      ["measurements", "blocked"],
      ["plan", "pending"],
    ]);
  });

  it("counts existing authenticated baseline and measurement data as complete", () => {
    const readiness = getM1Readiness({
      hasProfile: true,
      baselineLiftCount: 3,
      bodyMeasurementCount: 1,
    });

    expect(readiness.completedFoundationSteps).toBe(3);
    expect(readiness.totalFoundationSteps).toBe(3);
    expect(readiness.foundationReady).toBe(true);
    expect(readiness.nextStep.id).toBe("plan");
    expect(readiness.steps.find((step) => step.id === "baseline")?.descriptionEs).toContain("3 entradas");
    expect(readiness.steps.find((step) => step.id === "plan")?.statusLabelEs).toBe("No iniciado");
  });

  it("keeps plan generation pending when foundations are incomplete", () => {
    const readiness = getM1Readiness({
      hasProfile: true,
      baselineLiftCount: 1,
      bodyMeasurementCount: 0,
    });

    expect(readiness.completedFoundationSteps).toBe(2);
    expect(readiness.foundationReady).toBe(false);
    expect(readiness.nextStep.id).toBe("measurements");
    expect(readiness.steps.find((step) => step.id === "plan")?.status).toBe("pending");
  });
});
