"use client";

import { useState } from "react";

import { buildLinePath, padDomain, scaleLinear } from "@/lib/chart-svg";

export type DualLineChartPoint = {
  timestampMs: number;
  dateLabel: string;
  left: { value: number; valueLabel: string } | null;
  right: { value: number; valueLabel: string } | null;
};

const VIEW_WIDTH = 300;
const VIEW_HEIGHT = 150;
const PADDING = { top: 26, right: 12, bottom: 22, left: 12 };
const PLOT_LEFT = PADDING.left;
const PLOT_RIGHT = VIEW_WIDTH - PADDING.right;
const PLOT_TOP = PADDING.top;
const PLOT_BOTTOM = VIEW_HEIGHT - PADDING.bottom;

// emerald = left, violet = right — this app's existing brand accent plus one
// new hue, chosen and validated (CVD ΔE 12.3, normal-vision ΔE 21.1 on the
// dark card surface) over amber/sky/rose because those already carry
// warning/info/error meaning elsewhere in this app (session-runner.tsx,
// form-status-banner.tsx) — reusing them here would collide with that
// existing status vocabulary. Both are the same "-300" family as the rest of
// the app's palette, so they sit lighter than a from-scratch categorical
// ramp would; CVD/normal-vision separation (the checks that actually decide
// distinguishability) clear with a wide margin regardless.
const LEFT_COLOR = { stroke: "stroke-emerald-300", fill: "fill-emerald-300", text: "fill-emerald-300" };
const RIGHT_COLOR = { stroke: "stroke-violet-300", fill: "fill-violet-300", text: "fill-violet-300" };

/**
 * A two-series line chart for unilateral exercises: left vs right on one
 * shared value axis (never dual-axis — same unit both sides), sharing a
 * single crosshair-style tap target per date so one tooltip shows both
 * sides at once. A legend is always shown (required for >=2 series).
 */
