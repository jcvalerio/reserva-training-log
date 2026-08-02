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
    sessionRpe: null,
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
    actualDurationSeconds: null,
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
    isUnilateral: false,
    prescriptionType: "strength",
    targetSets: 2,
    targetRepMin: 8,
    targetRepMax: 12,
    targetRir: 2,
    durationSeconds: null,
    restSeconds: 150,
    notesEs: "Ajusta la carga.",
    notesEn: null,
    painSensitive: false,
    substitutionOptionsEs: [],
    loadMechanism: "machine",
    isCompound: true,
    lineageKey: null,
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

  it("shows the exercise's notes and the session's mobility notes as coaching cues while training", () => {
    const exercise = buildExercise({ notesEs: "Ajusta la carga usando tus pesos base y conserva técnica estricta." });

    render(
      <SessionRunner
        session={buildSession()}
        template={template}
        exercises={[exercise]}
        saveSetAction={noopSaveSetAction}
        completeSessionAction={noopCompleteSessionAction}
      />,
    );

    expect(screen.getByText("Ajusta la carga usando tus pesos base y conserva técnica estricta.")).toBeVisible();
    expect(screen.getByText(template.mobilityNotesEs)).toBeVisible();
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
      loggedSets: [
        buildSet({
          setNumber: 1,
          actualWeightKg: "82.50",
          actualReps: 9,
          rir: 1,
          painScore: 2,
          notes: "Hombro un poco inestable en la última rep.",
        }),
      ],
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

    expect(screen.getByText(/82\.5kg × 9 · RIR 1 · dolor 2/)).toBeVisible();
    expect(screen.getByText("Hombro un poco inestable en la última rep.")).toBeVisible();
    expect(screen.getByText("Series objetivo completadas para este ejercicio.")).toBeVisible();
    expect(screen.queryByRole("button", { name: /Guardar set/ })).toBeNull();
  });

  it("shows a side selector only for unilateral exercises", () => {
    const bilateral = buildExercise({ isUnilateral: false });
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

    const unilateral = buildExercise({ isUnilateral: true });
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

  it("requires targetSets per side for a unilateral exercise, not a shared total", () => {
    const exercise = buildExercise({
      isUnilateral: true,
      targetSets: 2,
      loggedSets: [
        buildSet({ id: "s1", setNumber: 1, side: "left" }),
        buildSet({ id: "s2", setNumber: 2, side: "right" }),
        buildSet({ id: "s3", setNumber: 3, side: "left" }),
      ],
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

    // 3 total sets logged (>= targetSets of 2), but only 1 on the right side
    // — the exercise must not be marked complete, and the left radio (already
    // at its per-side target) must be disabled so the user can't over-log it.
    expect(screen.queryByText("Series objetivo completadas para este ejercicio.")).toBeNull();
    expect(screen.getByRole("button", { name: "Guardar set 4" })).toBeVisible();
    expect(screen.getByRole("radio", { name: "Izquierda" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: "Derecha" })).not.toBeDisabled();
    expect(screen.getByRole("radio", { name: "Derecha" })).toBeChecked();
  });

  it("marks a unilateral exercise complete only once both sides reach targetSets", () => {
    const exercise = buildExercise({
      isUnilateral: true,
      targetSets: 2,
      loggedSets: [
        buildSet({ id: "s1", setNumber: 1, side: "left" }),
        buildSet({ id: "s2", setNumber: 2, side: "left" }),
        buildSet({ id: "s3", setNumber: 3, side: "right" }),
        buildSet({ id: "s4", setNumber: 4, side: "right" }),
      ],
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

    expect(screen.getByText("Series objetivo completadas para este ejercicio.")).toBeVisible();
    expect(screen.queryByRole("button", { name: /Guardar set/ })).toBeNull();
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

  it("shows the session's RPE label and notes on the completed summary", () => {
    const exercise = buildExercise({ loggedSets: [buildSet()] });

    render(
      <SessionRunner
        session={buildSession({ status: "completed", sessionRpe: 8, notes: "Semana pesada, dormí poco." })}
        template={template}
        exercises={[exercise]}
        saveSetAction={noopSaveSetAction}
        completeSessionAction={noopCompleteSessionAction}
      />,
    );

    expect(screen.getByText(/8 — Muy duro/)).toBeVisible();
    expect(screen.getByText("Semana pesada, dormí poco.")).toBeVisible();
  });

  it("offers an optional RPE and notes section on the complete-session form", () => {
    const exercise = buildExercise({ loggedSets: [] });

    render(
      <SessionRunner
        session={buildSession()}
        template={template}
        exercises={[exercise]}
        saveSetAction={noopSaveSetAction}
        completeSessionAction={noopCompleteSessionAction}
      />,
    );

    expect(screen.getByText("¿Cómo te sentiste? (opcional)")).toBeVisible();
    expect(screen.getByLabelText("Esfuerzo percibido (RPE)")).toBeInTheDocument();
    expect(screen.getByLabelText("Notas de la sesión")).toBeInTheDocument();
  });

  it("shows previous performance and a suggestion, prefilling weight/reps from it, before the first set is logged", () => {
    const exercise = buildExercise({
      targetSets: 3,
      loggedSets: [],
      previousPerformance: {
        sessionId: "session-previous",
        prescriptionType: "strength",
        targetRepMax: 12,
        targetSets: 2,
        isUnilateral: false,
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

    expect(screen.getByText(/Última vez/)).toBeVisible();
    expect(screen.getAllByText(/80kg × 12 · RIR 2 · dolor 0/)).toHaveLength(1);
    expect(screen.getByText(/Sube carga/)).toBeVisible();
    expect(screen.getByText(/84kg/)).toBeVisible();

    expect(screen.getByLabelText("Peso (kg)")).toHaveValue(84);
    expect(screen.getByLabelText("Reps")).toHaveValue(12);
  });

  it("shows a risk-flag badge when the previous set's notes flag technique or discomfort", () => {
    const exercise = buildExercise({
      targetSets: 2,
      loggedSets: [],
      previousPerformance: {
        sessionId: "session-previous",
        prescriptionType: "strength",
        targetRepMax: 12,
        targetSets: 2,
        isUnilateral: false,
        sets: [
          buildSet({
            id: "prev-1",
            setNumber: 1,
            actualWeightKg: "80.00",
            actualReps: 12,
            rir: 2,
            painScore: 0,
            notes: "Hombro inestable en la última rep.",
          }),
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

    expect(screen.getByText(/Mantén la carga/)).toBeVisible();
    expect(screen.getByText("Técnica")).toBeVisible();
  });

  it("suggests adding a rep instead of a weight jump for isolation exercises", () => {
    const exercise = buildExercise({
      targetSets: 3,
      loggedSets: [],
      loadMechanism: "machine",
      isCompound: false,
      previousPerformance: {
        sessionId: "session-previous",
        prescriptionType: "strength",
        targetRepMax: 15,
        targetSets: 1,
        isUnilateral: false,
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
    expect(screen.queryByText(/→ 21kg/)).toBeNull();
    expect(screen.getByLabelText("Peso (kg)")).toHaveValue(20);
  });

  it("suggests a smaller +2.5% jump for barbell compound exercises", () => {
    const exercise = buildExercise({
      targetSets: 3,
      loggedSets: [],
      loadMechanism: "barbell",
      isCompound: true,
      previousPerformance: {
        sessionId: "session-previous",
        prescriptionType: "strength",
        targetRepMax: 10,
        targetSets: 1,
        isUnilateral: false,
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

    expect(screen.getByText(/82kg/)).toBeVisible();
  });

  it("keeps the previous-performance reference visible after logging a set, matched to the set you're about to log", () => {
    const exercise = buildExercise({
      targetSets: 3,
      loggedSets: [buildSet({ id: "today-1", setNumber: 1 })],
      previousPerformance: {
        sessionId: "session-previous",
        prescriptionType: "strength",
        targetRepMax: 12,
        targetSets: 2,
        isUnilateral: false,
        sets: [
          buildSet({ id: "prev-1", setNumber: 1, actualWeightKg: "80.00" }),
          buildSet({ id: "prev-2", setNumber: 2, actualWeightKg: "82.50" }),
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

    // One set already logged today, so the next set to log is set 2 — the
    // reference should show set 2's previous value (82.5kg), not set 1's.
    expect(screen.getByText(/Última vez · Set 2/)).toBeVisible();
    expect(screen.getAllByText(/82.5kg/).length).toBeGreaterThan(0);
  });

  it("shows a fallback message once you're past what was recorded last time", () => {
    const exercise = buildExercise({
      targetSets: 3,
      loggedSets: [buildSet({ id: "today-1", setNumber: 1 })],
      previousPerformance: {
        sessionId: "session-previous",
        prescriptionType: "strength",
        targetRepMax: 12,
        targetSets: 1,
        isUnilateral: false,
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

    expect(screen.getByText(/Última vez/)).toBeVisible();
    expect(screen.getByText("La vez pasada no llegaste a este set.")).toBeVisible();
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

  it("logs a duration-type exercise in minutes and converts it to seconds for submission", () => {
    const exercise = buildExercise({
      prescriptionType: "duration",
      targetSets: 1,
      targetRepMin: null,
      targetRepMax: null,
      targetRir: null,
      durationSeconds: 300,
      loadMechanism: null,
      isCompound: null,
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

    expect(screen.queryByLabelText("Peso (kg)")).toBeNull();
    expect(screen.queryByText("Reps en reserva (RIR)")).toBeNull();

    // durationSeconds=300 reads as 5 minutes by default.
    expect(screen.getByLabelText("Unidad")).toHaveValue("minutes");
    expect(screen.getByLabelText("Duración real")).toHaveValue(5);

    fireEvent.change(screen.getByLabelText("Unidad"), { target: { value: "seconds" } });
    expect(screen.getByLabelText("Duración real")).toHaveValue(300);

    const hiddenInput = document.querySelector('input[name="actualDurationSeconds"]');
    expect(hiddenInput).toHaveValue("300");
  });
});
