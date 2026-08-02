import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ProfileResetSummary } from "@/profile/profile-reset";

import { ResetConfirmForm } from "./reset-confirm-form";

const summary: ProfileResetSummary = { planCount: 2, sessionCount: 11, measurementCount: 2 };

describe("ResetConfirmForm", () => {
  it("keeps the submit button disabled until the exact confirmation text is typed", () => {
    const action = vi.fn();
    render(<ResetConfirmForm action={action} summary={summary} />);

    const button = screen.getByRole("button", { name: "Eliminar mis planes y sesiones" });
    expect(button).toBeDisabled();

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "reiniciar" } });
    expect(button).toBeDisabled();

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "REINICIAR" } });
    expect(button).toBeEnabled();
  });

  it("does not call the action if the form is submitted without the confirmation text matching", () => {
    const action = vi.fn();
    render(<ResetConfirmForm action={action} summary={summary} />);

    fireEvent.submit(screen.getByRole("button", { name: "Eliminar mis planes y sesiones" }).closest("form")!);

    expect(action).not.toHaveBeenCalled();
  });

  it("defaults to keeping measurements, and switches the summary copy when unchecked", () => {
    const action = vi.fn();
    render(<ResetConfirmForm action={action} summary={summary} />);

    const checkbox = screen.getByRole("checkbox", { name: /Mantener mis mediciones corporales/ });
    expect(checkbox).toBeChecked();
    expect(screen.getByText("Tus mediciones se mantienen.")).toBeVisible();

    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
    expect(screen.getByText(/también se eliminarán/)).toBeVisible();
  });

  it("omits the measurements checkbox entirely when there are none to keep", () => {
    const action = vi.fn();
    render(<ResetConfirmForm action={action} summary={{ planCount: 1, sessionCount: 1, measurementCount: 0 }} />);

    expect(screen.queryByRole("checkbox")).toBeNull();
  });
});
