import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { getM1Readiness } from "@/onboarding/readiness";
import { getNonAiPlanGate } from "@/plans/plan-gate";
import { getPlanPreviewSummary } from "@/plans/plan-preview";
import { createSeededHypertrophyPlan } from "@/plans/seeded-plan";

import { PlanPageContent } from "./plan-page-content";

describe("PlanPageContent", () => {
  it("renders the complete-state seeded preview as read-only review copy for iPhone-sized use", () => {
    const readiness = getM1Readiness({
      hasProfile: true,
      baselineLiftCount: 6,
      bodyMeasurementCount: 1,
    });
    const gate = getNonAiPlanGate(readiness);
    const seededPreview = getPlanPreviewSummary(createSeededHypertrophyPlan());

    render(<PlanPageContent readiness={readiness} gate={gate} seededPreview={seededPreview} />);

    expect(screen.getByRole("heading", { name: "Revisión pre-plan" })).toBeVisible();
    expect(screen.getByText("IA")).toBeVisible();
    expect(screen.getByText("Apagada")).toBeVisible();
    expect(screen.getByText("Sin crear")).toBeVisible();
    expect(screen.getByText("Vista previa no guardada")).toBeVisible();

    for (const boundary of ["Solo lectura", "Sin IA", "No guardado", "No activable"]) {
      expect(screen.getByText(boundary)).toBeVisible();
    }

    for (const field of ["kg", "reps", "RIR", "dolor", "notas opcionales"]) {
      expect(screen.getByText(field)).toBeVisible();
    }

    const exerciseSummaries = screen.getAllByText("Ver ejercicios y objetivos");
    expect(exerciseSummaries).toHaveLength(5);

    const firstDetails = exerciseSummaries[0]?.closest("details") as HTMLDetailsElement | null;
    expect(firstDetails?.open).toBe(false);
    fireEvent.click(exerciseSummaries[0] as HTMLElement);
    expect(firstDetails?.open).toBe(true);

    expect(screen.getByText("Prensa de piernas")).toBeVisible();
    expect(screen.getAllByText("principal · bilateral")[0]).toBeVisible();
    expect(screen.getAllByText(/4×8-12 · RIR 2 ·\s*descanso 150s/)[0]).toBeVisible();
    expect(screen.getByText(/dolor >2 bloquea aumentos agresivos/i)).toBeVisible();
    expect(screen.queryByRole("link", { name: /aceptar|editar|activar|generar/i })).toBeNull();
  });

  it("hides the seeded preview until foundations are complete", () => {
    const readiness = getM1Readiness({
      hasProfile: true,
      baselineLiftCount: 0,
      bodyMeasurementCount: 0,
    });
    const gate = getNonAiPlanGate(readiness);

    render(<PlanPageContent readiness={readiness} gate={gate} seededPreview={null} />);

    expect(screen.getByRole("heading", { name: "Preparación del plan" })).toBeVisible();
    expect(screen.queryByText("Vista previa no guardada")).toBeNull();
    expect(screen.queryByText("Solo lectura")).toBeNull();
    expect(screen.getAllByRole("link", { name: "Ir a Pesos base" })[0]).toBeVisible();
  });
});
