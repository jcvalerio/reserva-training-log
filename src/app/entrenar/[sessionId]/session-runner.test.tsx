import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { PlanSessionTemplate } from "@/plans/plan-repository";
import type { ExerciseWithLoggedSets, SetLog, WorkoutSession } from "@/workouts/workout-repository";

import type { SaveSetActionState } from "../actions";
import { SessionRunner } from "./session-runner";

const noopSaveSetAction = vi.fn(async (): Promise<SaveSetActionState> => ({ status: "idle" }));
const noopCompleteSessionAction = vi.fn(async () => {});

const template: PlanSessionTemplate = {
  id: "template-1",
  workoutPlanId: "plan-1",
  weekNumber: 1,
  dayIndex: 1,
  nameEs: "Pierna — cuádriceps",
  nameEn: null,
  focus: "Cuádriceps y pantorrilla",
  estimatedDurationMinutes: 60,
  mobilityNotesEs: "Movilidad.",
};

function buildSession(overrides: Partial<WorkoutSession> = {}): WorkoutSession {
  return {
    id: "session-1",
    athleteProfileId: "profile-1",
    workoutPlanId: "plan-1",
    planSessionTemplateId: "template-1",
    status: "active",
    startedAt: new Date("2026-07-20T12:00:00Z"),
    completedAt: null,
    notes: null,
    createdAt: new Date("2026-07-20T12:00:00Z"),
    updatedAt: new Date("2026-07-20T12:00:00Z"),
    ...overrides,
  };
}

function buildSet(overrides: Partial<SetLog> = {}): SetLog {
  return {
    id: "set-1",
    exerciseLogId: "log-1",
    setNumber: 1,
    side: "bilateral",
    actualWeightKg: "80.00",
    actualReps: 10,
    rir: 2,
    painScore: 0,
    notes: null,
    completedAt: new Date("2026-07-20T12:00:00Z"),
    ...overrides,
  };
}

function buildExercise(overrides: Partial<ExerciseWithLoggedSets> = {}): ExerciseWithLoggedSets {
  return {
    id: "exercise-a",
    planSessionTemplateId: "template-1",
    orderIndex: 1,
    exerciseNameEs: "Prensa de piernas",
    exerciseNameEn: null,
    phase: "main",
    sideMode: "bilateral",
    targetSets: 2,
    targetRepMin: 8,
    targetRepMax: 12,
    targetRir: 2,
    restSeconds: 150,
    notesEs: "Ajusta la carga.",
    notesEn: null,
    painSensitive: false,
    substitutionOptionsEs: [],
    incrementCategory: "machine_or_lower_body",
    loggedSets: [],
    previousPerformance: null,
    ...overrides,
  };
}

