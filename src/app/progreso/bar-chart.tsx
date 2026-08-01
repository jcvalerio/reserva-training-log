"use client";

import { useState } from "react";

import { padDomain, scaleLinear } from "@/lib/chart-svg";

export type BarChartBar = {
  key: string;
  label: string;
  value: number;
  valueLabel: string;
  met: boolean;
};

const VIEW_WIDTH = 300;
const VIEW_HEIGHT = 140;
const PADDING = { top: 20, right: 8, bottom: 22, left: 8 };
const PLOT_LEFT = PADDING.left;
const PLOT_RIGHT = VIEW_WIDTH - PADDING.right;
const PLOT_TOP = PADDING.top;
const PLOT_BOTTOM = VIEW_HEIGHT - PADDING.bottom;
const MAX_BAR_WIDTH = 20;
const BAR_RADIUS = 3;

/**
 * A minimal bar chart for weekly consistency: bars capped at 20px thick,
 * rounded data-end/square baseline, emerald for weeks meeting the target,
 * neutral zinc otherwise, a dashed reference line at the target value, and
 * a tap-per-bar tooltip (the bar itself is the hit target).
 */
export function BarChart({
  bars,
  targetValue,
  targetLabel,
  ariaLabel,
}: {
  bars: BarChartBar[];
  targetValue: number;
  targetLabel: string;
  ariaLabel: string;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (bars.length === 0) {
    return null;
  }

  const maxValue = Math.max(targetValue, ...bars.map((bar) => bar.value));
  const yDomain = padDomain([0, maxValue], 0.15);
  const yScale = scaleLinear(yDomain, [PLOT_BOTTOM, PLOT_TOP]);

  const slotWidth = (PLOT_RIGHT - PLOT_LEFT) / bars.length;
  const barWidth = Math.min(MAX_BAR_WIDTH, slotWidth * 0.55);
  const targetY = yScale(targetValue);

  const active = activeIndex !== null ? bars[activeIndex] : null;
  const activeSlotCenter = activeIndex !== null ? PLOT_LEFT + slotWidth * (activeIndex + 0.5) : 0;
  const tooltipLeftPercent = Math.min(88, Math.max(12, (activeSlotCenter / VIEW_WIDTH) * 100));

  const summary = `${ariaLabel}. Meta: ${targetLabel}. ${bars.map((bar) => `${bar.label}: ${bar.valueLabel}`).join(", ")}.`;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} role="img" aria-label={summary} className="h-auto w-full touch-none">
        <line x1={PLOT_LEFT} x2={PLOT_RIGHT} y1={targetY} y2={targetY} className="stroke-zinc-600" strokeWidth={1} strokeDasharray="3 3" />
        <text x={PLOT_LEFT} y={targetY - 4} fontSize={9} className="fill-zinc-400">
          Meta: {targetLabel}
        </text>

        {bars.map((bar, index) => {
          const slotCenter = PLOT_LEFT + slotWidth * (index + 0.5);
          const barHeight = bar.value > 0 ? Math.max(2, PLOT_BOTTOM - yScale(bar.value)) : 0;
          const barY = PLOT_BOTTOM - barHeight;

          return (
            <g key={bar.key}>
              {barHeight > 0 ? (
                <rect
                  x={slotCenter - barWidth / 2}
                  y={barY}
                  width={barWidth}
                  height={barHeight}
                  rx={BAR_RADIUS}
                  className={bar.met ? "fill-emerald-300" : "fill-zinc-700"}
                  opacity={activeIndex === null || activeIndex === index ? 1 : 0.6}
                />
              ) : null}
              <rect
                x={slotCenter - slotWidth / 2}
                y={PLOT_TOP}
                width={slotWidth}
                height={PLOT_BOTTOM - PLOT_TOP}
                fill="transparent"
                onPointerDown={() => setActiveIndex(index)}
              />
              <text x={slotCenter} y={VIEW_HEIGHT - 6} textAnchor="middle" fontSize={9} className="fill-zinc-400">
                {bar.label}
              </text>
            </g>
          );
        })}
      </svg>
      {active ? (
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-lg bg-zinc-800 px-2 py-1 text-xs whitespace-nowrap ring-1 ring-zinc-700"
          style={{ left: `${tooltipLeftPercent}%` }}
        >
          <p className="font-semibold text-zinc-50">{active.valueLabel}</p>
          <p className="text-zinc-400">{active.label}</p>
        </div>
      ) : null}
    </div>
  );
}
