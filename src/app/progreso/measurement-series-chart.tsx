"use client";

import { useState } from "react";

import { formatShortDateEs } from "@/lib/format";
import type { MeasurementSeriesPoint } from "@/measurements/measurement-series";

import { LineChart, type LineChartPoint } from "./line-chart";

type Metric = "bodyWeightKg" | "waistCm";

export function MeasurementSeriesChart({ points }: { points: MeasurementSeriesPoint[] }) {
  const hasWeight = points.some((point) => point.bodyWeightKg !== null);
  const hasWaist = points.some((point) => point.waistCm !== null);
  const [metric, setMetric] = useState<Metric>(hasWeight ? "bodyWeightKg" : "waistCm");

  if (!hasWeight && !hasWaist) {
    return null;
  }

  const chartPoints: LineChartPoint[] = points
    .filter((point) => point[metric] !== null)
    .map((point) => {
      const value = point[metric]!;
      return {
        timestampMs: point.measuredAt.getTime(),
        value,
        dateLabel: formatShortDateEs(point.measuredAt),
        valueLabel: metric === "bodyWeightKg" ? `${value}kg` : `${value}cm`,
      };
    });

  if (chartPoints.length === 0) {
    return null;
  }

  return (
    <div>
      {hasWeight && hasWaist ? (
        <div className="mb-3 flex gap-1 text-xs">
          <button
            type="button"
            onClick={() => setMetric("bodyWeightKg")}
            className={`min-h-11 rounded-full px-3 font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 ${
              metric === "bodyWeightKg" ? "bg-emerald-300 text-zinc-950" : "bg-zinc-800 text-zinc-300"
            }`}
          >
            Peso
          </button>
          <button
            type="button"
            onClick={() => setMetric("waistCm")}
            className={`min-h-11 rounded-full px-3 font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 ${
              metric === "waistCm" ? "bg-emerald-300 text-zinc-950" : "bg-zinc-800 text-zinc-300"
            }`}
          >
            Cintura
          </button>
        </div>
      ) : null}
      <LineChart points={chartPoints} ariaLabel={metric === "bodyWeightKg" ? "Peso corporal" : "Cintura"} />
    </div>
  );
}
