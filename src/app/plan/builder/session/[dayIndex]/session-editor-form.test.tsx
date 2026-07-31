import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SessionEditorForm } from "./session-editor-form";

describe("SessionEditorForm", () => {
  it("starts with one blank exercise row when there is no existing session", () => {
    render(
      <SessionEditorForm
        action={vi.fn()}
        draftPlanId="draft-1"
        dayIndex={1}
        initialNameEs=""
        initialFocus=""
        initialExercises={[]}
      />,
    );

    expect(screen.getByText("Ejercicio 1")).toBeVisible();
    expect(screen.queryByText("Ejercicio 2")).toBeNull();
    expect(screen.queryByRole("button", { name: "Eliminar" })).toBeNull();
  });

  it("prefills fields from an existing session's exercises", () => {
    render(
      <SessionEditorForm
        action={vi.fn()}
        draftPlanId="draft-1"
        dayIndex={1}
        initialNameEs="Pierna"
        initialFocus="Cuádriceps"
        initialExercises={[
          {
            exerciseNameEs: "Prensa de piernas",
            phase: "main",
            isUnilateral: false,
            prescriptionType: "strength",
            targetSets: 4,
            targetRepMin: 8,
            targetRepMax: 12,
            targetRir: 2,
            durationSeconds: null,
            restSeconds: 150,
            notesEs: "Ajusta la carga.",
            painSensitive: false,
            substitutionOptionsEs: ["Máquina equivalente"],
            loadMechanism: "machine",
            isCompound: true,
          },
        ]}
      />,
    );

    expect(screen.getByDisplayValue("Pierna")).toBeVisible();
    expect(screen.getByDisplayValue("Cuádriceps")).toBeVisible();
    expect(screen.getByDisplayValue("Prensa de piernas")).toBeVisible();
    expect(screen.getByDisplayValue("Máquina equivalente")).toBeVisible();
  });

  it("switches between strength and duration fields when the exercise type changes", () => {
    render(
      <SessionEditorForm
        action={vi.fn()}
        draftPlanId="draft-1"
        dayIndex={1}
        initialNameEs=""
        initialFocus=""
        initialExercises={[]}
      />,
    );

    expect(screen.getByLabelText("Reps mín.")).toBeVisible();
    expect(screen.getByLabelText("RIR objetivo")).toBeVisible();
    expect(screen.queryByLabelText("Duración (segundos)")).toBeNull();

    fireEvent.change(screen.getByLabelText("Tipo de ejercicio"), { target: { value: "duration" } });

    expect(screen.getByLabelText("Duración (segundos)")).toBeVisible();
    expect(screen.getByLabelText("Rondas")).toBeVisible();
    expect(screen.queryByLabelText("Reps mín.")).toBeNull();
    expect(screen.queryByLabelText("RIR objetivo")).toBeNull();
    expect(screen.queryByLabelText("Mecanismo de carga (opcional)")).toBeNull();
  });

  it("adds and removes exercise rows, keeping at least one", () => {
    render(
      <SessionEditorForm
        action={vi.fn()}
        draftPlanId="draft-1"
        dayIndex={1}
        initialNameEs=""
        initialFocus=""
        initialExercises={[]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "+ Agregar ejercicio" }));
    expect(screen.getByText("Ejercicio 2")).toBeVisible();

    const removeButtons = screen.getAllByRole("button", { name: "Eliminar" });
    expect(removeButtons).toHaveLength(2);

    fireEvent.click(removeButtons[0] as HTMLElement);
    expect(screen.queryByText("Ejercicio 2")).toBeNull();
    expect(screen.queryByRole("button", { name: "Eliminar" })).toBeNull();
  });
});
