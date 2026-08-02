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
        knownExerciseNames={[]}
        exerciseDefaultsByName={{}}
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
        knownExerciseNames={[]}
        exerciseDefaultsByName={{}}
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
        knownExerciseNames={[]}
        exerciseDefaultsByName={{}}
      />,
    );

    expect(screen.getByLabelText("Reps mín.")).toBeVisible();
    expect(screen.getByLabelText("RIR objetivo")).toBeVisible();
    expect(screen.queryByLabelText("Duración")).toBeNull();

    fireEvent.change(screen.getByLabelText("Tipo de ejercicio"), { target: { value: "duration" } });

    expect(screen.getByLabelText("Duración")).toBeVisible();
    expect(screen.getByLabelText("Rondas")).toBeVisible();
    expect(screen.queryByLabelText("Reps mín.")).toBeNull();
    expect(screen.queryByLabelText("RIR objetivo")).toBeNull();
    expect(screen.queryByLabelText("Mecanismo de carga (opcional)")).toBeNull();
  });

  it("converts the duración value when the unit toggle switches between segundos and minutos", () => {
    render(
      <SessionEditorForm
        action={vi.fn()}
        draftPlanId="draft-1"
        dayIndex={1}
        initialNameEs=""
        initialFocus=""
        initialExercises={[]}
        knownExerciseNames={[]}
        exerciseDefaultsByName={{}}
      />,
    );

    fireEvent.change(screen.getByLabelText("Tipo de ejercicio"), { target: { value: "duration" } });

    // blankRow() defaults durationSeconds to 60, which reads as 1 minute.
    expect(screen.getByLabelText("Unidad")).toHaveValue("minutes");
    expect(screen.getByLabelText("Duración")).toHaveValue(1);

    fireEvent.change(screen.getByLabelText("Duración"), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("Unidad"), { target: { value: "seconds" } });

    expect(screen.getByLabelText("Duración")).toHaveValue(300);

    const hiddenInput = document.querySelector('input[name="exercise-0:durationSeconds"]');
    expect(hiddenInput).toHaveValue("300");
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
        knownExerciseNames={[]}
        exerciseDefaultsByName={{}}
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

  it("offers previously-used exercise names as autocomplete suggestions", () => {
    render(
      <SessionEditorForm
        action={vi.fn()}
        draftPlanId="draft-1"
        dayIndex={1}
        initialNameEs=""
        initialFocus=""
        initialExercises={[]}
        knownExerciseNames={["Prensa de piernas", "Sentadilla"]}
        exerciseDefaultsByName={{}}
      />,
    );

    const nameInput = screen.getByLabelText("Nombre del ejercicio");
    const datalistId = nameInput.getAttribute("list");
    expect(datalistId).toBeTruthy();

    const datalist = document.getElementById(datalistId!);
    const options = datalist ? Array.from(datalist.querySelectorAll("option")).map((option) => option.value) : [];
    expect(options).toEqual(["Prensa de piernas", "Sentadilla"]);
  });

  it("prefills sets/reps/RIR/rest from a known exercise's most recent prescription when its name is entered", () => {
    render(
      <SessionEditorForm
        action={vi.fn()}
        draftPlanId="draft-1"
        dayIndex={1}
        initialNameEs=""
        initialFocus=""
        initialExercises={[]}
        knownExerciseNames={["Sentadilla"]}
        exerciseDefaultsByName={{
          Sentadilla: {
            phase: "main",
            isUnilateral: false,
            prescriptionType: "strength",
            targetSets: 5,
            targetRepMin: 5,
            targetRepMax: 5,
            targetRir: 1,
            durationSeconds: null,
            restSeconds: 180,
            loadMechanism: "barbell",
            isCompound: true,
          },
        }}
      />,
    );

    fireEvent.change(screen.getByLabelText("Nombre del ejercicio"), { target: { value: "Sentadilla" } });
    fireEvent.blur(screen.getByLabelText("Nombre del ejercicio"));

    expect(screen.getByLabelText("Series")).toHaveValue(5);
    expect(screen.getByLabelText("Reps mín.")).toHaveValue(5);
    expect(screen.getByLabelText("Reps máx.")).toHaveValue(5);
    expect(screen.getByLabelText("Descanso (s)")).toHaveValue(180);
    expect(
      screen.getByText("Series, reps y RIR se llenaron con tu configuración más reciente de este ejercicio — puedes ajustarlos."),
    ).toBeVisible();
  });

  it("does not prefill for a name with no history, and does not clobber an unchanged existing row", () => {
    render(
      <SessionEditorForm
        action={vi.fn()}
        draftPlanId="draft-1"
        dayIndex={1}
        initialNameEs=""
        initialFocus=""
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
            substitutionOptionsEs: [],
            loadMechanism: "machine",
            isCompound: true,
          },
        ]}
        knownExerciseNames={["Prensa de piernas"]}
        exerciseDefaultsByName={{
          "Prensa de piernas": {
            phase: "main",
            isUnilateral: false,
            prescriptionType: "strength",
            targetSets: 99,
            targetRepMin: 99,
            targetRepMax: 99,
            targetRir: 0,
            durationSeconds: null,
            restSeconds: 999,
            loadMechanism: "machine",
            isCompound: true,
          },
        }}
      />,
    );

    // Blurring without changing the name shouldn't overwrite this row's
    // already-set values with unrelated history.
    fireEvent.blur(screen.getByLabelText("Nombre del ejercicio"));
    expect(screen.getByLabelText("Series")).toHaveValue(4);

    // A genuinely unknown name is a no-op, not a reset to blank defaults.
    fireEvent.change(screen.getByLabelText("Nombre del ejercicio"), { target: { value: "Ejercicio inventado" } });
    fireEvent.blur(screen.getByLabelText("Nombre del ejercicio"));
    expect(screen.getByLabelText("Series")).toHaveValue(4);
  });

  it("reorders exercise rows with the up/down buttons", () => {
    render(
      <SessionEditorForm
        action={vi.fn()}
        draftPlanId="draft-1"
        dayIndex={1}
        initialNameEs=""
        initialFocus=""
        initialExercises={[]}
        knownExerciseNames={[]}
        exerciseDefaultsByName={{}}
      />,
    );

    fireEvent.change(screen.getByLabelText("Nombre del ejercicio"), { target: { value: "Primero" } });
    fireEvent.click(screen.getByRole("button", { name: "+ Agregar ejercicio" }));
    const nameInputs = screen.getAllByLabelText("Nombre del ejercicio");
    fireEvent.change(nameInputs[1] as HTMLElement, { target: { value: "Segundo" } });

    const moveDownButtons = screen.getAllByRole("button", { name: "Mover abajo" });
    fireEvent.click(moveDownButtons[0] as HTMLElement);

    const reorderedNames = screen.getAllByLabelText("Nombre del ejercicio").map((input) => (input as HTMLInputElement).value);
    expect(reorderedNames).toEqual(["Segundo", "Primero"]);
  });
});
