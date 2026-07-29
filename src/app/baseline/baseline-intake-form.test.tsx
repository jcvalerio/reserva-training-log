import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BaselineIntakeForm } from "./baseline-intake-form";

describe("BaselineIntakeForm", () => {
  it("shows saved baseline completion and jump anchors for the long mobile form", () => {
    render(
      <BaselineIntakeForm
        action={vi.fn()}
        savedLifts={[
          {
            exerciseSlug: "leg-press",
            side: "bilateral",
            weightKg: "120.00",
            reps: 10,
            sets: 3,
            rir: 2,
            painScore: 1,
            notes: null,
          },
        ]}
      />,
    );

    expect(screen.getByText("1/12 ejercicios con datos")).toBeVisible();
    expect(screen.getByText("1 filas completas. Una fila válida requiere kg, reps, series, RIR y dolor.")).toBeVisible();
    expect(screen.getByRole("link", { name: "Ir a pendiente" })).toHaveAttribute(
      "href",
      "#baseline-single-leg-leg-press",
    );
    expect(screen.getByRole("link", { name: "Ir a Prensa de piernas" })).toHaveAttribute(
      "href",
      "#baseline-leg-press",
    );
  });

  it("updates progress while the tester completes a baseline row", () => {
    render(<BaselineIntakeForm action={vi.fn()} savedLifts={[]} />);

    expect(screen.getByText("0/12 ejercicios con datos")).toBeVisible();

    const legPressSection = screen.getByRole("heading", { name: "Prensa de piernas" }).closest("section");
    expect(legPressSection).not.toBeNull();

    const legPress = within(legPressSection as HTMLElement);
    fireEvent.change(legPress.getByLabelText("kg"), { target: { value: "120" } });
    fireEvent.change(legPress.getByLabelText("reps"), { target: { value: "10" } });
    fireEvent.change(legPress.getByLabelText("series"), { target: { value: "3" } });
    fireEvent.change(legPress.getByLabelText("dolor 0-10"), { target: { value: "1" } });
    fireEvent.change(legPress.getByLabelText("RIR"), { target: { value: "2" } });

    expect(screen.getByText("1/12 ejercicios con datos")).toBeVisible();
    expect(screen.getByText("1 filas completas. Una fila válida requiere kg, reps, series, RIR y dolor.")).toBeVisible();
  });
});
