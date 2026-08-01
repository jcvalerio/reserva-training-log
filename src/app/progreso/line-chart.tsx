"use client";

import { useRef, useState } from "react";

import { buildLinePath, padDomain, scaleLinear } from "@/lib/chart-svg";

export type LineChartPoint = {
  timestampMs: number;
  value: number;
  dateLabel: string;
  valueLabel: string;
};

const VIEW_WIDTH = 300;
const VIEW_HEIGHT = 140;
const PADDING = { top: 18, right: 12, bottom: 22, left: 12 };
const PLOT_LEFT = PADDING.left;
const PLOT_RIGHT = VIEW_WIDTH - PADDING.right;
const PLOT_TOP = PADDING.top;
const PLOT_BOTTOM = VIEW_HEIGHT - PADDING.bottom;

/**
 * A minimal single-series line chart: 2px line, tap-anywhere crosshair that
 * snaps to the nearest point (mirrors touch, not hover — this app is
 * iPhone-only), and a always-visible endpoint value label. Renders a single
 * dot with no line when there's only one point, rather than hiding —
 * one real logged instance is a real data point, not "no data."
 */
export function LineChart({
  points,
  ariaLabel,
  referenceLine,
}: {
  points: LineChartPoint[];
  ariaLabel: string;
  /** An annotation line (e.g. "0 = equal effort"), not a gridline — dashed, labeled. */
  referenceLine?: { value: number; label: string };
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (points.length === 0) {
    return null;
  }

  const xDomain = padDomain(
    [points[0]!.timestampMs, points[points.length - 1]!.timestampMs],
    points.length > 1 ? 0.05 : 0,
  );
  const values = points.map((point) => point.value);
  if (referenceLine) {
    values.push(referenceLine.value);
  }
  const yDomain = padDomain([Math.min(...values), Math.max(...values)], 0.2);

  const xScale = scaleLinear(xDomain, [PLOT_LEFT, PLOT_RIGHT]);
  const yScale = scaleLinear(yDomain, [PLOT_BOTTOM, PLOT_TOP]);

  const pixelPoints = points.map((point) => ({
    ...point,
    px: points.length > 1 ? xScale(point.timestampMs) : (PLOT_LEFT + PLOT_RIGHT) / 2,
    py: yScale(point.value),
  }));

  const linePath = pixelPoints.length > 1 ? buildLinePath(pixelPoints.map((point) => ({ x: point.px, y: point.py }))) : null;
  const lastPoint = pixelPoints[pixelPoints.length - 1]!;
  const active = activeIndex !== null ? pixelPoints[activeIndex] : null;

  function selectNearestPoint(clientX: number) {
    const svg = svgRef.current;
    if (!svg) {
      return;
    }
    const rect = svg.getBoundingClientRect();
    const fraction = (clientX - rect.left) / rect.width;
    const targetX = PLOT_LEFT + fraction * (PLOT_RIGHT - PLOT_LEFT);

    let nearestIndex = 0;
    let nearestDistance = Infinity;
    pixelPoints.forEach((point, index) => {
      const distance = Math.abs(point.px - targetX);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });
    setActiveIndex(nearestIndex);
  }

  const summary = `${ariaLabel}. ${points.length} ${points.length === 1 ? "punto" : "puntos"}, de ${
    points[0]!.dateLabel
  } (${points[0]!.valueLabel}) a ${lastPoint.dateLabel} (${lastPoint.valueLabel}).`;

  const tooltipLeftPercent = active ? Math.min(88, Math.max(12, (active.px / VIEW_WIDTH) * 100)) : 0;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        role="img"
        aria-label={summary}
        className="h-auto w-full touch-none"
        onPointerDown={(event) => selectNearestPoint(event.clientX)}
        onPointerMove={(event) => {
          if (event.pointerType !== "touch" && event.buttons > 0) {
            selectNearestPoint(event.clientX);
          }
        }}
        onPointerLeave={() => setActiveIndex(null)}
      >
        {referenceLine ? (
          <>
            <line
              x1={PLOT_LEFT}
              x2={PLOT_RIGHT}
              y1={yScale(referenceLine.value)}
              y2={yScale(referenceLine.value)}
              className="stroke-zinc-600"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <text x={PLOT_LEFT} y={yScale(referenceLine.value) - 4} fontSize={9} className="fill-zinc-400">
              {referenceLine.label}
            </text>
          </>
        ) : null}
        {active ? (
          <line x1={active.px} x2={active.px} y1={PLOT_TOP} y2={PLOT_BOTTOM} className="stroke-zinc-800" strokeWidth={1} />
        ) : null}
        {linePath ? (
          <path d={linePath} fill="none" className="stroke-emerald-300" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        ) : null}
        {pixelPoints.map((point, index) => (
          <circle
            key={point.timestampMs}
            cx={point.px}
            cy={point.py}
            r={index === activeIndex ? 5 : 4}
            className="fill-emerald-300 stroke-zinc-900"
            strokeWidth={2}
          />
        ))}
        {pixelPoints.map((point, index) => (
          <circle
            key={`hit-${point.timestampMs}`}
            cx={point.px}
            cy={point.py}
            r={12}
            className="fill-transparent"
            onPointerDown={(event) => {
              event.stopPropagation();
              setActiveIndex(index);
            }}
          />
        ))}
        <text x={lastPoint.px} y={Math.max(PLOT_TOP, lastPoint.py - 10)} textAnchor="end" fontSize={11} fontWeight={600} className="fill-emerald-300">
          {lastPoint.valueLabel}
        </text>
        <text x={PLOT_LEFT} y={VIEW_HEIGHT - 6} fontSize={10} className="fill-zinc-400">
          {pixelPoints[0]!.dateLabel}
        </text>
        {pixelPoints.length > 1 ? (
          <text x={PLOT_RIGHT} y={VIEW_HEIGHT - 6} textAnchor="end" fontSize={10} className="fill-zinc-400">
            {lastPoint.dateLabel}
          </text>
        ) : null}
      </svg>
      {active ? (
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-lg bg-zinc-800 px-2 py-1 text-xs whitespace-nowrap ring-1 ring-zinc-700"
          style={{ left: `${tooltipLeftPercent}%` }}
        >
          <p className="font-semibold text-zinc-50">{active.valueLabel}</p>
          <p className="text-zinc-400">{active.dateLabel}</p>
        </div>
      ) : null}
    </div>
  );
}
