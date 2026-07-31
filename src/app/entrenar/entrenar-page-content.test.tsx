import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { EntrenarSessionItem } from "@/workouts/session-progress";

import { EntrenarPageContent } from "./entrenar-page-content";

const noopStartAction = vi.fn(async () => {});

describe("EntrenarPageContent", () => {
  it("shows an empty state pointing to /plan when there is no active plan", () => {
    render(
      <EntrenarPageContent
        hasActivePlan={false}
        sessions={[]}
        justCompleted={false}
        startOrResumeSessionAction={noopStartAction}
      />,
    );

    expect(screen.getByRole("heading", { name: "Todavía no hay plan activo" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Ir a Plan" })).toHaveAttribute("href", "/plan");
  });

  it("highlights the suggested not-started session with a start action", () => {
    const sessions: EntrenarSessionItem[] = [
      {
        templateId: "template-1",
        dayIndex: 1,
        nameEs: "Pierna — cuádriceps",
        focus: "Cuádriceps y pantorrilla",
        exerciseCount: 4,
        isSuggested: true,
        status: "not_started",
      },
    ];

    render(
      <EntrenarPageContent
        hasActivePlan={true}
        sessions={sessions}
        justCompleted={false}
        startOrResumeSessionAction={noopStartAction}
      />,
    );

    expect(screen.getByText("Sugerido para hoy")).toBeVisible();
    expect(screen.getAllByRole("button", { name: "Empezar" })).toHaveLength(2);
    expect(screen.getByText("No iniciada")).toBeVisible();
    // Shown once in the suggested card and once in the list row for the same session.
    expect(screen.getAllByText("4 ejercicios")).toHaveLength(2);
  });

  it("shows continue/view links for in-progress and completed sessions", () => {
    const sessions: EntrenarSessionItem[] = [
      {
        templateId: "template-1",
        dayIndex: 1,
        nameEs: "Pierna",
        focus: "Cuádriceps",
        exerciseCount: 4,
        isSuggested: true,
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
    ];

    render(
      <EntrenarPageContent
        hasActivePlan={true}
        sessions={sessions}
        justCompleted={false}
        startOrResumeSessionAction={noopStartAction}
      />,
    );

    expect(screen.getAllByRole("link", { name: "Continuar" })[0]).toHaveAttribute("href", "/entrenar/session-1");
    expect(screen.getByRole("link", { name: "Ver resumen" })).toHaveAttribute("href", "/entrenar/session-2");
    expect(screen.getByText("En progreso")).toBeVisible();
    expect(screen.getByText("Completada")).toBeVisible();
  });

  it("lets a completed session be started again, since the plan repeats indefinitely", () => {
    const sessions: EntrenarSessionItem[] = [
      {
        templateId: "template-1",
        dayIndex: 1,
        nameEs: "Pierna",
        focus: "Cuádriceps",
        exerciseCount: 4,
        isSuggested: true,
        status: "completed",
        sessionId: "session-1",
      },
    ];

    render(
      <EntrenarPageContent
        hasActivePlan={true}
        sessions={sessions}
        justCompleted={false}
        startOrResumeSessionAction={noopStartAction}
      />,
    );

    // The suggested card and the list row both render a completed session's
    // action, so both expect an "Empezar de nuevo" button.
    expect(screen.getAllByRole("button", { name: "Empezar de nuevo" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "Ver resumen" })[0]).toHaveAttribute("href", "/entrenar/session-1");
  });

  it("shows the completion banner after finishing a session", () => {
    render(
      <EntrenarPageContent
        hasActivePlan={true}
        sessions={[]}
        justCompleted={true}
        startOrResumeSessionAction={noopStartAction}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Sesión completada");
  });
});
