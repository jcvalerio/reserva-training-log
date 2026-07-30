import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { PlanSessionTemplate } from "@/plans/plan-repository";
import type { ExerciseImprovementRow } from "@/workouts/improvement";
import type { CompletedSessionSummary, WorkoutSession } from "@/workouts/workout-repository";

import { ProgresoPageContent } from "./progreso-page-content";

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
    createdAt: new Date("2026-07-20T12:00:00Z"),
    updatedAt: new Date("2026-07-20T13:00:00Z"),
    ...overrides,
  };
}

describe("ProgresoPageContent", () => {
  it("shows an empty state pointing to /entrenar when there is no history", () => {
    render(<ProgresoPageContent hasProfile={true} improvements={[]} completedSessions={[]} />);

    expect(screen.getByRole("heading", { name: "Todavía no hay historial" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Ir a Entrenar" })).toHaveAttribute("href", "/entrenar");
  });

  it("shows an empty state when there is no profile yet", () => {
    render(<ProgresoPageContent hasProfile={false} improvements={[]} completedSessions={[]} />);

    expect(screen.getByRole("heading", { name: "Todavía no hay historial" })).toBeVisible();
  });

  it("lists completed sessions linking to their read-only session view", () => {
    const completedSessions: CompletedSessionSummary[] = [
      { session: buildSession(), template: buildTemplate() },
    ];

    render(<ProgresoPageContent hasProfile={true} improvements={[]} completedSessions={completedSessions} />);

    expect(screen.getByRole("link", { name: /Pierna — cuádriceps/ })).toHaveAttribute("href", "/entrenar/session-1");
    expect(screen.getByText(/Semana 1 · Día 1/)).toBeVisible();
    expect(
      screen.getByText("Registra el mismo ejercicio en dos sesiones completadas para ver comparaciones aquí."),
    ).toBeVisible();
  });

  it("shows an improved badge and matching signals for an exercise that improved", () => {
    const improvements: ExerciseImprovementRow[] = [
      {
        exerciseNameEs: "Prensa de piernas",
        latestCompletedAt: new Date("2026-07-27T12:00:00Z"),
        improvement: {
          improved: true,
          signals: ["volume_load"],
          latestVolumeLoadKg: 840,
          previousVolumeLoadKg: 800,
          latestMaxPain: 0,
          previousMaxPain: 0,
        },
      },
    ];
    const completedSessions: CompletedSessionSummary[] = [
      { session: buildSession(), template: buildTemplate() },
    ];

    render(
      <ProgresoPageContent hasProfile={true} improvements={improvements} completedSessions={completedSessions} />,
    );

    expect(screen.getByText("Prensa de piernas")).toBeVisible();
    expect(screen.getByText("Mejora ≥5%")).toBeVisible();
    expect(screen.getByText("Volumen +5%")).toBeVisible();
  });

  it("shows a neutral badge and no signal chips for an exercise with no 5% change", () => {
    const improvements: ExerciseImprovementRow[] = [
      {
        exerciseNameEs: "Prensa de piernas",
        latestCompletedAt: new Date("2026-07-27T12:00:00Z"),
        improvement: {
          improved: false,
          signals: [],
          latestVolumeLoadKg: 805,
          previousVolumeLoadKg: 800,
          latestMaxPain: 0,
          previousMaxPain: 0,
        },
      },
    ];
    const completedSessions: CompletedSessionSummary[] = [
      { session: buildSession(), template: buildTemplate() },
    ];

    render(
      <ProgresoPageContent hasProfile={true} improvements={improvements} completedSessions={completedSessions} />,
    );

    expect(screen.getByText("Sin cambio de 5%")).toBeVisible();
    expect(screen.queryByText("Volumen +5%")).toBeNull();
  });
});
