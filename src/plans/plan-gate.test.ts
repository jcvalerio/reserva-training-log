import { describe, expect, it } from "vitest";

import { getM1Readiness } from "@/onboarding/readiness";

import { getNonAiPlanGate } from "./plan-gate";

describe("getNonAiPlanGate", () => {
  it("blocks plan review until the next onboarding foundation is complete", () => {
    const readiness = getM1Readiness({
      hasProfile: true,
      baselineLiftCount: 0,
      bodyMeasurementCount: 0,
    });

    const gate = getNonAiPlanGate(readiness);

    expect(gate).toMatchObject({
      status: "blocked",
      titleEs: "Completa bases antes del plan",
      ctaLabelEs: "Ir a Pesos base",
      ctaHref: "/baseline",
      canGenerateAi: false,
    });
    expect(gate.descriptionEs).toContain("no genera IA");
    expect(gate.descriptionEs).toContain("no guarda");
  });

  it("allows only manual review when foundations are ready", () => {
    const readiness = getM1Readiness({
      hasProfile: true,
      baselineLiftCount: 6,
      bodyMeasurementCount: 1,
    });

    const gate = getNonAiPlanGate(readiness);

    expect(gate).toMatchObject({
      status: "manual_review_ready",
      titleEs: "Base lista para revisión no-IA",
      ctaLabelEs: "Volver al resumen de Inicio",
      ctaHref: "/",
      canGenerateAi: false,
    });
    expect(gate.descriptionEs).toContain("no se genera, guarda ni activa");
  });
});
