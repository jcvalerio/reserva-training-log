import { describe, expect, it } from "vitest";

import { getM1Readiness } from "./readiness";

describe("getM1Readiness", () => {
  it("blocks plan review before a profile exists", () => {
    const readiness = getM1Readiness({ hasProfile: false, hasActivePlan: false });

    expect(readiness.completedFoundationSteps).toBe(0);
    expect(readiness.totalFoundationSteps).toBe(1);
    expect(readiness.foundationReady).toBe(false);
    expect(readiness.nextStep.id).toBe("profile");
    expect(readiness.primaryAction).toMatchObject({
      labelEs: "Crear o completar perfil",
      href: "/perfil",
    });
    expect(readiness.steps.map((step) => [step.id, step.status])).toEqual([
      ["profile", "incomplete"],
      ["plan", "blocked"],
    ]);
    expect(readiness.steps.find((step) => step.id === "plan")?.statusLabelEs).toBe("Esperando perfil");
  });

  it("is foundation-ready as soon as a profile exists", () => {
    const readiness = getM1Readiness({ hasProfile: true, hasActivePlan: false });

    expect(readiness.completedFoundationSteps).toBe(1);
    expect(readiness.totalFoundationSteps).toBe(1);
    expect(readiness.foundationReady).toBe(true);
    expect(readiness.nextStep.id).toBe("plan");
    expect(readiness.primaryAction.href).toBe("/plan");
    expect(readiness.primaryAction.labelEs).toBe("Elegir mi plan");
    expect(readiness.primaryAction.helperEs).toContain("elegir una plantilla");
    expect(readiness.steps.find((step) => step.id === "plan")).toMatchObject({
      href: "/plan",
      status: "pending",
      statusLabelEs: "Elige tu plan",
    });
  });

  it("points a returning user with an active plan at Entrenar instead of the plan picker", () => {
    const readiness = getM1Readiness({ hasProfile: true, hasActivePlan: true });

    expect(readiness.foundationReady).toBe(true);
    expect(readiness.primaryAction).toMatchObject({
      labelEs: "Ir a Entrenar",
      href: "/entrenar",
    });
    expect(readiness.steps.find((step) => step.id === "plan")).toMatchObject({
      href: "/plan",
      status: "complete",
      statusLabelEs: "Activo",
    });
  });
});
