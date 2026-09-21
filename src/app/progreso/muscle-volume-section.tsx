"use client";

import { useId, useState } from "react";
import { ChevronDown, X } from "lucide-react";

import { muscleGroupLabelsEs, muscleGroups, type MuscleGroup } from "@/training/muscle-taxonomy";
import type { ExerciseSeriesGroup } from "@/workouts/exercise-series";
import { UNCLASSIFIED_BUCKET, type MuscleVolumeSummary, type VolumeViewKey } from "@/workouts/muscle-volume";

import { BodyMap } from "./body-map";
import { MuscleVolumeChart } from "./muscle-volume-chart";
import { ExerciseProgressionChart } from "./exercise-progression-chart";

// Owns the period selection for the whole "Series por grupo muscular" section.
//
// The state lives here rather than inside MuscleVolumeChart so the body map
// shades to the same period as the bars. Two panels on one screen disagreeing
// about which weeks they cover would be worse than having no selector at all.

export function MuscleVolumeSection({ summary, exerciseGroups = [] }: {
  summary: MuscleVolumeSummary;
  exerciseGroups?: ExerciseSeriesGroup[];
}) {
  const [viewKey, setViewKey] = useState<VolumeViewKey>("week");
  const [selected, setSelected] = useState<MuscleGroup | typeof UNCLASSIFIED_BUCKET | null>(null);
  const [openExercise, setOpenExercise] = useState<string | null>(null);
  const selectorId = useId();
  const selectMuscle = (muscle: typeof selected) => {
    setSelected(muscle);
    setOpenExercise(null);
  };
  const relatedExercises = exerciseGroups.filter((group) => selected === UNCLASSIFIED_BUCKET
    ? group.primaryMuscleGroup === null && !group.isClassified
    : selected !== null && (group.primaryMuscleGroup === selected || group.secondaryMuscleGroups?.includes(selected)));

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
        <div className="grid auto-cols-fr grid-flow-col gap-1 rounded-lg bg-zinc-900 p-1 text-xs" role="group" aria-label="Periodo">
          {availableViews.map((view) => (
            <button
              key={view.key}
              type="button"
              onClick={() => setViewKey(view.key)}
              aria-pressed={activeView.key === view.key}
              className={`min-h-12 min-w-0 rounded-md px-1 py-1 font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 ${
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
        <BodyMap view={activeView} selectedMuscle={selected === UNCLASSIFIED_BUCKET ? null : selected} onSelectMuscle={selectMuscle} />
      </div>

      <div className="mt-2 flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor={selectorId} className="block text-xs font-semibold text-zinc-300">Grupo muscular</label>
          <select id={selectorId} value={selected ?? ""}
            onChange={(event) => selectMuscle(event.target.value === "" ? null : event.target.value as NonNullable<typeof selected>)}
            className="mt-1 min-h-11 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-sm text-zinc-100 focus-visible:ring-2 focus-visible:ring-emerald-300">
            <option value="">Todos los grupos</option>
            {muscleGroups.map((group) => <option key={group} value={group}>{muscleGroupLabelsEs[group]}</option>)}
            <option value={UNCLASSIFIED_BUCKET}>Sin clasificar</option>
          </select>
        </div>
        {selected ? <button type="button" onClick={() => selectMuscle(null)} aria-label="Quitar filtro" title="Quitar filtro"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-zinc-300 focus-visible:ring-2 focus-visible:ring-emerald-300">
          <X aria-hidden="true" className="h-5 w-5" />
        </button> : null}
      </div>

      <div className="mt-3 border-t border-zinc-800 pt-3">
        {/* The delta comparison rides on the view, so a period can never be
            rendered against a baseline that doesn't belong to it. */}
        <MuscleVolumeChart view={activeView} selectedGroup={selected} />
      </div>
      {selected ? (
        <section className="mt-4 border-t border-zinc-800 pt-4" aria-label="Ejercicios relacionados">
          <h3 className="text-sm font-semibold text-zinc-100">{selected === UNCLASSIFIED_BUCKET ? "Sin clasificar" : muscleGroupLabelsEs[selected]}</h3>
          <p className="mt-1 text-xs text-zinc-400">Últimas sesiones · todos los periodos</p>
          {relatedExercises.length === 0 ? <p className="mt-3 text-sm text-zinc-400">No hay ejercicios registrados para este grupo.</p> : (
            <ul className="mt-2 divide-y divide-zinc-800">
              {relatedExercises.map((group) => (
                <li key={group.exerciseNameEs}>
                  <button type="button" aria-expanded={openExercise === group.exerciseNameEs}
                    onClick={() => setOpenExercise(openExercise === group.exerciseNameEs ? null : group.exerciseNameEs)}
                    className="flex min-h-11 w-full items-center justify-between gap-3 py-3 text-left text-sm font-semibold text-zinc-100 focus-visible:ring-2 focus-visible:ring-emerald-300">
                    <span className="min-w-0 break-words">{group.exerciseNameEs}</span>
                    <ChevronDown aria-hidden="true" className={`h-4 w-4 shrink-0 ${openExercise === group.exerciseNameEs ? "rotate-180" : ""}`} />
                  </button>
                  {openExercise === group.exerciseNameEs ? <div className="pb-3"><ExerciseProgressionChart group={group} /></div> : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
