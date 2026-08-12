import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SessionMuscleThumbnail } from "./session-muscle-thumbnail";

describe("SessionMuscleThumbnail", () => {
  it("names the trained muscle groups in its accessible label", () => {
    render(<SessionMuscleThumbnail muscleGroups={["pecho", "cuadriceps"]} />);

    expect(screen.getByRole("img", { name: "Entrena Pecho, Cuádriceps" })).toBeVisible();
  });

  it("falls back to a not-yet-classified label when there are no trained groups", () => {
    render(<SessionMuscleThumbnail muscleGroups={[]} />);

    expect(screen.getByRole("img", { name: "Sin ejercicios clasificados todavía" })).toBeVisible();
  });

  it("renders two silhouettes (front and back), both hidden from assistive tech individually", () => {
    const { container } = render(<SessionMuscleThumbnail muscleGroups={["pecho"]} />);

    const svgs = container.querySelectorAll("svg");
    expect(svgs).toHaveLength(2);
    for (const svg of svgs) {
      expect(svg.getAttribute("aria-hidden")).toBe("true");
    }
  });

  it("shades only the trained region emerald, leaving everything else zinc", () => {
    const { container } = render(<SessionMuscleThumbnail muscleGroups={["pecho"]} />);

    const shaded = container.querySelectorAll("polygon.fill-emerald-300");
    const inert = container.querySelectorAll("polygon.fill-zinc-800");
    expect(shaded.length).toBeGreaterThan(0);
    expect(inert.length).toBeGreaterThan(0);
  });
});
