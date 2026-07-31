import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { getM1Readiness } from "@/onboarding/readiness";
import { getNonAiPlanGate } from "@/plans/plan-gate";
import { getPlanPreviewSummary } from "@/plans/plan-preview";
import { createSeededHypertrophyPlan } from "@/plans/seeded-plan";

import { PlanPageContent } from "./plan-page-content";

const noopEditActivePlanAction = vi.fn(async () => {});
const noopCloneActivePlanAction = vi.fn(async () => {});

describe("PlanPageContent", () => {
  it("offers the start-plan fork (template or custom) once foundations are ready, with neither pre-expanded", () => {
    const readiness = getM1Readiness({
      hasProfile: true,
    });
    const gate = getNonAiPlanGate(readiness);

    render(
      <PlanPageContent
        readiness={readiness}
        gate={gate}
        showStartFork={true}
        activePlanPreview={null}
        activePlanError={false}
        activatedAt={null}
        justSaved={false}
        editActivePlanAction={noopEditActivePlanAction}
        cloneActivePlanAction={noopCloneActivePlanAction}
      />,
    );

    expect(screen.getByRole("heading", { name: "Revisión pre-plan" })).toBeVisible();
    expect(screen.getByText("IA")).toBeVisible();
    expect(screen.getByText("Apagada")).toBeVisible();
    expect(screen.getByText("Sin crear")).toBeVisible();
    expect(screen.getByText("¿Cómo quieres empezar?")).toBeVisible();

    expect(screen.getByRole("link", { name: "Usar una plantilla" })).toHaveAttribute("href", "/plan/templates");
    expect(screen.getByRole("link", { name: "Crear mi propio plan" })).toHaveAttribute("href", "/plan/builder");

    // Neither choice pre-renders the other's content — no plan preview, no
    // activate button anywhere on this fork.
    expect(screen.queryByText("Vista previa")).toBeNull();
    expect(screen.queryByRole("button", { name: "Activar este plan" })).toBeNull();
    // Only the fork's own single custom-plan link should exist, not a
    // second copy from CustomPlanBuilderEntry rendering underneath it too.
    expect(screen.getAllByRole("link", { name: "Crear mi propio plan" })).toHaveLength(1);
  });

  it("hides the start-plan fork until foundations are complete", () => {
    const readiness = getM1Readiness({ hasProfile: false });
    const gate = getNonAiPlanGate(readiness);

    render(
      <PlanPageContent
        readiness={readiness}
        gate={gate}
        showStartFork={false}
        activePlanPreview={null}
        activePlanError={false}
        activatedAt={null}
        justSaved={false}
        editActivePlanAction={noopEditActivePlanAction}
        cloneActivePlanAction={noopCloneActivePlanAction}
      />,
    );

    expect(screen.getByRole("heading", { name: "Preparación del plan" })).toBeVisible();
    expect(screen.queryByText("¿Cómo quieres empezar?")).toBeNull();
    expect(screen.getAllByRole("link", { name: "Ir a Perfil" })[0]).toBeVisible();
    // Not foundation-ready, no active plan: the custom-builder entry point
    // still shows on its own (matches the pre-fork behavior for this case).
    expect(screen.getByRole("link", { name: "Crear mi propio plan" })).toBeVisible();
  });

  it("renders the active plan instead of the start fork once activated", () => {
    const readiness = getM1Readiness({
      hasProfile: true,
    });
    const gate = getNonAiPlanGate(readiness);
    const activePlanPreview = getPlanPreviewSummary(createSeededHypertrophyPlan());

    render(
      <PlanPageContent
        readiness={readiness}
        gate={gate}
        showStartFork={false}
        activePlanPreview={activePlanPreview}
        activePlanError={false}
        activatedAt={new Date("2026-07-20T12:00:00Z")}
        justSaved={true}
        editActivePlanAction={noopEditActivePlanAction}
        cloneActivePlanAction={noopCloneActivePlanAction}
      />,
    );

    expect(screen.getByRole("heading", { name: "Tu plan" })).toBeVisible();
    expect(screen.getByText("Tu plan activo")).toBeVisible();
    expect(screen.getByText("Activo")).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("Tu plan quedó activado");
    expect(screen.queryByText("¿Cómo quieres empezar?")).toBeNull();
    expect(screen.queryByRole("button", { name: "Activar este plan" })).toBeNull();
    expect(screen.getByText(activePlanPreview.safetySummaryEs)).toBeVisible();
  });

  it("shows each exercise's notes and each session's mobility notes once expanded", () => {
    const readiness = getM1Readiness({ hasProfile: true });
    const gate = getNonAiPlanGate(readiness);
    const activePlanPreview = getPlanPreviewSummary(createSeededHypertrophyPlan());
    const firstSession = activePlanPreview.sessions[0]!;
    const firstExercise = firstSession.exercises[0]!;

    render(
      <PlanPageContent
        readiness={readiness}
        gate={gate}
        showStartFork={false}
        activePlanPreview={activePlanPreview}
        activePlanError={false}
        activatedAt={new Date("2026-07-20T12:00:00Z")}
        justSaved={false}
        editActivePlanAction={noopEditActivePlanAction}
        cloneActivePlanAction={noopCloneActivePlanAction}
      />,
    );

    fireEvent.click(screen.getAllByText("Ver ejercicios y objetivos")[0]!);

    expect(screen.getAllByText(firstExercise.notesEs)[0]).toBeVisible();
    expect(screen.getAllByText(firstSession.mobilityNotesEs)[0]).toBeVisible();
  });

  it("still offers the custom plan builder entry point when a plan is already active", () => {
    const readiness = getM1Readiness({
      hasProfile: true,
    });
    const gate = getNonAiPlanGate(readiness);
    const activePlanPreview = getPlanPreviewSummary(createSeededHypertrophyPlan());

    render(
      <PlanPageContent
        readiness={readiness}
        gate={gate}
        showStartFork={false}
        activePlanPreview={activePlanPreview}
        activePlanError={false}
        activatedAt={new Date("2026-07-20T12:00:00Z")}
        justSaved={false}
        editActivePlanAction={noopEditActivePlanAction}
        cloneActivePlanAction={noopCloneActivePlanAction}
      />,
    );

    expect(screen.getByRole("link", { name: "Crear mi propio plan" })).toHaveAttribute("href", "/plan/builder");
    expect(screen.getByText(/reemplaza el plan activo actual/)).toBeVisible();
  });

  it("offers first-class edit and duplicate actions on the active plan, not just as error recovery", () => {
    const readiness = getM1Readiness({
      hasProfile: true,
    });
    const gate = getNonAiPlanGate(readiness);
    const activePlanPreview = getPlanPreviewSummary(createSeededHypertrophyPlan());

    render(
      <PlanPageContent
        readiness={readiness}
        gate={gate}
        showStartFork={false}
        activePlanPreview={activePlanPreview}
        activePlanError={false}
        activatedAt={new Date("2026-07-20T12:00:00Z")}
        justSaved={false}
        editActivePlanAction={noopEditActivePlanAction}
        cloneActivePlanAction={noopCloneActivePlanAction}
      />,
    );

    expect(screen.getByRole("button", { name: "Editar mi plan" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Duplicar como borrador" })).toBeVisible();
  });

  it("shows a recoverable error state and no crash when the active plan fails to render", () => {
    const readiness = getM1Readiness({
      hasProfile: true,
    });
    const gate = getNonAiPlanGate(readiness);

    render(
      <PlanPageContent
        readiness={readiness}
        gate={gate}
        showStartFork={false}
        activePlanPreview={null}
        activePlanError={true}
        activatedAt={null}
        justSaved={false}
        editActivePlanAction={noopEditActivePlanAction}
        cloneActivePlanAction={noopCloneActivePlanAction}
      />,
    );

    expect(screen.getByRole("heading", { name: "Tu plan" })).toBeVisible();
    expect(screen.getByText("Tu plan activo tiene un problema")).toBeVisible();
    expect(screen.getByRole("button", { name: "Editar este plan" })).toBeVisible();
    expect(screen.getByText("Con errores")).toBeVisible();
    expect(screen.queryByText("Crear mi propio plan")).toBeNull();
  });
});
