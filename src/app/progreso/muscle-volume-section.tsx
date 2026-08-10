"use client";

import { useState } from "react";

import type { MuscleVolumeSummary, VolumeViewKey } from "@/workouts/muscle-volume";

import { BodyMap } from "./body-map";
import { MuscleVolumeChart } from "./muscle-volume-chart";

// Owns the period selection for the whole "Series por grupo muscular" section.
//
// The state lives here rather than inside MuscleVolumeChart so the body map
// shades to the same period as the bars. Two panels on one screen disagreeing
// about which weeks they cover would be worse than having no selector at all.

export function MuscleVolumeSection({ summary }: { summary: MuscleVolumeSummary }) {
  const [viewKey, setViewKey] = useState<VolumeViewKey>("week");

  // A view with no weeks behind it (all-time on a brand-new account, or the
  // 4-week window before a second week exists) has nothing to say, so its pill
  // is not offered at all rather than selecting into an empty chart.
  const availableViews = summary.views.filter(
    (view) =>
      view.key === "week" ||
      // "Semana pasada" is offered as soon as any completed week exists, even
      // if last week itself was empty — "you trained nothing last week" is a
      // real answer, and the whole point of this view is being able to ask.
      (view.key === "previous_week" && summary.views.some((other) => other.weeksCounted > 0)) ||
      view.weeksCounted > 0,
  );
  const activeView = availableViews.find((view) => view.key === viewKey) ?? availableViews[0]!;

  return (
    <div>
      {availableViews.length > 1 ? (
        <div className="flex gap-1 text-xs" role="group" aria-label="Periodo">
          {availableViews.map((view) => (
            <button
              key={view.key}
              type="button"
              onClick={() => setViewKey(view.key)}
              aria-pressed={activeView.key === view.key}
              className={`min-h-11 rounded-full px-3 font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 ${
                activeView.key === view.key ? "bg-emerald-300 text-zinc-950" : "bg-zinc-800 text-zinc-300"
              }`}
            >
              {view.labelEs}
            </button>
          ))}
        </div>
      ) : null}

      <p className="mt-2 text-xs leading-5 text-zinc-400">
        {activeView.isAverage
          ? `Promedio por semana · ${activeView.weeksCounted} ${
              activeView.weeksCounted === 1 ? "semana completa" : "semanas completas"
            }`
          : activeView.key === "previous_week"
            ? "Semana completa anterior"
            : "Semana en curso"}
      </p>

      <div className="mt-3">
        <BodyMap view={activeView} />
      </div>

      <div className="mt-3 border-t border-zinc-800 pt-3">
        {/* The delta comparison rides on the view, so a period can never be
            rendered against a baseline that doesn't belong to it. */}
        <MuscleVolumeChart view={activeView} />
      </div>
    </div>
  );
}
