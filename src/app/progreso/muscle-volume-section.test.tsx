import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ExerciseSeriesGroup } from "@/workouts/exercise-series";
import type { MuscleVolumeSummary, VolumeView } from "@/workouts/muscle-volume";

import { MuscleVolumeSection } from "./muscle-volume-section";

const view: VolumeView = {
  key: "week", labelEs: "Esta semana", weeksCounted: 0, isAverage: false, comparison: null,
  byMuscleGroup: [
    { muscleGroup: "pecho", effectiveSets: 4, avgRir: null, rirSetCount: 0 },
    { muscleGroup: "triceps", effectiveSets: 2, avgRir: null, rirSetCount: 0 },
  ],
};
const summary: MuscleVolumeSummary = {
  weeks: [], currentWeek: { weekStartDate: new Date("2026-09-07"), byMuscleGroup: view.byMuscleGroup, totalEffectiveSets: 6 },
  previousWeek: null, unclassifiedExerciseNames: [], pushPullRatio: null, quadHamstringRatio: null, painByLocation: [],
  views: [view, { ...view, key: "previous_week", labelEs: "Semana pasada", weeksCounted: 1, byMuscleGroup: [] }],
};
const press: ExerciseSeriesGroup = {
  exerciseNameEs: "Press de banca", primaryMuscleGroup: "pecho", secondaryMuscleGroups: ["triceps"],
  isClassified: true, isUnilateral: false, substitutedForNameEs: null, points: [],
};
const exercises: ExerciseSeriesGroup[] = [press,
  { ...press, exerciseNameEs: "Sentadilla", primaryMuscleGroup: "cuadriceps", secondaryMuscleGroups: [] },
  { ...press, exerciseNameEs: "Ejercicio propio", primaryMuscleGroup: null, secondaryMuscleGroups: [], isClassified: false },
  { ...press, exerciseNameEs: "Cardio", primaryMuscleGroup: null, secondaryMuscleGroups: [], isClassified: true },
];

describe("MuscleVolumeSection muscle filtering", () => {
  it("keeps exercises hidden until selection and matches secondary muscles", () => {
    render(<MuscleVolumeSection summary={summary} exerciseGroups={exercises} />);
    expect(screen.queryByRole("region", { name: "Ejercicios relacionados" })).toBeNull();
    fireEvent.change(screen.getByLabelText("Grupo muscular"), { target: { value: "triceps" } });
    const related = screen.getByRole("region", { name: "Ejercicios relacionados" });
    expect(within(related).getByRole("button", { name: "Press de banca" })).toHaveAttribute("aria-expanded", "false");
    expect(within(related).queryByText("Sentadilla")).toBeNull();
    expect(screen.queryByRole("button", { name: /Pecho/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Quitar filtro" }));
    expect(screen.queryByRole("region", { name: "Ejercicios relacionados" })).toBeNull();
  });

  it("connects map taps to the filter and toggles the same muscle off", () => {
    const { container } = render(<MuscleVolumeSection summary={summary} exerciseGroups={exercises} />);
    const chest = container.querySelector('[data-muscle-group="pecho"]')!;
    fireEvent.click(chest);
    expect(screen.getByLabelText("Grupo muscular")).toHaveValue("pecho");
    expect(screen.getByRole("button", { name: "Press de banca" })).toBeVisible();
    fireEvent.click(chest);
    expect(screen.getByLabelText("Grupo muscular")).toHaveValue("");
  });

  it("preserves muscle selection across periods and labels exercise history separately", () => {
    render(<MuscleVolumeSection summary={summary} exerciseGroups={exercises} />);
    fireEvent.change(screen.getByLabelText("Grupo muscular"), { target: { value: "pecho" } });
    fireEvent.click(screen.getByRole("button", { name: "Semana pasada" }));
    expect(screen.getByLabelText("Grupo muscular")).toHaveValue("pecho");
    expect(screen.getByText("Sin series para este grupo en el periodo.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Press de banca" })).toBeVisible();
    expect(screen.getByText("Últimas sesiones · todos los periodos")).toBeVisible();
  });

  it("includes an unclassified fallback without misclassifying known cardio", () => {
    render(<MuscleVolumeSection summary={summary} exerciseGroups={exercises} />);
    fireEvent.change(screen.getByLabelText("Grupo muscular"), { target: { value: "sin_clasificar" } });
    const related = screen.getByRole("region", { name: "Ejercicios relacionados" });
    expect(within(related).getByRole("button", { name: "Ejercicio propio" })).toBeVisible();
    expect(within(related).queryByText("Cardio")).toBeNull();
    fireEvent.change(screen.getByLabelText("Grupo muscular"), { target: { value: "biceps" } });
    expect(screen.getByText("No hay ejercicios registrados para este grupo.")).toBeVisible();
  });
});
