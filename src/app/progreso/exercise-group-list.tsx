"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { formatKg } from "@/lib/format";
import {
  bodyRegions,
  muscleGroupLabelsEs,
  muscleGroups,
  regionForMuscleGroup,
  type MuscleGroup,
} from "@/training/muscle-taxonomy";
import type { ExerciseSeriesGroup } from "@/workouts/exercise-series";

import { ExerciseProgressionChart } from "./exercise-progression-chart";

// Replaces the <select> that used to sit on top of ExerciseProgressionChart.
// The user's complaint was specifically "I have to tap the dropdown to change
// the exercise to see my progress" — the chart behind it was never the
// problem, so it survives untouched as a drill-down.
//
// Mobile UX pass (2026-08-09): rows had zero visual indication they were
// tappable — no chevron, no native <details> marker, nothing. Added a
// lucide-react ChevronDown that rotates open, matching the same fix applied
// to MuscleVolumeChart's rows in this same pass, so both accordions in this
// section read as interactive the same way.

export type ExerciseMuscleGroupSection = {
  key: string;
  labelEs: string;
  exercises: ExerciseSeriesGroup[];
};

/**
 * Groups exercises by muscle group, ordered by region (pierna, empuje, tirón,
 * core) then by the canonical muscle-group order, with unclassified last.
 */
export function buildExerciseMuscleGroupSections(groups: ExerciseSeriesGroup[]): ExerciseMuscleGroupSection[] {
  const regionOrder = ["pierna", "empuje", "tiron", "core"] as const satisfies readonly (typeof bodyRegions)[number][];

  const orderedGroups = [...muscleGroups].sort((a, b) => {
    const regionDelta = regionOrder.indexOf(regionForMuscleGroup(a)) - regionOrder.indexOf(regionForMuscleGroup(b));
    return regionDelta !== 0 ? regionDelta : muscleGroups.indexOf(a) - muscleGroups.indexOf(b);
  });

  const sections: ExerciseMuscleGroupSection[] = [];
  for (const muscleGroup of orderedGroups as MuscleGroup[]) {
    const exercises = groups.filter((group) => group.primaryMuscleGroup === muscleGroup);
    if (exercises.length > 0) {
      sections.push({ key: muscleGroup, labelEs: muscleGroupLabelsEs[muscleGroup], exercises });
    }
  }

  const rest = groups.filter((group) => group.primaryMuscleGroup === null);
  if (rest.length > 0) {
    sections.push({ key: "sin_clasificar", labelEs: "Sin clasificar", exercises: rest });
  }

  return sections;
}

function latestLabel(group: ExerciseSeriesGroup): string {
  const latest = group.points.at(-1);
  return latest ? formatKg(latest.avgWeightKg, 1) : "—";
}

/** Up arrow / down arrow / dash against the previous instance. A single logged
 *  instance — the common case right now — correctly shows nothing. */
function deltaLabel(group: ExerciseSeriesGroup): string | null {
  if (group.points.length < 2) {
    return null;
  }
  const latest = group.points.at(-1)!;
  const previous = group.points.at(-2)!;
  if (latest.avgWeightKg > previous.avgWeightKg) return "▲";
  if (latest.avgWeightKg < previous.avgWeightKg) return "▼";
  return "—";
}

export function ExerciseGroupList({
  groups,
  defaultExerciseName,
}: {
  groups: ExerciseSeriesGroup[];
  defaultExerciseName: string | null;
}) {
  // Accordion rather than expand-all: 20+ charts stacked at 390x844 is a
  // scroll, not a dashboard. Opens on the most recently trained exercise, so
  // the thing you came here to check is already showing.
  const [openName, setOpenName] = useState<string | null>(defaultExerciseName);
  const sections = buildExerciseMuscleGroupSections(groups);

  if (sections.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {sections.map((section) => (
        <section key={section.key} aria-labelledby={`group-${section.key}`}>
          <p
            id={`group-${section.key}`}
            className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400"
          >
            {section.labelEs}
          </p>
          <ul className="mt-1 grid grid-cols-1 gap-0.5">
            {section.exercises.map((group) => {
              const isOpen = openName === group.exerciseNameEs;
              const delta = deltaLabel(group);
              return (
                <li key={group.exerciseNameEs}>
                  <button
                    type="button"
                    onClick={() => setOpenName(isOpen ? null : group.exerciseNameEs)}
                    aria-expanded={isOpen}
                    className="flex min-h-11 w-full items-center gap-2 rounded-lg px-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 active:bg-zinc-800/40"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm leading-6 text-zinc-100">
                        {group.exerciseNameEs}
                      </span>
                      {group.substitutedForNameEs ? (
                        <span className="block truncate text-xs leading-5 text-zinc-400">
                          sustituyó a {group.substitutedForNameEs}
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-sm tabular-nums text-zinc-300">{latestLabel(group)}</span>
                    {delta ? <span className="w-4 shrink-0 text-xs text-zinc-400">{delta}</span> : null}
                    <ChevronDown
                      aria-hidden="true"
                      className={`h-4 w-4 shrink-0 transition-transform duration-150 ${
                        isOpen ? "rotate-180 text-zinc-300" : "text-zinc-500"
                      }`}
                    />
                  </button>
                  {isOpen ? (
                    <div className="mt-1 rounded-xl bg-zinc-950/40 p-2">
                      <ExerciseProgressionChart group={group} />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
