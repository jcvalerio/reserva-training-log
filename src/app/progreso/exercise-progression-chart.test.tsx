import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ExerciseSeriesGroup } from "@/workouts/exercise-series";

import { ExerciseProgressionChart } from "./exercise-progression-chart";

const groups: ExerciseSeriesGroup[] = [
  {
    exerciseNameEs: "Prensa de piernas",
    isUnilateral: false,
    points: [
      {
        completedAt: new Date("2026-07-13T12:00:00Z"),
        avgWeightKg: 80,
        volumeLoadKg: 1600,
        leftAvgWeightKg: null,
        rightAvgWeightKg: null,
        leftVolumeLoadKg: null,
        rightVolumeLoadKg: null,
        leftAvgRir: null,
        rightAvgRir: null,
      },
      {
        completedAt: new Date("2026-07-20T12:00:00Z"),
        avgWeightKg: 84,
        volumeLoadKg: 1680,
        leftAvgWeightKg: null,
        rightAvgWeightKg: null,
        leftVolumeLoadKg: null,
        rightVolumeLoadKg: null,
        leftAvgRir: null,
        rightAvgRir: null,
      },
    ],
  },
  {
    exerciseNameEs: "Sentadilla",
    isUnilateral: false,
    points: [
      {
        completedAt: new Date("2026-07-20T12:00:00Z"),
        avgWeightKg: 60,
        volumeLoadKg: 600,
        leftAvgWeightKg: null,
        rightAvgWeightKg: null,
        leftVolumeLoadKg: null,
        rightVolumeLoadKg: null,
        leftAvgRir: null,
        rightAvgRir: null,
      },
    ],
  },
  {
    exerciseNameEs: "Prensa unilateral",
    isUnilateral: true,
    points: [
      {
        completedAt: new Date("2026-07-13T12:00:00Z"),
        avgWeightKg: 22.5,
        volumeLoadKg: 900,
        leftAvgWeightKg: 20,
        rightAvgWeightKg: 25,
        leftVolumeLoadKg: 400,
        rightVolumeLoadKg: 500,
        leftAvgRir: 4,
        rightAvgRir: 0,
      },
      {
        completedAt: new Date("2026-07-20T12:00:00Z"),
        avgWeightKg: 23,
        volumeLoadKg: 920,
        leftAvgWeightKg: 21,
        rightAvgWeightKg: 25,
        leftVolumeLoadKg: 420,
        rightVolumeLoadKg: 500,
        leftAvgRir: 3,
        rightAvgRir: 1,
      },
    ],
  },
  {
    exerciseNameEs: "Curl femoral unilateral",
    isUnilateral: true,
    points: [
      {
        completedAt: new Date("2026-07-20T12:00:00Z"),
        avgWeightKg: 15,
        volumeLoadKg: 150,
        leftAvgWeightKg: 15,
        rightAvgWeightKg: null, // only the left side was logged this instance
        leftVolumeLoadKg: 150,
        rightVolumeLoadKg: null,
        leftAvgRir: 2,
        rightAvgRir: null,
      },
    ],
  },
];

describe("ExerciseProgressionChart", () => {
  it("renders the default exercise's weight series by default", () => {
    render(<ExerciseProgressionChart groups={groups} defaultExerciseName="Prensa de piernas" />);

    expect(screen.getByRole("combobox")).toHaveValue("Prensa de piernas");
    expect(screen.getByRole("img").getAttribute("aria-label")).toContain("Peso promedio de Prensa de piernas");
  });

  it("switches to the volume series when the Volumen toggle is clicked", () => {
    render(<ExerciseProgressionChart groups={groups} defaultExerciseName="Prensa de piernas" />);

    fireEvent.click(screen.getByRole("button", { name: "Volumen" }));

    expect(screen.getByRole("img").getAttribute("aria-label")).toContain("Volumen de Prensa de piernas");
  });

  it("switches exercise via the picker and shows the single-instance hint", () => {
    render(<ExerciseProgressionChart groups={groups} defaultExerciseName="Prensa de piernas" />);

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Sentadilla" } });

    expect(screen.getByRole("img").getAttribute("aria-label")).toContain("de Sentadilla");
    expect(screen.getByText("Registra otra sesión de este ejercicio para ver una tendencia.")).toBeVisible();
  });

  it("shows a left/right split chart and unilateral badge for a unilateral exercise", () => {
    render(<ExerciseProgressionChart groups={groups} defaultExerciseName="Prensa unilateral" />);

    expect(screen.getByText(/Ejercicio unilateral/)).toBeVisible();
    expect(screen.getByText("Izquierda")).toBeVisible();
    expect(screen.getByText("Derecha")).toBeVisible();
    expect(screen.getByRole("img", { name: /izquierda vs\. derecha/ })).toBeVisible();
  });

  it("does not show the unilateral badge or split legend for a bilateral exercise", () => {
    render(<ExerciseProgressionChart groups={groups} defaultExerciseName="Prensa de piernas" />);

    expect(screen.queryByText(/Ejercicio unilateral/)).toBeNull();
    expect(screen.queryByText("Izquierda")).toBeNull();
  });

  it("shows the effort-gap chart (left minus right RIR) for a unilateral exercise", () => {
    render(<ExerciseProgressionChart groups={groups} defaultExerciseName="Prensa unilateral" />);

    expect(screen.getByText("Brecha de esfuerzo (RIR izq − der)")).toBeVisible();
    expect(screen.getByRole("img", { name: /izquierda menos derecha/ })).toBeVisible();
  });

  it("does not show an effort-gap section for a bilateral exercise", () => {
    render(<ExerciseProgressionChart groups={groups} defaultExerciseName="Prensa de piernas" />);

    expect(screen.queryByText("Brecha de esfuerzo (RIR izq − der)")).toBeNull();
  });

  it("shows a fallback message instead of a gap chart when no instance has RIR on both sides", () => {
    render(<ExerciseProgressionChart groups={groups} defaultExerciseName="Curl femoral unilateral" />);

    expect(screen.getByText("Brecha de esfuerzo (RIR izq − der)")).toBeVisible();
    expect(
      screen.getByText("Registra RIR en ambos lados en la misma sesión para ver si la brecha de esfuerzo se está cerrando."),
    ).toBeVisible();
  });
});
