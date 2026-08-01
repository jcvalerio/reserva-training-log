import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { MeasurementSeriesPoint } from "@/measurements/measurement-series";

import { MeasurementSeriesChart } from "./measurement-series-chart";

describe("MeasurementSeriesChart", () => {
  it("renders nothing when there is no weight or waist data at all", () => {
    const points: MeasurementSeriesPoint[] = [
      { measuredAt: new Date("2026-07-20T12:00:00Z"), bodyWeightKg: null, waistCm: null },
    ];

    const { container } = render(<MeasurementSeriesChart points={points} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("defaults to weight and hides the toggle when only weight data exists", () => {
    const points: MeasurementSeriesPoint[] = [
      { measuredAt: new Date("2026-06-01T12:00:00Z"), bodyWeightKg: 82, waistCm: null },
      { measuredAt: new Date("2026-07-20T12:00:00Z"), bodyWeightKg: 78.5, waistCm: null },
    ];

    render(<MeasurementSeriesChart points={points} />);

    expect(screen.queryByRole("button", { name: "Cintura" })).toBeNull();
    expect(screen.getByRole("img").getAttribute("aria-label")).toContain("Peso corporal");
  });

  it("toggles between weight and waist when both exist", () => {
    const points: MeasurementSeriesPoint[] = [
      { measuredAt: new Date("2026-06-01T12:00:00Z"), bodyWeightKg: 82, waistCm: 90 },
      { measuredAt: new Date("2026-07-20T12:00:00Z"), bodyWeightKg: 78.5, waistCm: 88 },
    ];

    render(<MeasurementSeriesChart points={points} />);

    fireEvent.click(screen.getByRole("button", { name: "Cintura" }));

    expect(screen.getByRole("img").getAttribute("aria-label")).toContain("Cintura");
  });
});
