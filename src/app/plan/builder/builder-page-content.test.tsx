import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BuilderPageContent, type DraftPlanSummary } from "./builder-page-content";

const noopCreateDraftPlanAction = vi.fn(async () => {});
const noopUpdatePlanDetailsAction = vi.fn(async () => {});
const noopDeleteSessionAction = vi.fn(async () => {});
const noopDiscardDraftPlanAction = vi.fn(async () => {});
const noopActivateDraftPlanAction = vi.fn(async () => {});

describe("BuilderPageContent", () => {
  it("shows the draft-creation form when there is no draft yet", () => {
    render(
      <BuilderPageContent
        draft={null}
        justSaved={false}
        errorType={null}
        createDraftPlanAction={noopCreateDraftPlanAction}
        updatePlanDetailsAction={noopUpdatePlanDetailsAction}
        deleteSessionAction={noopDeleteSessionAction}
        discardDraftPlanAction={noopDiscardDraftPlanAction}
        activateDraftPlanAction={noopActivateDraftPlanAction}
      />,
    );

    expect(screen.getByRole("heading", { name: "Crea tu propia rutina" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Crear borrador" })).toBeVisible();
  });

  it("lists every day up to daysPerWeek, marking undefined days and offering edit/delete for defined ones", () => {
    const draft: DraftPlanSummary = {
      id: "draft-1",
      nameEs: "Mi rutina",
      daysPerWeek: 3,
      sessions: [
        { dayIndex: 1, nameEs: "Pierna", exerciseCount: 4, muscleGroups: ["cuadriceps"] },
        { dayIndex: 2, nameEs: "Torso", exerciseCount: 3, muscleGroups: ["pecho"] },
      ],
    };

    render(
      <BuilderPageContent
        draft={draft}
        justSaved={false}
        errorType={null}
        createDraftPlanAction={noopCreateDraftPlanAction}
        updatePlanDetailsAction={noopUpdatePlanDetailsAction}
        deleteSessionAction={noopDeleteSessionAction}
        discardDraftPlanAction={noopDiscardDraftPlanAction}
        activateDraftPlanAction={noopActivateDraftPlanAction}
      />,
    );

    expect(screen.getByRole("heading", { name: "Mi rutina" })).toBeVisible();
    expect(screen.getByText("Pierna")).toBeVisible();
    expect(screen.getByText("Torso")).toBeVisible();
    expect(screen.getByText("Sin definir")).toBeVisible();
    // A body-map thumbnail per day: the two defined days' actual muscle
    // groups, plus a third, not-yet-classified thumbnail for the undefined
    // day 3 — one per row, not just for the defined ones.
    expect(screen.getByRole("img", { name: "Entrena Cuádriceps" })).toBeVisible();
    expect(screen.getByRole("img", { name: "Entrena Pecho" })).toBeVisible();
    expect(screen.getByRole("img", { name: "Sin ejercicios clasificados todavía" })).toBeVisible();
    expect(screen.getAllByRole("link", { name: "Editar" })).toHaveLength(2);
    expect(screen.getByRole("link", { name: "+ Agregar" })).toHaveAttribute("href", "/plan/builder/session/3");
    expect(screen.getAllByRole("button", { name: "Eliminar" })).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Activar este plan" })).toBeNull();
    expect(screen.getByText("Completa cada día con al menos 3 ejercicios para poder activar este plan.")).toBeVisible();
  });

  it("offers a form to rename the plan and change its days-per-week, prefilled with current values", () => {
    const draft: DraftPlanSummary = {
      id: "draft-1",
      nameEs: "Mi rutina",
      daysPerWeek: 3,
      sessions: [],
    };

    render(
      <BuilderPageContent
        draft={draft}
        justSaved={false}
        errorType={null}
        createDraftPlanAction={noopCreateDraftPlanAction}
        updatePlanDetailsAction={noopUpdatePlanDetailsAction}
        deleteSessionAction={noopDeleteSessionAction}
        discardDraftPlanAction={noopDiscardDraftPlanAction}
        activateDraftPlanAction={noopActivateDraftPlanAction}
      />,
    );

    fireEvent.click(screen.getByText("Editar nombre y días del plan"));

    expect(screen.getByLabelText("Nombre del plan")).toHaveValue("Mi rutina");
    expect(screen.getByLabelText("Días de entrenamiento por semana")).toHaveValue(3);
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeVisible();
  });

  it("blocks activation and flags a day that has exercises but fewer than the minimum of 3", () => {
    const draft: DraftPlanSummary = {
      id: "draft-1",
      nameEs: "Mi rutina",
      daysPerWeek: 2,
      sessions: [
        { dayIndex: 1, nameEs: "Pierna", exerciseCount: 4, muscleGroups: ["cuadriceps"] },
        { dayIndex: 2, nameEs: "Torso", exerciseCount: 2, muscleGroups: ["pecho"] },
      ],
    };

    render(
      <BuilderPageContent
        draft={draft}
        justSaved={false}
        errorType={null}
        createDraftPlanAction={noopCreateDraftPlanAction}
        updatePlanDetailsAction={noopUpdatePlanDetailsAction}
        deleteSessionAction={noopDeleteSessionAction}
        discardDraftPlanAction={noopDiscardDraftPlanAction}
        activateDraftPlanAction={noopActivateDraftPlanAction}
      />,
    );

    expect(screen.getByText("2 ejercicios (mínimo 3)")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Activar este plan" })).toBeNull();
  });

  it("shows the activate button once every day has at least the minimum of 3 exercises", () => {
    const draft: DraftPlanSummary = {
      id: "draft-1",
      nameEs: "Mi rutina",
      daysPerWeek: 2,
      sessions: [
        { dayIndex: 1, nameEs: "Pierna", exerciseCount: 4, muscleGroups: ["cuadriceps"] },
        { dayIndex: 2, nameEs: "Torso", exerciseCount: 3, muscleGroups: ["pecho"] },
      ],
    };

    render(
      <BuilderPageContent
        draft={draft}
        justSaved={true}
        errorType={null}
        createDraftPlanAction={noopCreateDraftPlanAction}
        updatePlanDetailsAction={noopUpdatePlanDetailsAction}
        deleteSessionAction={noopDeleteSessionAction}
        discardDraftPlanAction={noopDiscardDraftPlanAction}
        activateDraftPlanAction={noopActivateDraftPlanAction}
      />,
    );

    expect(screen.getByRole("button", { name: "Activar este plan" })).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("Guardado en tu borrador.");
  });

  it("shows the incomplete-activation error message", () => {
    const draft: DraftPlanSummary = { id: "draft-1", nameEs: "Mi rutina", daysPerWeek: 1, sessions: [] };

    render(
      <BuilderPageContent
        draft={draft}
        justSaved={false}
        errorType="incomplete"
        createDraftPlanAction={noopCreateDraftPlanAction}
        updatePlanDetailsAction={noopUpdatePlanDetailsAction}
        deleteSessionAction={noopDeleteSessionAction}
        discardDraftPlanAction={noopDiscardDraftPlanAction}
        activateDraftPlanAction={noopActivateDraftPlanAction}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Completa todos los días con al menos 3 ejercicios antes de activar.",
    );
  });
});
