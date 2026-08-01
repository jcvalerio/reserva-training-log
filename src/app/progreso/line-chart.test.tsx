import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LineChart, type LineChartPoint } from "./line-chart";

function buildPoints(count: number): LineChartPoint[] {
  return Array.from({ length: count }, (_, index) => ({
    timestampMs: new Date(`2026-07-${10 + index}T12:00:00Z`).getTime(),
    value: 80 + index,
    dateLabel: `${10 + index}-jul`,
    valueLabel: `${80 + index}kg`,
  }));
}

describe("LineChart", () => {
  it("renders nothing for an empty series", () => {
    const { container } = render(<LineChart points={[]} ariaLabel="Peso" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a single dot (no line) for one point, with an accessible summary", () => {
    render(<LineChart points={buildPoints(1)} ariaLabel="Peso" />);

    const svg = screen.getByRole("img");
    expect(svg.getAttribute("aria-label")).toContain("1 punto");
    expect(svg.querySelector("path")).toBeNull();
    expect(svg.querySelectorAll("circle")).toHaveLength(2); // 1 visible dot + 1 hit target
  });

  it("renders a connecting line and a dot per point for multiple points", () => {
    render(<LineChart points={buildPoints(3)} ariaLabel="Peso" />);

    const svg = screen.getByRole("img");
    expect(svg.getAttribute("aria-label")).toContain("3 puntos");
    expect(svg.querySelector("path")).not.toBeNull();
    expect(svg.querySelectorAll("circle")).toHaveLength(6); // 3 visible dots + 3 hit targets
  });

  it("shows a tooltip for the tapped point", () => {
    render(<LineChart points={buildPoints(3)} ariaLabel="Peso" />);

    const hitTargets = document.querySelectorAll("circle.fill-transparent");
    fireEvent.pointerDown(hitTargets[1]!);

    expect(screen.getByText("81kg")).toBeVisible();
    expect(screen.getByText("11-jul")).toBeVisible();
  });

  it("renders an optional dashed reference line with its label", () => {
    render(<LineChart points={buildPoints(3)} ariaLabel="Brecha" referenceLine={{ value: 0, label: "0 = mismo esfuerzo" }} />);

    const svg = screen.getByRole("img");
    expect(svg.querySelector("line[stroke-dasharray]")).not.toBeNull();
    expect(screen.getByText("0 = mismo esfuerzo")).toBeVisible();
  });

  it("keeps the reference value in view even when every data point is on one side of it", () => {
    // All values are 80-82 (well above 0) — the reference line's dashed
    // stroke should still be present rather than scaled out of the viewBox.
    render(<LineChart points={buildPoints(3)} ariaLabel="Brecha" referenceLine={{ value: 0, label: "0" }} />);

    const line = document.querySelector("line[stroke-dasharray]");
    expect(line).not.toBeNull();
    expect(Number(line!.getAttribute("y1"))).toBeGreaterThan(0);
  });
});
