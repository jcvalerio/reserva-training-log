import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BarChart, type BarChartBar } from "./bar-chart";

const bars: BarChartBar[] = [
  { key: "w1", label: "S1", value: 2, valueLabel: "2 días", met: false },
  { key: "w2", label: "S2", value: 5, valueLabel: "5 días", met: true },
  { key: "w3", label: "S3", value: 0, valueLabel: "0 días", met: false },
];

describe("BarChart", () => {
  it("renders nothing for an empty bar list", () => {
    const { container } = render(<BarChart bars={[]} targetValue={5} targetLabel="5 días" ariaLabel="Consistencia" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders one bar rect per non-zero value bar, and a target reference line", () => {
    render(<BarChart bars={bars} targetValue={5} targetLabel="5 días" ariaLabel="Consistencia" />);

    const svg = screen.getByRole("img");
    expect(svg.getAttribute("aria-label")).toContain("Meta: 5 días");
    // 2 visible bars (w1, w2) + 1 dashed target line, all <line>/<rect> mixed —
    // check the visible-bar rects specifically via their fill classes.
    expect(document.querySelectorAll("rect.fill-emerald-300, rect.fill-zinc-700")).toHaveLength(2);
  });

  it("shows a tooltip for the tapped bar, including a zero-value week", () => {
    render(<BarChart bars={bars} targetValue={5} targetLabel="5 días" ariaLabel="Consistencia" />);

    const hitTargets = document.querySelectorAll("rect[fill='transparent']");
    fireEvent.pointerDown(hitTargets[2]!); // the zero-value week

    expect(screen.getByText("0 días")).toBeVisible();
  });
});
