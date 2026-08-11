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
            exerciseId: null,
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

    // An exercise that already has a name starts collapsed (see the `open`
    // comment on ExerciseRowFields) — its name still reads at a glance from
    // the closed row's summary line, without opening it...
    // { selector: "span" } disambiguates from the identically-named catalog
    // entry that also renders as "Prensa de piernas" inside the (hidden)
    // Grupo muscular <option> further down this same collapsed card.
    expect(screen.getByText("Prensa de piernas", { selector: "span" })).toBeVisible();
    // ...while a field further down (inside the nested "Clasificación y
    // notas" disclosure) is present and correctly value-carrying, just not
    // currently on screen. Native <details> keeps hidden content in the DOM
    // — it still submits with the form — so this only needs `toBeInTheDocument`,
    // not `toBeVisible`.
    expect(screen.getByDisplayValue("Máquina equivalente")).toBeInTheDocument();
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
            exerciseId: null,
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

  it("starts an already-named exercise collapsed, expanding it on tap", () => {
    render(
      <SessionEditorForm
        action={vi.fn()}
        draftPlanId="draft-1"
        dayIndex={1}
        initialNameEs="Pierna"
        initialFocus="Cuádriceps"
        initialExercises={[
          {
            exerciseId: null,
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
            notesEs: "",
            painSensitive: false,
            substitutionOptionsEs: [],
            loadMechanism: null,
            isCompound: null,
          },
        ]}
        knownExerciseNames={[]}
        exerciseDefaultsByName={{}}
      />,
    );

    // The collapsed summary line composes from the row's own values without
    // opening it.
    expect(screen.getByText("Fuerza · 4×8-12")).toBeVisible();
    expect(screen.getByDisplayValue("Prensa de piernas")).not.toBeVisible();

    fireEvent.click(screen.getByText("Prensa de piernas", { selector: "span" }));

    expect(screen.getByDisplayValue("Prensa de piernas")).toBeVisible();
  });

  it("does not expand a collapsed card when clicking its reorder buttons", () => {
    render(
      <SessionEditorForm
        action={vi.fn()}
        draftPlanId="draft-1"
        dayIndex={1}
        initialNameEs=""
        initialFocus=""
        initialExercises={[
          {
            exerciseId: null,
            exerciseNameEs: "Primero",
            phase: "main",
            isUnilateral: false,
            prescriptionType: "strength",
            targetSets: 3,
            targetRepMin: 8,
            targetRepMax: 12,
            targetRir: 2,
            durationSeconds: null,
            restSeconds: 90,
            notesEs: "",
            painSensitive: false,
            substitutionOptionsEs: [],
            loadMechanism: null,
            isCompound: null,
          },
          {
            exerciseId: null,
            exerciseNameEs: "Segundo",
            phase: "main",
            isUnilateral: false,
            prescriptionType: "strength",
            targetSets: 3,
            targetRepMin: 8,
            targetRepMax: 12,
            targetRir: 2,
            durationSeconds: null,
            restSeconds: 90,
            notesEs: "",
            painSensitive: false,
            substitutionOptionsEs: [],
            loadMechanism: null,
            isCompound: null,
          },
        ]}
        knownExerciseNames={[]}
        exerciseDefaultsByName={{}}
      />,
    );

    expect(screen.getByDisplayValue("Primero")).not.toBeVisible();

    // Both reorder buttons and the delete button live inside the same
    // clickable <summary> as the toggle — this checks their onClick handlers
    // actually call preventDefault so a tap on them reorders/removes without
    // also popping the card open as a side effect.
    fireEvent.click(screen.getAllByRole("button", { name: "Mover abajo" })[0] as HTMLElement);

    expect(
      screen.getAllByLabelText("Nombre del ejercicio").map((input) => (input as HTMLInputElement).value),
    ).toEqual(["Segundo", "Primero"]);
    expect(screen.getByDisplayValue("Primero")).not.toBeVisible();

    fireEvent.click(screen.getAllByRole("button", { name: "Eliminar" })[0] as HTMLElement);

    expect(screen.getAllByLabelText("Nombre del ejercicio").map((input) => (input as HTMLInputElement).value)).toEqual([
      "Primero",
    ]);
    expect(screen.getByDisplayValue("Primero")).not.toBeVisible();
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
