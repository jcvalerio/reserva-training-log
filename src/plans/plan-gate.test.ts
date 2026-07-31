import { describe, expect, it } from "vitest";

import { getM1Readiness } from "@/onboarding/readiness";

import { getNonAiPlanGate } from "./plan-gate";

describe("getNonAiPlanGate", () => {
  it("blocks plan review until a profile exists", () => {
    const readiness = getM1Readiness({ hasProfile: false });

    const gate = getNonAiPlanGate(readiness);

    expect(gate).toMatchObject({
      status: "blocked",
      titleEs: "Completa bases antes del plan",
      ctaLabelEs: "Ir a Perfil",
      ctaHref: "/perfil",
      canGenerateAi: false,
    });
    expect(gate.descriptionEs).toContain("no genera IA");
    expect(gate.descriptionEs).toContain("no guarda");
  });

  it("allows only manual review once a profile exists", () => {
    const readiness = getM1Readiness({ hasProfile: true });

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
