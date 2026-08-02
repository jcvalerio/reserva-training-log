import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { MeasurementSeriesPoint } from "@/measurements/measurement-series";
import type { BodyMeasurementTrend } from "@/measurements/measurement-trend";
import type { ConsistencySummary } from "@/workouts/consistency";
import type { ExerciseSeriesGroup } from "@/workouts/exercise-series";
import type { ExerciseImprovement, ExerciseImprovementRow } from "@/workouts/improvement";
import type { PlanSessionTemplate } from "@/plans/plan-repository";
import type { WorkoutSession } from "@/workouts/workout-repository";

import { ProgresoPageContent } from "./progreso-page-content";

function buildImprovement(overrides: Partial<ExerciseImprovement> = {}): ExerciseImprovement {
  return {
    improved: false,
    signals: [],
    latestVolumeLoadKg: 800,
    previousVolumeLoadKg: 800,
    latestMaxPain: 0,
    previousMaxPain: 0,
    latestAvgWeightKg: 80,
    previousAvgWeightKg: 80,
    latestAvgReps: 10,
    previousAvgReps: 10,
    latestEstimated1RmKg: null,
    previousEstimated1RmKg: null,
    latestAsymmetryGapKg: null,
    previousAsymmetryGapKg: null,
    ...overrides,
  };
}

function buildTemplate(overrides: Partial<PlanSessionTemplate> = {}): PlanSessionTemplate {
  return {
    id: "template-1",
    workoutPlanId: "plan-1",
    weekNumber: 1,
    dayIndex: 1,
    nameEs: "Pierna — cuádriceps",
    nameEn: null,
    focus: "Cuádriceps y pantorrilla",
    estimatedDurationMinutes: 60,
    mobilityNotesEs: "Movilidad.",
    ...overrides,
  };
}

function buildSession(overrides: Partial<WorkoutSession> = {}): WorkoutSession {
  return {
    id: "session-1",
    athleteProfileId: "profile-1",
    workoutPlanId: "plan-1",
    planSessionTemplateId: "template-1",
    status: "completed",
    startedAt: new Date("2026-07-20T12:00:00Z"),
    completedAt: new Date("2026-07-20T13:00:00Z"),
    notes: null,
    sessionRpe: null,
    createdAt: new Date("2026-07-20T12:00:00Z"),
    updatedAt: new Date("2026-07-20T13:00:00Z"),
    ...overrides,
  };
}

type Props = React.ComponentProps<typeof ProgresoPageContent>;

function renderPage(overrides: Partial<Props> = {}) {
  const defaults: Props = {
    hasProfile: true,
    improvements: [],
    completedSessions: [{ session: buildSession(), template: buildTemplate() }],
    bodyMeasurementTrend: null,
    measurementSeries: [],
    exerciseSeriesGroups: [],
    defaultExerciseName: null,
    consistencySummary: null,
  };
  return render(<ProgresoPageContent {...defaults} {...overrides} />);
}

