import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ExerciseImprovement } from "@/workouts/improvement";
import { buildMuscleVolumeSummary } from "@/workouts/muscle-volume";
import type { CompletedSessionSummary } from "@/workouts/workout-repository";
import { SessionHistoryContent } from "./historial/session-history-content";
import { ProgresoPageContent } from "./progreso-page-content";

const completed: CompletedSessionSummary = {
  session: {
    id: "session-1", athleteProfileId: "profile-1", workoutPlanId: "plan-1",
    planSessionTemplateId: "template-1", status: "completed",
    startedAt: new Date("2026-07-20T12:00:00Z"), completedAt: new Date("2026-07-20T13:00:00Z"),
    notes: null, sessionRpe: 7,
    createdAt: new Date("2026-07-20T12:00:00Z"), updatedAt: new Date("2026-07-20T13:00:00Z"),
  },
  template: {
    id: "template-1", workoutPlanId: "plan-1", weekNumber: 1, dayIndex: 1,
    nameEs: "Pierna y cuádriceps", nameEn: null, focus: "Cuádriceps",
    estimatedDurationMinutes: 60, mobilityNotesEs: "Movilidad.",
  },
};

function improvement(improved: boolean): ExerciseImprovement {
  return {
    improved, signals: [], latestVolumeLoadKg: 800, previousVolumeLoadKg: 800,
    latestMaxPain: 0, previousMaxPain: 0, latestAvgWeightKg: 80, previousAvgWeightKg: 80,
    latestAvgReps: 10, previousAvgReps: 10, latestEstimated1RmKg: null, previousEstimated1RmKg: null,
    latestAsymmetryGapKg: null, previousAsymmetryGapKg: null,
  };
}

function renderPage(overrides: Partial<React.ComponentProps<typeof ProgresoPageContent>> = {}) {
  return render(<ProgresoPageContent
    hasProfile completedSessions={[completed]} improvements={[]} exerciseSeriesGroups={[]}
    consistencySummary={null} muscleVolumeSummary={null} {...overrides}
  />);
}

describe("Progreso overview", () => {
  it.each([{ hasProfile: false }, { completedSessions: [] }])("provides an empty state: %o", (props) => {
    renderPage(props);
    expect(screen.getByRole("heading", { name: "Todavía no hay historial" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Ir a Entrenar" })).toHaveAttribute("href", "/entrenar");
  });

  it("links to separate history and measurements without listing sessions", () => {
    renderPage();
    expect(screen.getByRole("link", { name: "Historial de sesiones" })).toHaveAttribute("href", "/progreso/historial");
    expect(screen.getByRole("link", { name: "Mediciones y pruebas" })).toHaveAttribute("href", "/mediciones");
    expect(screen.queryByRole("link", { name: /Pierna y cuádriceps/ })).not.toBeInTheDocument();
  });

  it("keeps all three KPIs and weekly consistency", () => {
    renderPage({
      consistencySummary: {
        weeks: [{ weekStartDate: new Date("2026-07-20T00:00:00"), daysTrained: 3 }],
        targetDaysPerWeek: 5, currentWeekDaysTrained: 3,
      },
      improvements: [
        { exerciseNameEs: "A", latestCompletedAt: null, improvement: improvement(true) },
        { exerciseNameEs: "B", latestCompletedAt: null, improvement: improvement(false) },
      ],
    });
    const kpis = within(screen.getByRole("region", { name: "Resumen" }));
    expect(kpis.getByText("3/5")).toBeVisible();
    expect(kpis.getByText("1/2")).toBeVisible();
    expect(kpis.getByText("420")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Consistencia semanal" })).toBeVisible();
  });

  it("does not invent a load when RPE is absent", () => {
    renderPage({ completedSessions: [{ ...completed, session: { ...completed.session, sessionRpe: null } }] });
    expect(screen.getByText("Carga").parentElement).toHaveTextContent("—");
  });

  it("keeps muscle volume without restoring competing overview sections", () => {
    renderPage({ muscleVolumeSummary: buildMuscleVolumeSummary([], { now: new Date("2026-09-09T12:00:00Z") }) });
    expect(screen.getByRole("heading", { name: "Series por grupo muscular" })).toBeVisible();
    for (const label of ["¿Está funcionando?", "Tendencia corporal", "Dónde te ha dolido", "Ejercicios por grupo muscular", "Ejercicios que más mejoraron"]) {
      expect(screen.queryByText(label)).not.toBeInTheDocument();
    }
  });
});

describe("Session history", () => {
  it("preserves session detail links, dates, duration, load and return navigation", () => {
    render(<SessionHistoryContent sessions={[completed]} />);
    expect(screen.getByRole("link", { name: /Pierna y cuádriceps/ })).toHaveAttribute("href", "/entrenar/session-1");
    expect(screen.getByText(/60 min · 420 UA/)).toBeVisible();
    expect(screen.getByRole("link", { name: /Volver a Progreso/ })).toHaveAttribute("href", "/progreso");
  });

  it("reveals older sessions without an unbounded initial list", () => {
    const sessions = Array.from({ length: 13 }, (_, index) => ({
      ...completed, session: { ...completed.session, id: `session-${index}` },
      template: { ...completed.template, nameEs: `Sesión ${index}` },
    }));
    render(<SessionHistoryContent sessions={sessions} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(12);
    expect(screen.queryByRole("link", { name: /Sesión 12/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ver más sesiones" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(13);
    expect(screen.getByRole("link", { name: /Sesión 12/ })).toHaveAttribute("href", "/entrenar/session-12");
    expect(screen.queryByRole("button", { name: "Ver más sesiones" })).not.toBeInTheDocument();
  });

  it("provides a useful destination with no completed sessions", () => {
    render(<SessionHistoryContent sessions={[]} />);
    expect(screen.getByText("0 sesiones completadas")).toBeVisible();
    expect(screen.getByRole("link", { name: "Ir a Entrenar" })).toHaveAttribute("href", "/entrenar");
  });
});
