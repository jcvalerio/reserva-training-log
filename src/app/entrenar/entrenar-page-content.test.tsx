import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { EntrenarWeek } from "@/workouts/session-progress";

import { EntrenarPageContent } from "./entrenar-page-content";

const noopStartAction = vi.fn(async () => {});

describe("EntrenarPageContent", () => {
  it("shows an empty state pointing to /plan when there is no active plan", () => {
    render(
      <EntrenarPageContent
        hasActivePlan={false}
        weeks={[]}
        justCompleted={false}
        startOrResumeSessionAction={noopStartAction}
      />,
    );

    expect(screen.getByRole("heading", { name: "Todavía no hay plan activo" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Ir a Plan" })).toHaveAttribute("href", "/plan");
  });

  it("highlights the suggested not-started session with a start action", () => {
    const weeks: EntrenarWeek[] = [
      {
        weekNumber: 1,
        sessions: [
          {
            templateId: "template-1",
            dayIndex: 1,
            nameEs: "Pierna — cuádriceps",
            focus: "Cuádriceps y pantorrilla",
            exerciseCount: 4,
            isSuggested: true,
            status: "not_started",
          },
        ],
      },
    ];

    render(
      <EntrenarPageContent
        hasActivePlan={true}
        weeks={weeks}
        justCompleted={false}
        startOrResumeSessionAction={noopStartAction}
      />,
    );

    expect(screen.getByText("Sugerido para hoy")).toBeVisible();
    expect(screen.getAllByRole("button", { name: "Empezar" })).toHaveLength(2);
    expect(screen.getByText("No iniciada")).toBeVisible();
  });

  it("shows continue/view links for in-progress and completed sessions and no suggestion when everything is done", () => {
    const weeks: EntrenarWeek[] = [
      {
        weekNumber: 1,
        sessions: [
          {
            templateId: "template-1",
            dayIndex: 1,
            nameEs: "Pierna",
            focus: "Cuádriceps",
            exerciseCount: 4,
            isSuggested: false,
            status: "in_progress",
            sessionId: "session-1",
          },
          {
            templateId: "template-2",
            dayIndex: 2,
            nameEs: "Torso",
            focus: "Empuje",
            exerciseCount: 4,
            isSuggested: false,
            status: "completed",
            sessionId: "session-2",
          },
        ],
      },
    ];

    render(
      <EntrenarPageContent
        hasActivePlan={true}
        weeks={weeks}
        justCompleted={false}
        startOrResumeSessionAction={noopStartAction}
      />,
    );

    expect(screen.getByRole("link", { name: "Continuar" })).toHaveAttribute("href", "/entrenar/session-1");
    expect(screen.getByRole("link", { name: "Ver resumen" })).toHaveAttribute("href", "/entrenar/session-2");
    expect(screen.getByText("En progreso")).toBeVisible();
    expect(screen.getByText("Completada")).toBeVisible();
    expect(screen.getByText("Completaste todas las sesiones planificadas de tu plan activo.")).toBeVisible();
    expect(screen.queryByText("Sugerido para hoy")).toBeNull();
  });

  it("shows the completion banner after finishing a session", () => {
    render(
      <EntrenarPageContent
        hasActivePlan={true}
        weeks={[]}
        justCompleted={true}
        startOrResumeSessionAction={noopStartAction}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Sesión completada");
  });
});