describe("SessionRunner", () => {
  it("opens on the first exercise with incomplete sets, not the first exercise overall", () => {
    const exerciseA = buildExercise({
      id: "exercise-a",
      exerciseNameEs: "Prensa de piernas",
      targetSets: 2,
      loggedSets: [buildSet({ setNumber: 1 }), buildSet({ id: "set-2", setNumber: 2 })],
    });
    const exerciseB = buildExercise({
      id: "exercise-b",
      exerciseNameEs: "Extensión de piernas",
      targetSets: 3,
      loggedSets: [],
    });

    render(
      <SessionRunner
        session={buildSession()}
        template={template}
        exercises={[exerciseA, exerciseB]}
        saveSetAction={noopSaveSetAction}
        completeSessionAction={noopCompleteSessionAction}
      />,
    );

    expect(screen.getByText("Ejercicio 2 de 2")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Extensión de piernas" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Guardar set 1" })).toBeVisible();
  });

  it("advances and returns between exercises with Anterior/Siguiente ejercicio", () => {
    const exerciseA = buildExercise({ id: "exercise-a", exerciseNameEs: "Prensa de piernas", targetSets: 3 });
    const exerciseB = buildExercise({ id: "exercise-b", exerciseNameEs: "Extensión de piernas", targetSets: 3 });

    render(
      <SessionRunner
        session={buildSession()}
        template={template}
        exercises={[exerciseA, exerciseB]}
        saveSetAction={noopSaveSetAction}
        completeSessionAction={noopCompleteSessionAction}
      />,
    );

    expect(screen.getByRole("heading", { name: "Prensa de piernas" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Siguiente ejercicio" }));

    expect(screen.getByRole("heading", { name: "Extensión de piernas" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Siguiente ejercicio" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Anterior" }));

    expect(screen.getByRole("heading", { name: "Prensa de piernas" })).toBeVisible();
  });

  it("shows completed sets and hides the logging form once the target is reached", () => {
    const exercise = buildExercise({
      targetSets: 1,
      loggedSets: [buildSet({ setNumber: 1, actualWeightKg: "82.50", actualReps: 9, rir: 1, painScore: 2 })],
    });

    render(
      <SessionRunner
        session={buildSession()}
        template={template}
        exercises={[exercise]}
        saveSetAction={noopSaveSetAction}
        completeSessionAction={noopCompleteSessionAction}
      />,
    );

    expect(screen.getByText(/82\.50kg × 9 · RIR 1 · dolor 2/)).toBeVisible();
    expect(screen.getByText("Series objetivo completadas para este ejercicio.")).toBeVisible();
    expect(screen.queryByRole("button", { name: /Guardar set/ })).toBeNull();
  });

  it("shows a side selector only for unilateral exercises", () => {
    const bilateral = buildExercise({ sideMode: "bilateral" });
    const { unmount } = render(
      <SessionRunner
        session={buildSession()}
        template={template}
        exercises={[bilateral]}
        saveSetAction={noopSaveSetAction}
        completeSessionAction={noopCompleteSessionAction}
      />,
    );
    expect(screen.queryByRole("radio", { name: "Izquierda" })).toBeNull();
    unmount();

    const unilateral = buildExercise({ sideMode: "unilateral_separate" });
    render(
      <SessionRunner
        session={buildSession()}
        template={template}
        exercises={[unilateral]}
        saveSetAction={noopSaveSetAction}
        completeSessionAction={noopCompleteSessionAction}
      />,
    );
    expect(screen.getByRole("radio", { name: "Izquierda" })).toBeVisible();
    expect(screen.getByRole("radio", { name: "Derecha" })).toBeVisible();
  });

  it("renders a read-only summary instead of logging forms once the session is completed", () => {
    const exercise = buildExercise({
      loggedSets: [buildSet()],
    });

    render(
      <SessionRunner
        session={buildSession({ status: "completed" })}
        template={template}
        exercises={[exercise]}
        saveSetAction={noopSaveSetAction}
        completeSessionAction={noopCompleteSessionAction}
      />,
    );

    expect(screen.getByText("Sesión completada")).toBeVisible();
    expect(screen.queryByRole("button", { name: /Guardar set/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Completar entrenamiento" })).toBeNull();
  });

  it("shows previous performance and a suggestion, prefilling weight/reps from it, before the first set is logged", () => {
    const exercise = buildExercise({
      targetSets: 3,
      loggedSets: [],
      previousPerformance: {
        sessionId: "session-previous",
        targetRepMax: 12,
        targetSets: 2,
        sets: [
          buildSet({ id: "prev-1", setNumber: 1, actualWeightKg: "80.00", actualReps: 12, rir: 2, painScore: 0 }),
          buildSet({ id: "prev-2", setNumber: 2, actualWeightKg: "80.00", actualReps: 12, rir: 2, painScore: 0 }),
        ],
      },
    });

    render(
      <SessionRunner
        session={buildSession()}
        template={template}
        exercises={[exercise]}
        saveSetAction={noopSaveSetAction}
        completeSessionAction={noopCompleteSessionAction}
      />,
    );

    expect(screen.getByText("Última vez")).toBeVisible();
    expect(screen.getAllByText(/80\.00kg × 12 · RIR 2 · dolor 0/)).toHaveLength(2);
    expect(screen.getByText(/Sube carga/)).toBeVisible();
    expect(screen.getByText(/84\.00kg/)).toBeVisible();

    expect(screen.getByLabelText("Peso (kg)")).toHaveValue(84);
    expect(screen.getByLabelText("Reps")).toHaveValue(12);
  });

  it("suggests adding a rep instead of a weight jump for isolation exercises", () => {
    const exercise = buildExercise({
      targetSets: 3,
      loggedSets: [],
      incrementCategory: "isolation",
      previousPerformance: {
        sessionId: "session-previous",
        targetRepMax: 15,
        targetSets: 1,
        sets: [buildSet({ id: "prev-1", setNumber: 1, actualWeightKg: "20.00", actualReps: 15, rir: 2, painScore: 0 })],
      },
    });

    render(
      <SessionRunner
        session={buildSession()}
        template={template}
        exercises={[exercise]}
        saveSetAction={noopSaveSetAction}
        completeSessionAction={noopCompleteSessionAction}
      />,
    );

    expect(screen.getByText("Añade una repetición")).toBeVisible();
    expect(screen.queryByText(/→ 21\.00kg/)).toBeNull();
    expect(screen.getByLabelText("Peso (kg)")).toHaveValue(20);
  });

  it("suggests a smaller +2.5% jump for upper_compound exercises", () => {
    const exercise = buildExercise({
      targetSets: 3,
      loggedSets: [],
      incrementCategory: "upper_compound",
      previousPerformance: {
        sessionId: "session-previous",
        targetRepMax: 10,
        targetSets: 1,
        sets: [buildSet({ id: "prev-1", setNumber: 1, actualWeightKg: "80.00", actualReps: 10, rir: 2, painScore: 0 })],
      },
    });

    render(
      <SessionRunner
        session={buildSession()}
        template={template}
        exercises={[exercise]}
        saveSetAction={noopSaveSetAction}
        completeSessionAction={noopCompleteSessionAction}
      />,
    );

    expect(screen.getByText(/82\.00kg/)).toBeVisible();
  });

  it("hides the previous-performance card once a set has been logged this session", () => {
    const exercise = buildExercise({
      targetSets: 3,
      loggedSets: [buildSet({ id: "today-1", setNumber: 1 })],
      previousPerformance: {
        sessionId: "session-previous",
        targetRepMax: 12,
        targetSets: 1,
        sets: [buildSet({ id: "prev-1", setNumber: 1 })],
      },
    });

    render(
      <SessionRunner
        session={buildSession()}
        template={template}
        exercises={[exercise]}
        saveSetAction={noopSaveSetAction}
        completeSessionAction={noopCompleteSessionAction}
      />,
    );

    expect(screen.queryByText("Última vez")).toBeNull();
  });

  it("does not show a previous-performance card when there is none", () => {
    const exercise = buildExercise({ previousPerformance: null });

    render(
      <SessionRunner
        session={buildSession()}
        template={template}
        exercises={[exercise]}
        saveSetAction={noopSaveSetAction}
        completeSessionAction={noopCompleteSessionAction}
      />,
    );

    expect(screen.queryByText("Última vez")).toBeNull();
  });
});