export function DualLineChart({ points, ariaLabel }: { points: DualLineChartPoint[]; ariaLabel: string }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (points.length === 0) {
    return null;
  }

  const xDomain = padDomain([points[0]!.timestampMs, points[points.length - 1]!.timestampMs], points.length > 1 ? 0.05 : 0);
  const xScale = scaleLinear(xDomain, [PLOT_LEFT, PLOT_RIGHT]);
  const pxAt = (index: number) => (points.length > 1 ? xScale(points[index]!.timestampMs) : (PLOT_LEFT + PLOT_RIGHT) / 2);

  const allValues = points.flatMap((point) => [point.left?.value, point.right?.value]).filter((value): value is number => value !== undefined && value !== null);
  const yDomain = padDomain([Math.min(...allValues), Math.max(...allValues)], 0.2);
  const yScale = scaleLinear(yDomain, [PLOT_BOTTOM, PLOT_TOP]);

  const leftDots = points.map((point, index) => (point.left ? { index, px: pxAt(index), py: yScale(point.left.value), ...point.left } : null)).filter((dot) => dot !== null);
  const rightDots = points.map((point, index) => (point.right ? { index, px: pxAt(index), py: yScale(point.right.value), ...point.right } : null)).filter((dot) => dot !== null);

  const leftPath = leftDots.length > 1 ? buildLinePath(leftDots.map((dot) => ({ x: dot.px, y: dot.py }))) : null;
  const rightPath = rightDots.length > 1 ? buildLinePath(rightDots.map((dot) => ({ x: dot.px, y: dot.py }))) : null;

  const lastLeft = leftDots[leftDots.length - 1] ?? null;
  const lastRight = rightDots[rightDots.length - 1] ?? null;

  const active = activeIndex !== null ? points[activeIndex] : null;
  const activePx = activeIndex !== null ? pxAt(activeIndex) : 0;
  const tooltipLeftPercent = Math.min(88, Math.max(12, (activePx / VIEW_WIDTH) * 100));

  const summary = `${ariaLabel}. ${points.length} ${points.length === 1 ? "punto" : "puntos"}. Izquierda: ${leftDots
    .map((dot) => `${dot.valueLabel} (${points[dot.index]!.dateLabel})`)
    .join(", ") || "sin datos"}. Derecha: ${
    rightDots.map((dot) => `${dot.valueLabel} (${points[dot.index]!.dateLabel})`).join(", ") || "sin datos"
  }.`;

  return (
    <div className="relative">
      <div className="mb-2 flex items-center gap-4 text-xs text-zinc-300">
        <span className="flex items-center gap-1.5">
          <span className={`inline-block h-0.5 w-4 ${LEFT_COLOR.stroke.replace("stroke-", "bg-")}`} /> Izquierda
        </span>
        <span className="flex items-center gap-1.5">
          <span className={`inline-block h-0.5 w-4 ${RIGHT_COLOR.stroke.replace("stroke-", "bg-")}`} /> Derecha
        </span>
      </div>
      <svg viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} role="img" aria-label={summary} className="h-auto w-full touch-none">
        {active ? <line x1={activePx} x2={activePx} y1={PLOT_TOP} y2={PLOT_BOTTOM} className="stroke-zinc-800" strokeWidth={1} /> : null}

        {leftPath ? <path d={leftPath} fill="none" className={LEFT_COLOR.stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /> : null}
        {rightPath ? <path d={rightPath} fill="none" className={RIGHT_COLOR.stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /> : null}

        {leftDots.map((dot) => (
          <circle key={`l-${dot.index}`} cx={dot.px} cy={dot.py} r={dot.index === activeIndex ? 5 : 4} className={`${LEFT_COLOR.fill} stroke-zinc-900`} strokeWidth={2} />
        ))}
        {rightDots.map((dot) => (
          <circle key={`r-${dot.index}`} cx={dot.px} cy={dot.py} r={dot.index === activeIndex ? 5 : 4} className={`${RIGHT_COLOR.fill} stroke-zinc-900`} strokeWidth={2} />
        ))}

        {points.map((_, index) => (
          <rect
            key={`hit-${index}`}
            x={pxAt(index) - Math.max(10, (PLOT_RIGHT - PLOT_LEFT) / Math.max(points.length, 1) / 2)}
            y={PLOT_TOP}
            width={Math.max(20, (PLOT_RIGHT - PLOT_LEFT) / Math.max(points.length, 1))}
            height={PLOT_BOTTOM - PLOT_TOP}
            fill="transparent"
            onPointerDown={() => setActiveIndex(index)}
          />
        ))}

        {lastLeft ? (
          <text x={lastLeft.px} y={Math.max(PLOT_TOP, lastLeft.py - 8)} textAnchor="end" fontSize={11} fontWeight={600} className={LEFT_COLOR.text}>
            {lastLeft.valueLabel}
          </text>
        ) : null}
        {lastRight ? (
          <text x={lastRight.px} y={Math.min(PLOT_BOTTOM - 4, lastRight.py + 16)} textAnchor="end" fontSize={11} fontWeight={600} className={RIGHT_COLOR.text}>
            {lastRight.valueLabel}
          </text>
        ) : null}

        <text x={PLOT_LEFT} y={VIEW_HEIGHT - 6} fontSize={10} className="fill-zinc-400">
          {points[0]!.dateLabel}
        </text>
        {points.length > 1 ? (
          <text x={PLOT_RIGHT} y={VIEW_HEIGHT - 6} textAnchor="end" fontSize={10} className="fill-zinc-400">
            {points[points.length - 1]!.dateLabel}
          </text>
        ) : null}
      </svg>
      {active ? (
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-lg bg-zinc-800 px-2 py-1 text-xs whitespace-nowrap ring-1 ring-zinc-700"
          style={{ left: `${tooltipLeftPercent}%` }}
        >
          <p className="text-zinc-400">{active.dateLabel}</p>
          {active.left ? (
            <p className="font-semibold text-emerald-300">Izq: {active.left.valueLabel}</p>
          ) : null}
          {active.right ? (
            <p className="font-semibold text-violet-300">Der: {active.right.valueLabel}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