describe("ProgresoPageContent", () => {
  it("shows an empty state pointing to /entrenar when there is no history", () => {
    renderPage({ completedSessions: [] });

    expect(screen.getByRole("heading", { name: "Todavía no hay historial" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Ir a Entrenar" })).toHaveAttribute("href", "/entrenar");
  });

  it("shows an empty state when there is no profile yet", () => {
    renderPage({ hasProfile: false, completedSessions: [] });

    expect(screen.getByRole("heading", { name: "Todavía no hay historial" })).toBeVisible();
  });

  it("lists completed sessions linking to their read-only session view", () => {
    renderPage();

    expect(screen.getByRole("link", { name: /Pierna — cuádriceps/ })).toHaveAttribute("href", "/entrenar/session-1");
    expect(screen.getByText(/Día 1/)).toBeVisible();
    // startedAt 12:00, completedAt 13:00 in the fixture.
    expect(screen.getByText(/60 min/)).toBeVisible();
    expect(
      screen.getByText("Registra el mismo ejercicio en dos sesiones completadas para ver comparaciones aquí."),
    ).toBeVisible();
  });

  it("shows per-session training load and a Carga KPI tile when RPE was logged", () => {
    renderPage({ completedSessions: [{ session: buildSession({ sessionRpe: 7 }), template: buildTemplate() }] }); // 60min * 7 = 420 UA

    expect(screen.getAllByText(/420 UA/)[0]).toBeVisible();
    expect(screen.getByText("420")).toBeVisible(); // Carga KPI tile value
  });

  it("shows a dash in the Carga KPI tile when no session has an RPE", () => {
    renderPage({ completedSessions: [{ session: buildSession({ sessionRpe: null }), template: buildTemplate() }] });

    expect(screen.queryByText(/\d+ UA/)).toBeNull(); // no per-session load line either
    const kpiTiles = screen.getAllByText("—");
    expect(kpiTiles.length).toBeGreaterThan(0); // Carga KPI tile falls back to a dash
  });

  it("shows the Mejorando KPI tile as a fraction of improved exercises", () => {
    const improvements: ExerciseImprovementRow[] = [
      { exerciseNameEs: "A", latestCompletedAt: null, improvement: buildImprovement({ improved: true }) },
      { exerciseNameEs: "B", latestCompletedAt: null, improvement: buildImprovement({ improved: false }) },
    ];

    renderPage({ improvements });

    expect(screen.getByText("1/2")).toBeVisible();
  });

  it("shows the Esta semana KPI tile from the consistency summary", () => {
    const consistencySummary: ConsistencySummary = {
      weeks: [{ weekStartDate: new Date("2026-07-20T00:00:00"), daysTrained: 3 }],
      targetDaysPerWeek: 5,
      currentWeekDaysTrained: 3,
    };

    renderPage({ consistencySummary });

    expect(screen.getByText("3/5")).toBeVisible();
  });

  it("shows an improved badge and matching signals for an exercise that improved", () => {
    const improvements: ExerciseImprovementRow[] = [
      {
        exerciseNameEs: "Prensa de piernas",
        latestCompletedAt: new Date("2026-07-27T12:00:00Z"),
        improvement: buildImprovement({
          improved: true,
          signals: ["volume_load"],
          latestVolumeLoadKg: 840,
          previousVolumeLoadKg: 800,
          latestAvgWeightKg: 84,
          previousAvgWeightKg: 80,
        }),
      },
    ];

    renderPage({ improvements });

    expect(screen.getByText("Prensa de piernas")).toBeVisible();
    expect(screen.getByText("Mejora ≥5%")).toBeVisible();
    expect(screen.getByText("Volumen +5%")).toBeVisible();
    expect(screen.getByText(/Peso prom: 80kg → 84kg/)).toBeVisible();
  });

  it("shows a neutral badge and no signal chips for an exercise with no 5% change", () => {
    const improvements: ExerciseImprovementRow[] = [
      {
        exerciseNameEs: "Prensa de piernas",
        latestCompletedAt: new Date("2026-07-27T12:00:00Z"),
        improvement: buildImprovement({ latestVolumeLoadKg: 805, previousVolumeLoadKg: 800 }),
      },
    ];

    renderPage({ improvements });

    expect(screen.getByText("Sin cambio de 5%")).toBeVisible();
    expect(screen.queryByText("Volumen +5%")).toBeNull();
  });

  it("shows the body measurement trend and chart when there is more than one measurement", () => {
    const bodyMeasurementTrend: BodyMeasurementTrend = {
      measurementCount: 3,
      firstMeasuredAt: new Date("2026-06-01T12:00:00Z"),
      latestMeasuredAt: new Date("2026-07-20T12:00:00Z"),
      bodyWeightKg: { firstValue: 82, latestValue: 78.5, deltaValue: -3.5 },
      waistCm: { firstValue: 90, latestValue: 88, deltaValue: -2 },
      chestCm: null,
      hipsCm: null,
      latestThighGapCm: 1.5,
      latestCalfGapCm: null,
      thighGapImproved: true,
      calfGapImproved: null,
    };
    const measurementSeries: MeasurementSeriesPoint[] = [
      { measuredAt: new Date("2026-06-01T12:00:00Z"), bodyWeightKg: 82, waistCm: 90 },
      { measuredAt: new Date("2026-07-20T12:00:00Z"), bodyWeightKg: 78.5, waistCm: 88 },
    ];

    renderPage({ bodyMeasurementTrend, measurementSeries });

    expect(screen.getByText("Tendencia corporal")).toBeVisible();
    expect(screen.getByText(/Peso: 82\.0kg → 78\.5kg \(-3\.5kg\)/)).toBeVisible();
    expect(screen.getByText(/Cintura: 90\.0cm → 88\.0cm \(-2\.0cm\)/)).toBeVisible();
    expect(screen.getByText(/Muslo: \+1\.5cm \(mejoró vs\. la anterior\)/)).toBeVisible();
    expect(screen.getByText(/Pantorrilla: —/)).toBeVisible();
    expect(screen.getByRole("link", { name: "Ver mediciones" })).toHaveAttribute("href", "/mediciones");
  });

  it("shows a single-measurement message instead of a trend or chart when there's only one entry", () => {
    const bodyMeasurementTrend: BodyMeasurementTrend = {
      measurementCount: 1,
      firstMeasuredAt: new Date("2026-07-20T12:00:00Z"),
      latestMeasuredAt: new Date("2026-07-20T12:00:00Z"),
      bodyWeightKg: { firstValue: 82, latestValue: 82, deltaValue: 0 },
      waistCm: null,
      chestCm: null,
      hipsCm: null,
      latestThighGapCm: null,
      latestCalfGapCm: null,
      thighGapImproved: null,
      calfGapImproved: null,
    };

    renderPage({
      bodyMeasurementTrend,
      measurementSeries: [{ measuredAt: new Date("2026-07-20T12:00:00Z"), bodyWeightKg: 82, waistCm: null }],
    });

    expect(screen.getByText(/1 medición registrada/)).toBeVisible();
    expect(screen.queryByText(/Peso: /)).toBeNull();
  });

  it("hides the body trend section entirely when there are no measurements", () => {
    renderPage();

    expect(screen.queryByText("Tendencia corporal")).toBeNull();
  });

  it("shows the exercise progression chart section when there is at least one exercise series", () => {
    const exerciseSeriesGroups: ExerciseSeriesGroup[] = [
      {
        exerciseNameEs: "Prensa de piernas",
        isUnilateral: false,
        points: [
          {
            completedAt: new Date("2026-07-20T12:00:00Z"),
            avgWeightKg: 80,
            volumeLoadKg: 800,
            leftAvgWeightKg: null,
            rightAvgWeightKg: null,
            leftVolumeLoadKg: null,
            rightVolumeLoadKg: null,
            leftAvgRir: null,
            rightAvgRir: null,
          },
        ],
      },
    ];

    renderPage({ exerciseSeriesGroups, defaultExerciseName: "Prensa de piernas" });

    expect(screen.getByText("Progresión por ejercicio")).toBeVisible();
    expect(screen.getByRole("combobox")).toHaveValue("Prensa de piernas");
  });

  it("hides the exercise progression chart section when there is no exercise series", () => {
    renderPage();

    expect(screen.queryByText("Progresión por ejercicio")).toBeNull();
  });

  it("shows the consistency chart section when a consistency summary is provided", () => {
    const consistencySummary: ConsistencySummary = {
      weeks: [{ weekStartDate: new Date("2026-07-20T00:00:00"), daysTrained: 3 }],
      targetDaysPerWeek: 5,
      currentWeekDaysTrained: 3,
    };

    renderPage({ consistencySummary });

    expect(screen.getByText("Consistencia semanal")).toBeVisible();
  });
});
