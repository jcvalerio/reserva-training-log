import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { BodyMeasurementTrend } from "@/measurements/measurement-trend";
import type { PlanSessionTemplate } from "@/plans/plan-repository";
import type { ExerciseImprovement, ExerciseImprovementRow } from "@/workouts/improvement";
import type { CompletedSessionSummary, WorkoutSession } from "@/workouts/workout-repository";

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

describe("ProgresoPageContent", () => {
  it("shows an empty state pointing to /entrenar when there is no history", () => {
    render(<ProgresoPageContent hasProfile={true} improvements={[]} completedSessions={[]} bodyMeasurementTrend={null} />);

    expect(screen.getByRole("heading", { name: "Todavía no hay historial" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Ir a Entrenar" })).toHaveAttribute("href", "/entrenar");
  });

  it("shows an empty state when there is no profile yet", () => {
    render(<ProgresoPageContent hasProfile={false} improvements={[]} completedSessions={[]} bodyMeasurementTrend={null} />);

    expect(screen.getByRole("heading", { name: "Todavía no hay historial" })).toBeVisible();
  });

  it("lists completed sessions linking to their read-only session view", () => {
    const completedSessions: CompletedSessionSummary[] = [
      { session: buildSession(), template: buildTemplate() },
    ];

    render(<ProgresoPageContent hasProfile={true} improvements={[]} completedSessions={completedSessions} bodyMeasurementTrend={null} />);

    expect(screen.getByRole("link", { name: /Pierna — cuádriceps/ })).toHaveAttribute("href", "/entrenar/session-1");
    expect(screen.getByText(/Día 1/)).toBeVisible();
    // startedAt 12:00, completedAt 13:00 in the fixture.
    expect(screen.getByText(/60 min/)).toBeVisible();
    expect(
      screen.getByText("Registra el mismo ejercicio en dos sesiones completadas para ver comparaciones aquí."),
    ).toBeVisible();
  });

  it("shows per-session training load and a recent-average summary when RPE was logged", () => {
    const completedSessions: CompletedSessionSummary[] = [
      { session: buildSession({ sessionRpe: 7 }), template: buildTemplate() }, // 60min * 7 = 420 UA
    ];

    render(
      <ProgresoPageContent
        hasProfile={true}
        improvements={[]}
        completedSessions={completedSessions}
        bodyMeasurementTrend={null}
      />,
    );

    expect(screen.getAllByText(/420 UA/)[0]).toBeVisible();
    expect(screen.getByText(/Carga promedio \(últimas sesiones\): 420 UA/)).toBeVisible();
  });

  it("omits the training-load summary entirely when no session has an RPE", () => {
    const completedSessions: CompletedSessionSummary[] = [
      { session: buildSession({ sessionRpe: null }), template: buildTemplate() },
    ];

    render(
      <ProgresoPageContent
        hasProfile={true}
        improvements={[]}
        completedSessions={completedSessions}
        bodyMeasurementTrend={null}
      />,
    );

    expect(screen.queryByText(/UA/)).toBeNull();
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
    const completedSessions: CompletedSessionSummary[] = [
      { session: buildSession(), template: buildTemplate() },
    ];

    render(
      <ProgresoPageContent hasProfile={true} improvements={improvements} completedSessions={completedSessions} bodyMeasurementTrend={null} />,
    );

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
    const completedSessions: CompletedSessionSummary[] = [
      { session: buildSession(), template: buildTemplate() },
    ];

    render(
      <ProgresoPageContent hasProfile={true} improvements={improvements} completedSessions={completedSessions} bodyMeasurementTrend={null} />,
    );

    expect(screen.getByText("Sin cambio de 5%")).toBeVisible();
    expect(screen.queryByText("Volumen +5%")).toBeNull();
  });

  it("shows the body measurement trend when there is more than one measurement", () => {
    const completedSessions: CompletedSessionSummary[] = [
      { session: buildSession(), template: buildTemplate() },
    ];
    const bodyMeasurementTrend: BodyMeasurementTrend = {
      measurementCount: 3,
      firstMeasuredAt: new Date("2026-06-01T12:00:00Z"),
      latestMeasuredAt: new Date("2026-07-20T12:00:00Z"),
      bodyWeightKg: { firstValue: 82, latestValue: 78.5, deltaValue: -3.5 },
      waistCm: { firstValue: 90, latestValue: 88, deltaValue: -2 },
      latestThighGapCm: 1.5,
      latestCalfGapCm: null,
      thighGapImproved: true,
      calfGapImproved: null,
    };

    render(
      <ProgresoPageContent
        hasProfile={true}
        improvements={[]}
        completedSessions={completedSessions}
        bodyMeasurementTrend={bodyMeasurementTrend}
      />,
    );

    expect(screen.getByText("Tendencia corporal")).toBeVisible();
    expect(screen.getByText(/Peso: 82\.0kg → 78\.5kg \(-3\.5kg\)/)).toBeVisible();
    expect(screen.getByText(/Cintura: 90\.0cm → 88\.0cm \(-2\.0cm\)/)).toBeVisible();
    expect(screen.getByText(/Muslo: \+1\.5cm \(mejoró vs\. la anterior\)/)).toBeVisible();
    expect(screen.getByText(/Pantorrilla: —/)).toBeVisible();
    expect(screen.getByRole("link", { name: "Ver mediciones" })).toHaveAttribute("href", "/mediciones");
  });

  it("shows a single-measurement message instead of a trend when there's only one entry", () => {
    const completedSessions: CompletedSessionSummary[] = [
      { session: buildSession(), template: buildTemplate() },
    ];
    const bodyMeasurementTrend: BodyMeasurementTrend = {
      measurementCount: 1,
      firstMeasuredAt: new Date("2026-07-20T12:00:00Z"),
      latestMeasuredAt: new Date("2026-07-20T12:00:00Z"),
      bodyWeightKg: { firstValue: 82, latestValue: 82, deltaValue: 0 },
      waistCm: null,
      latestThighGapCm: null,
      latestCalfGapCm: null,
      thighGapImproved: null,
      calfGapImproved: null,
    };

    render(
      <ProgresoPageContent
        hasProfile={true}
        improvements={[]}
        completedSessions={completedSessions}
        bodyMeasurementTrend={bodyMeasurementTrend}
      />,
    );

    expect(screen.getByText(/1 medición registrada/)).toBeVisible();
    expect(screen.queryByText(/Peso: /)).toBeNull();
  });

  it("hides the body trend section entirely when there are no measurements", () => {
    const completedSessions: CompletedSessionSummary[] = [
      { session: buildSession(), template: buildTemplate() },
    ];

    render(
      <ProgresoPageContent
        hasProfile={true}
        improvements={[]}
        completedSessions={completedSessions}
        bodyMeasurementTrend={null}
      />,
    );

    expect(screen.queryByText("Tendencia corporal")).toBeNull();
  });
});
