import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DualLineChart, type DualLineChartPoint } from "./dual-line-chart";

const points: DualLineChartPoint[] = [
  {
    timestampMs: new Date("2026-07-13T12:00:00Z").getTime(),
    dateLabel: "13-jul",
    left: { value: 20, valueLabel: "20kg" },
    right: { value: 22, valueLabel: "22kg" },
  },
  {
    timestampMs: new Date("2026-07-20T12:00:00Z").getTime(),
    dateLabel: "20-jul",
    left: { value: 21, valueLabel: "21kg" },
    right: { value: 25, valueLabel: "25kg" },
  },
];

describe("DualLineChart", () => {
  it("renders nothing for an empty series", () => {
    const { container } = render(<DualLineChart points={[]} ariaLabel="Peso" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("always shows a left/right legend", () => {
    render(<DualLineChart points={points} ariaLabel="Peso" />);

    expect(screen.getByText("Izquierda")).toBeVisible();
    expect(screen.getByText("Derecha")).toBeVisible();
  });

  it("renders one line and one dot per side when both have data at every point", () => {
    render(<DualLineChart points={points} ariaLabel="Peso" />);

    const svg = screen.getByRole("img");
    expect(svg.querySelectorAll("path")).toHaveLength(2); // left + right lines
    expect(svg.querySelectorAll("circle")).toHaveLength(4); // 2 left dots + 2 right dots
  });

  it("only draws the side that has data when the other side is missing for every point", () => {
    const rightOnly: DualLineChartPoint[] = points.map((point) => ({ ...point, left: null }));

    render(<DualLineChart points={rightOnly} ariaLabel="Peso" />);

    const svg = screen.getByRole("img");
    expect(svg.querySelectorAll("path")).toHaveLength(1);
    expect(svg.querySelectorAll("circle")).toHaveLength(2);
  });

  it("shows both sides in one tooltip for the tapped date", () => {
    render(<DualLineChart points={points} ariaLabel="Peso" />);

    const hitTargets = document.querySelectorAll("rect[fill='transparent']");
    fireEvent.pointerDown(hitTargets[0]!);

    expect(screen.getByText("Izq: 20kg")).toBeVisible();
    expect(screen.getByText("Der: 22kg")).toBeVisible();
  });
});
