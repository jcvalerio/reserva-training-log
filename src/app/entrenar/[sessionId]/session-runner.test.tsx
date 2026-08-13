import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { PlanSessionTemplate } from "@/plans/plan-repository";
import { toDisplayRir } from "@/training/rir";
import type { SessionRecap } from "@/workouts/session-recap";
import type { ExerciseWithLoggedSets, SetLog, WorkoutSession } from "@/workouts/workout-repository";

import type {
  EditSetActionState,
  SaveSetActionState,
  SubstituteExerciseActionState,
  UpdateTargetSetsActionState,
} from "../actions";
import { SessionRunner } from "./session-runner";

const noopSaveSetAction = vi.fn(async (): Promise<SaveSetActionState> => ({ status: "idle" }));
const noopCompleteSessionAction = vi.fn(async () => {});
const noopUpdateTargetSetsAction = vi.fn(async (): Promise<UpdateTargetSetsActionState> => ({ status: "idle" }));
const noopUpdateSetAction = vi.fn(async (): Promise<EditSetActionState> => ({ status: "idle" }));
const noopDeleteSetAction = vi.fn(async (): Promise<EditSetActionState> => ({ status: "idle" }));
const noopSubstituteExerciseAction = vi.fn(
  async (): Promise<SubstituteExerciseActionState> => ({ status: "idle" }),
);

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

// LoggedSetRow wraps the RIR digit in its own <span> (so a harder-than-target
// set can be colored independently), which splits what used to be one text
// node across an element boundary — getByText's default matcher only looks
// at an element's own direct text, so a plain regex stops matching across
// that boundary. This matches on the full normalized textContent instead,
// same fix testing-library's own error message for "text broken up by
// multiple elements" recommends.
function byNormalizedText(expected: RegExp) {
  return (_content: string, element: Element | null) => {
    if (!element) {
      return false;
    }
    const normalized = element.textContent?.replace(/\s+/g, " ").trim() ?? "";
    if (!expected.test(normalized)) {
      return false;
    }
    return Array.from(element.children).every((child) => {
      const childText = child.textContent?.replace(/\s+/g, " ").trim() ?? "";
      return !expected.test(childText);
    });
  };
}

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
    painLocation: null,
    notes: null,
    completedAt: new Date("2026-07-20T12:00:00Z"),
    updatedAt: null,
    ...overrides,
  };
}

function buildRecap(overrides: Partial<SessionRecap> = {}): SessionRecap {
  return {
    durationMinutes: 20,
    completedSetCount: 3,
    totalVolumeLoadKg: 240,
    comparableCount: 0,
    improvedCount: 0,
    personalRecords: [],
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
    substitutedForPrescriptionId: null,
    substitutionReasonEs: null,
    exerciseId: null,
    loggedSets: [],
    previousPerformance: null,
    ...overrides,
  };
}

function renderRunner({
  exercises,
  session = buildSession(),
  recap = null,
  saveSetAction = noopSaveSetAction,
  completeSessionAction = noopCompleteSessionAction,
  updateTargetSetsAction = noopUpdateTargetSetsAction,
  updateSetAction = noopUpdateSetAction,
  deleteSetAction = noopDeleteSetAction,
  substituteExerciseAction = noopSubstituteExerciseAction,
  substitutesByExerciseId = {},
  planSubstituteChoices = [],
  smallerSideHint = null,
}: {
  exercises: ExerciseWithLoggedSets[];
  session?: WorkoutSession;
  recap?: SessionRecap | null;
  saveSetAction?: (prevState: SaveSetActionState, formData: FormData) => Promise<SaveSetActionState>;
  completeSessionAction?: (formData: FormData) => Promise<void>;
  updateTargetSetsAction?: (
    prevState: UpdateTargetSetsActionState,
    formData: FormData,
  ) => Promise<UpdateTargetSetsActionState>;
  updateSetAction?: (prevState: EditSetActionState, formData: FormData) => Promise<EditSetActionState>;
  deleteSetAction?: (prevState: EditSetActionState, formData: FormData) => Promise<EditSetActionState>;
  substituteExerciseAction?: (
    prevState: SubstituteExerciseActionState,
    formData: FormData,
  ) => Promise<SubstituteExerciseActionState>;
  substitutesByExerciseId?: Record<string, { exerciseNameEs: string }[]>;
  planSubstituteChoices?: { exerciseNameEs: string }[];
  smallerSideHint?: "left" | "right" | null;
}) {
  return render(
    <SessionRunner
      session={session}
      template={template}
      exercises={exercises}
      recap={recap}
      saveSetAction={saveSetAction}
      completeSessionAction={completeSessionAction}
      updateTargetSetsAction={updateTargetSetsAction}
      updateSetAction={updateSetAction}
      deleteSetAction={deleteSetAction}
      substituteExerciseAction={substituteExerciseAction}
      substitutesByExerciseId={substitutesByExerciseId}
      planSubstituteChoices={planSubstituteChoices}
      smallerSideHint={smallerSideHint}
    />,
  );
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

    renderRunner({ exercises: [exerciseA, exerciseB] });

    expect(screen.getByText("Ejercicio 2 de 2")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Extensión de piernas" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Guardar set 1" })).toBeVisible();
  });

  it("shows the exercise's notes and the session's mobility notes as coaching cues while training", () => {
    const exercise = buildExercise({ notesEs: "Ajusta la carga usando tus pesos base y conserva técnica estricta." });

    renderRunner({ exercises: [exercise] });

    expect(screen.getByText("Ajusta la carga usando tus pesos base y conserva técnica estricta.")).toBeVisible();
    expect(screen.getByText(template.mobilityNotesEs)).toBeVisible();
  });

  it("advances and returns between exercises with Anterior/Siguiente ejercicio", () => {
    const exerciseA = buildExercise({ id: "exercise-a", exerciseNameEs: "Prensa de piernas", targetSets: 3 });
    const exerciseB = buildExercise({ id: "exercise-b", exerciseNameEs: "Extensión de piernas", targetSets: 3 });

    renderRunner({ exercises: [exerciseA, exerciseB] });

    expect(screen.getByRole("heading", { name: "Prensa de piernas" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Siguiente ejercicio" }));

    expect(screen.getByRole("heading", { name: "Extensión de piernas" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Siguiente ejercicio" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Anterior" }));

    expect(screen.getByRole("heading", { name: "Prensa de piernas" })).toBeVisible();
  });

  it("shows completed sets and replaces the logging form with a '+ set extra' affordance once the target is reached", () => {
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

    renderRunner({ exercises: [exercise] });

    // rir: 1 against the exercise's default targetRir of 2 is harder than
    // prescribed, so the row now shows the target alongside the actual.
    expect(screen.getByText(byNormalizedText(/82\.5kg × 9 · RIR 1 \(obj\. 2\) · dolor 2/))).toBeVisible();
    expect(screen.getByText("Hombro un poco inestable en la última rep.")).toBeVisible();
    expect(screen.getByText("Series objetivo completadas para este ejercicio.")).toBeVisible();
    expect(screen.queryByRole("button", { name: /Guardar set/ })).toBeNull();
    expect(screen.getByRole("button", { name: "+ Agregar un set extra" })).toBeVisible();
  });

  it("shows a side selector only for unilateral exercises", () => {
    const bilateral = buildExercise({ isUnilateral: false });
    const { unmount } = renderRunner({ exercises: [bilateral] });
    expect(screen.queryByRole("radio", { name: "Izquierda" })).toBeNull();
    unmount();

    const unilateral = buildExercise({ isUnilateral: true });
    renderRunner({ exercises: [unilateral] });
    expect(screen.getByRole("radio", { name: "Izquierda" })).toBeVisible();
    expect(screen.getByRole("radio", { name: "Derecha" })).toBeVisible();
  });

  it("defaults to Izquierda when there's no measurement-derived side hint", () => {
    const unilateral = buildExercise({ isUnilateral: true, loggedSets: [] });

    renderRunner({ exercises: [unilateral] });

    expect(screen.getByRole("radio", { name: "Izquierda" })).toBeChecked();
    expect(screen.queryByText(/Según tus mediciones/)).toBeNull();
  });

  it("defaults to whichever side is smaller per measurements, with a visible note, when the sides are tied", () => {
    const unilateral = buildExercise({ isUnilateral: true, loggedSets: [] });

    renderRunner({ exercises: [unilateral], smallerSideHint: "right" });

    expect(screen.getByRole("radio", { name: "Derecha" })).toBeChecked();
    expect(screen.getByText(/Según tus mediciones, tu lado derecho es más delgado/)).toBeVisible();
  });

  it("still lets whoever has fewer logged sets go next even with a measurement hint set — the hint only breaks ties", () => {
    const unilateral = buildExercise({
      isUnilateral: true,
      targetSets: 3,
      loggedSets: [buildSet({ id: "s1", setNumber: 1, side: "right" })],
    });

    renderRunner({ exercises: [unilateral], smallerSideHint: "right" });

    // Right already has 1 set logged and left has 0, so left goes next
    // regardless of the hint favoring right.
    expect(screen.getByRole("radio", { name: "Izquierda" })).toBeChecked();
    expect(screen.queryByText(/Según tus mediciones/)).toBeNull();
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

    renderRunner({ exercises: [exercise] });

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

    renderRunner({ exercises: [exercise] });

    expect(screen.getByText("Series objetivo completadas para este ejercicio.")).toBeVisible();
    expect(screen.queryByRole("button", { name: /Guardar set/ })).toBeNull();
  });

  it("renders a read-only summary instead of logging forms once the session is completed", () => {
    const exercise = buildExercise({
      loggedSets: [buildSet()],
    });

    renderRunner({ exercises: [exercise], session: buildSession({ status: "completed" }) });

    expect(screen.getByText("Sesión completada")).toBeVisible();
    expect(screen.queryByRole("button", { name: /Guardar set/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Completar entrenamiento" })).toBeNull();
  });

  it("shows the session's RPE label and notes on the completed summary", () => {
    const exercise = buildExercise({ loggedSets: [buildSet()] });

    renderRunner({
      exercises: [exercise],
      session: buildSession({ status: "completed", sessionRpe: 8, notes: "Semana pesada, dormí poco." }),
    });

    expect(screen.getByText(/8 — Muy duro/)).toBeVisible();
    expect(screen.getByText("Semana pesada, dormí poco.")).toBeVisible();
  });

  it("shows no recap card when the page didn't compute one", () => {
    const exercise = buildExercise({ loggedSets: [buildSet()] });

    renderRunner({ exercises: [exercise], session: buildSession({ status: "completed" }) });

    expect(screen.queryByRole("region", { name: "Resumen de la sesión" })).toBeNull();
  });

  it("shows the recap's duration/sets/volume tiles and the honest improvement line", () => {
    const exercise = buildExercise({ loggedSets: [buildSet()] });
    const recap = buildRecap({ durationMinutes: 54, completedSetCount: 18, totalVolumeLoadKg: 4120, comparableCount: 6, improvedCount: 3 });

    renderRunner({ exercises: [exercise], session: buildSession({ status: "completed" }), recap });

    const card = screen.getByRole("region", { name: "Resumen de la sesión" });
    expect(within(card).getByText("54 min")).toBeVisible();
    expect(within(card).getByText("18")).toBeVisible();
    expect(within(card).getByText("4120kg")).toBeVisible();
    expect(within(card).getByText("3 de 6 ejercicios mejoraron vs. tu sesión anterior.")).toBeVisible();
  });

  it("uses the singular form for exactly one comparable exercise", () => {
    const exercise = buildExercise({ loggedSets: [buildSet()] });
    const recap = buildRecap({ comparableCount: 1, improvedCount: 1 });

    renderRunner({ exercises: [exercise], session: buildSession({ status: "completed" }), recap });

    expect(screen.getByText("1 de 1 ejercicio mejoró vs. tu sesión anterior.")).toBeVisible();
  });

  it("omits the improvement line when no exercise had a previous instance to compare against", () => {
    const exercise = buildExercise({ loggedSets: [buildSet()] });

    renderRunner({ exercises: [exercise], session: buildSession({ status: "completed" }), recap: buildRecap() });

    expect(screen.queryByText(/vs\. tu sesión anterior/)).toBeNull();
  });

  it("shows a dash for duration when the recap couldn't compute it", () => {
    const exercise = buildExercise({ loggedSets: [buildSet()] });

    renderRunner({
      exercises: [exercise],
      session: buildSession({ status: "completed" }),
      recap: buildRecap({ durationMinutes: null }),
    });

    const card = screen.getByRole("region", { name: "Resumen de la sesión" });
    expect(within(card).getByText("—")).toBeVisible();
  });

  it("shows no personal-record banner when the recap has none", () => {
    const exercise = buildExercise({ loggedSets: [buildSet()] });

    renderRunner({ exercises: [exercise], session: buildSession({ status: "completed" }), recap: buildRecap() });

    expect(screen.queryByText("Nuevo récord personal")).toBeNull();
  });

  it("shows a personal-record banner listing every record this session set", () => {
    const exercise = buildExercise({ loggedSets: [buildSet()] });
    const recap = buildRecap({
      personalRecords: [
        { exerciseNameEs: "Prensa de piernas", kind: "volume_load", valueKg: 880 },
        { exerciseNameEs: "Sentadilla", kind: "estimated_1rm", valueKg: 112.5 },
      ],
    });

    renderRunner({ exercises: [exercise], session: buildSession({ status: "completed" }), recap });

    expect(screen.getByText("Nuevo récord personal")).toBeVisible();
    expect(screen.getByText("Prensa de piernas — volumen: 880kg")).toBeVisible();
    expect(screen.getByText("Sentadilla — 1RM estimado: 112.5kg")).toBeVisible();
  });

  it("offers an optional RPE and notes section on the complete-session form", () => {
    const exercise = buildExercise({ loggedSets: [] });

    renderRunner({ exercises: [exercise] });

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

    renderRunner({ exercises: [exercise] });

    expect(screen.getByText(/Última vez/)).toBeVisible();
    // One as the single "Última vez · Set 1" reference row, plus both prior
    // sets again inside the (collapsed-by-default) "ver todas las series"
    // history — see the dedicated test below for that disclosure itself.
    expect(screen.getAllByText(byNormalizedText(/80kg × 12 · RIR 2 · dolor 0/))).toHaveLength(3);
    expect(screen.getByText(/Sube carga/)).toBeVisible();
    expect(screen.getByText(/84kg/)).toBeVisible();

    expect(screen.getByLabelText("Peso (kg)")).toHaveValue(84);
    expect(screen.getByLabelText("Reps")).toHaveValue(12);

    expect(screen.getByRole("link", { name: "¿Por qué esta sugerencia?" })).toHaveAttribute(
      "href",
      "/guia?open=matematica",
    );
  });

  it("flags a logged set's RIR against target — amber only when it came in harder than prescribed", () => {
    const exercise = buildExercise({
      targetSets: 3,
      targetRir: 2,
      loggedSets: [
        buildSet({ id: "s1", setNumber: 1, actualReps: 6, rir: 1 }), // harder than target
        buildSet({ id: "s2", setNumber: 2, actualReps: 7, rir: 3 }), // easier than target
        buildSet({ id: "s3", setNumber: 3, actualReps: 8, rir: 2 }), // on target
      ],
    });

    renderRunner({ exercises: [exercise] });

    expect(screen.getByText("1 (obj. 2)")).toHaveClass("text-amber-200");
    expect(screen.getByText("3 (obj. 2)")).not.toHaveClass("text-amber-200");
    expect(screen.getByText("2")).not.toHaveClass("text-amber-200");
  });

  it("groups a unilateral exercise's logged sets by side with a running tally, numbered within each side", () => {
    const exercise = buildExercise({
      isUnilateral: true,
      targetSets: 3,
      loggedSets: [
        buildSet({ id: "s1", setNumber: 1, side: "left" }),
        buildSet({ id: "s2", setNumber: 2, side: "right" }),
        buildSet({ id: "s3", setNumber: 3, side: "left" }),
      ],
    });

    renderRunner({ exercises: [exercise] });

    expect(screen.getByText("Izquierda · 2/3")).toBeVisible();
    expect(screen.getByText("Derecha · 1/3")).toBeVisible();

    // Numbered by position within its own side (1, 2), not the shared/global
    // setNumber (1, 3) — a flat "Set 1, Set 3" in one column would read as a
    // skipped set even though nothing is missing.
    expect(screen.getByText(/^Set 1 · Izq$/)).toBeVisible();
    expect(screen.getByText(/^Set 2 · Izq$/)).toBeVisible();
    expect(screen.getByText(/^Set 1 · Der$/)).toBeVisible();
    expect(screen.queryByText(/Set 3 · Izq/)).toBeNull();
  });

  it("keeps the full 'última vez' history collapsed by default, present in the DOM either way", () => {
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
          buildSet({ id: "prev-1", setNumber: 1, actualWeightKg: "80.00", actualReps: 12, rir: 2 }),
          buildSet({ id: "prev-2", setNumber: 2, actualWeightKg: "82.50", actualReps: 10, rir: 1 }),
        ],
      },
    });

    renderRunner({ exercises: [exercise] });

    const summary = screen.getByText("Ver las 2 series de la vez pasada");
    expect(summary).toBeVisible();
    expect(summary.closest("details")).not.toHaveAttribute("open");
    // Native <details> keeps its content in the DOM while closed — the
    // second prior set is findable without opening anything, proving
    // nothing from the fully-loaded history is being silently dropped.
    expect(screen.getByText(byNormalizedText(/82\.5kg × 10/))).toBeInTheDocument();

    fireEvent.click(summary);

    expect(summary.closest("details")).toHaveAttribute("open");
  });

  it("resets the 'última vez' history disclosure to closed when moving to another exercise", () => {
    const previousPerformance = {
      sessionId: "session-previous",
      prescriptionType: "strength" as const,
      targetRepMax: 12,
      targetSets: 1,
      isUnilateral: false,
      sets: [buildSet({ id: "prev-1", setNumber: 1 })],
    };
    const exerciseA = buildExercise({
      id: "exercise-a",
      exerciseNameEs: "Prensa de piernas",
      targetSets: 1,
      loggedSets: [],
      previousPerformance,
    });
    const exerciseB = buildExercise({
      id: "exercise-b",
      exerciseNameEs: "Extensión de piernas",
      targetSets: 1,
      loggedSets: [],
      previousPerformance,
    });

    renderRunner({ exercises: [exerciseA, exerciseB] });

    const summaryOnA = screen.getByText("Ver la serie de la vez pasada");
    fireEvent.click(summaryOnA);
    expect(summaryOnA.closest("details")).toHaveAttribute("open");

    fireEvent.click(screen.getByRole("button", { name: "Siguiente ejercicio" }));

    const summaryOnB = screen.getByText("Ver la serie de la vez pasada");
    expect(summaryOnB.closest("details")).not.toHaveAttribute("open");
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
    painLocation: null,
            notes: "Hombro inestable en la última rep.",
          }),
          buildSet({ id: "prev-2", setNumber: 2, actualWeightKg: "80.00", actualReps: 12, rir: 2, painScore: 0 }),
        ],
      },
    });

    renderRunner({ exercises: [exercise] });

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

    renderRunner({ exercises: [exercise] });

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

    renderRunner({ exercises: [exercise] });

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

    renderRunner({ exercises: [exercise] });

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

    renderRunner({ exercises: [exercise] });

    expect(screen.getByText(/Última vez/)).toBeVisible();
    expect(screen.getByText("La vez pasada no llegaste a este set.")).toBeVisible();
  });

  it("does not show a previous-performance card when there is none", () => {
    const exercise = buildExercise({ previousPerformance: null });

    renderRunner({ exercises: [exercise] });

    expect(screen.queryByText("Última vez")).toBeNull();
  });

  it("anchors the suggested next weight on the previous session's last *planned* set, not a bonus set logged after it", () => {
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
          buildSet({ id: "prev-1", setNumber: 1, actualWeightKg: "80.00", actualReps: 12, rir: 2, painScore: 0 }),
          buildSet({ id: "prev-2", setNumber: 2, actualWeightKg: "80.00", actualReps: 12, rir: 2, painScore: 0 }),
          // A much lighter bonus 3rd set — must not become the anchor for
          // this session's suggested weight.
          buildSet({ id: "prev-3", setNumber: 3, actualWeightKg: "40.00", actualReps: 12, rir: 4, painScore: 0 }),
        ],
      },
    });

    renderRunner({ exercises: [exercise] });

    expect(screen.getByLabelText("Peso (kg)")).toHaveValue(84);
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

    renderRunner({ exercises: [exercise] });

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

  describe("bonus sets past targetSets", () => {
    it("reopens the logging form for exactly one more set when '+ Agregar un set extra' is tapped, bilateral", () => {
      const exercise = buildExercise({ targetSets: 1, loggedSets: [buildSet({ setNumber: 1 })] });

      renderRunner({ exercises: [exercise] });

      expect(screen.getByText("Series objetivo completadas para este ejercicio.")).toBeVisible();

      fireEvent.click(screen.getByRole("button", { name: "+ Agregar un set extra" }));

      expect(screen.getByRole("button", { name: "Guardar set 2" })).toBeVisible();
      expect(screen.queryByText("Series objetivo completadas para este ejercicio.")).toBeNull();
    });

    it("doesn't disable either side's radio while logging a bonus set on a unilateral exercise", () => {
      const exercise = buildExercise({
        isUnilateral: true,
        targetSets: 1,
        loggedSets: [
          buildSet({ id: "l1", side: "left", setNumber: 1 }),
          buildSet({ id: "r1", side: "right", setNumber: 2 }),
        ],
      });

      renderRunner({ exercises: [exercise] });
      fireEvent.click(screen.getByRole("button", { name: "+ Agregar un set extra" }));

      expect(screen.getByRole("radio", { name: "Izquierda" })).not.toBeDisabled();
      expect(screen.getByRole("radio", { name: "Derecha" })).not.toBeDisabled();
    });

    it("cautions against a bonus set on the thinner side, per the measurement-derived hint, once bonus logging opens", () => {
      const exercise = buildExercise({
        isUnilateral: true,
        targetSets: 1,
        loggedSets: [
          buildSet({ id: "l1", side: "left", setNumber: 1 }),
          buildSet({ id: "r1", side: "right", setNumber: 2 }),
        ],
      });

      renderRunner({ exercises: [exercise], smallerSideHint: "right" });

      expect(screen.queryByText(/evita series extra ahí sin valoración profesional/)).toBeNull();

      fireEvent.click(screen.getByRole("button", { name: "+ Agregar un set extra" }));

      expect(screen.getByText(/Tu lado derecho es el más delgado según tus mediciones/)).toBeVisible();
      expect(screen.getByText(/evita series extra ahí sin valoración profesional/)).toBeVisible();
      // Defaults away from the thinner side once both sides are tied in
      // bonus territory, not toward it.
      expect(screen.getByRole("radio", { name: "Izquierda" })).toBeChecked();
    });

    it("shows no caution for a unilateral bonus set when there's no measurement hint", () => {
      const exercise = buildExercise({
        isUnilateral: true,
        targetSets: 1,
        loggedSets: [
          buildSet({ id: "l1", side: "left", setNumber: 1 }),
          buildSet({ id: "r1", side: "right", setNumber: 2 }),
        ],
      });

      renderRunner({ exercises: [exercise] });
      fireEvent.click(screen.getByRole("button", { name: "+ Agregar un set extra" }));

      expect(screen.queryByText(/evita series extra ahí sin valoración profesional/)).toBeNull();
    });
  });

  describe("changing the exercise", () => {
    function openPanel() {
      fireEvent.click(screen.getByRole("button", { name: "Cambiar ejercicio" }));
      const form = screen.getByRole("button", { name: "Cambiar" }).closest("form");
      if (!form) {
        throw new Error("Expected the substitution panel to be open.");
      }
      return form as HTMLFormElement;
    }

    /** The plan list sits in a collapsed <details>, so expand it first. */
    function expandPlanChoices(form: HTMLFormElement) {
      const details = form.querySelector("details");
      if (!details) {
        throw new Error("Expected a plan-choices accordion.");
      }
      details.open = true;
      return details;
    }

    it("submits the chosen replacement against the exercise being replaced", () => {
      const exercise = buildExercise({ id: "prensa", exerciseNameEs: "Prensa unilateral" });

      renderRunner({ exercises: [exercise] });
      const form = openPanel();
      fireEvent.change(within(form).getByPlaceholderText("Escribe la máquina o ejercicio"), {
        target: { value: "Hack squat" },
      });

      const data = new FormData(form);
      expect(data.get("originalPrescriptionId")).toBe("prensa");
      expect(data.get("exerciseNameEs")).toBe("Hack squat");
      // Defaults to the most common case rather than forcing a choice.
      expect(data.get("reason")).toBe("machine_busy");
    });

    it("records the reason, and flags the one that is a symptom rather than logistics", () => {
      renderRunner({ exercises: [buildExercise()] });
      const form = openPanel();

      expect(screen.queryByText(/no se sintió bien/)).toBeNull();

      fireEvent.click(within(form).getByRole("button", { name: "No me sentí bien" }));

      expect(new FormData(form).get("reason")).toBe("felt_wrong");
      // The original will end the session with no logged sets, so this is the
      // only record that anything was wrong.
      expect(screen.getByText(/no se sintió bien/)).toBeVisible();
      expect(screen.getByText(/el dolor manda antes que la carga/)).toBeVisible();
    });

    it("offers alternatives already used before, so a recurring bad machine is one tap", () => {
      const exercise = buildExercise({ id: "prensa", exerciseNameEs: "Prensa unilateral" });

      renderRunner({
        exercises: [exercise],
        substitutesByExerciseId: { prensa: [{ exerciseNameEs: "Hack squat" }] },
      });
      const form = openPanel();
      fireEvent.click(within(form).getByRole("button", { name: "Hack squat" }));

      expect(new FormData(form).get("exerciseNameEs")).toBe("Hack squat");
    });

    it("does not offer the exercise you're currently replacing as its own replacement", () => {
      const exercise = buildExercise({ exerciseNameEs: "Prensa unilateral" });

      renderRunner({
        exercises: [exercise],
        planSubstituteChoices: [{ exerciseNameEs: "Prensa unilateral" }, { exerciseNameEs: "Curl martillo" }],
      });
      const form = openPanel();
      expandPlanChoices(form);

      expect(within(form).getByRole("button", { name: "Curl martillo" })).toBeVisible();
      expect(within(form).queryByRole("button", { name: "Prensa unilateral" })).toBeNull();
    });

    it("marks the plan choice you picked as selected, and fills the name field with it", () => {
      renderRunner({
        exercises: [buildExercise({ exerciseNameEs: "Press inclinado en máquina" })],
        planSubstituteChoices: [{ exerciseNameEs: "Prensa bilateral" }, { exerciseNameEs: "Curl martillo" }],
      });
      const form = openPanel();
      expandPlanChoices(form);
      const choice = within(form).getByRole("button", { name: "Prensa bilateral" });

      fireEvent.click(choice);

      // The tap has to be visibly acknowledged: the old native <select> reset
      // itself to its placeholder on every pick, so it read as a no-op.
      expect(choice).toHaveAttribute("aria-pressed", "true");
      expect(within(form).getByLabelText("¿Qué vas a hacer en su lugar?")).toHaveValue("Prensa bilateral");
      expect(new FormData(form).get("exerciseNameEs")).toBe("Prensa bilateral");
    });

    it("deselects the plan choice once you type something that isn't in the plan", () => {
      renderRunner({
        exercises: [buildExercise()],
        planSubstituteChoices: [{ exerciseNameEs: "Prensa bilateral" }],
      });
      const form = openPanel();
      expandPlanChoices(form);
      const choice = within(form).getByRole("button", { name: "Prensa bilateral" });

      fireEvent.click(choice);
      fireEvent.change(within(form).getByLabelText("¿Qué vas a hacer en su lugar?"), {
        target: { value: "Hack squat" },
      });

      expect(choice).toHaveAttribute("aria-pressed", "false");
      expect(new FormData(form).get("exerciseNameEs")).toBe("Hack squat");
    });

    it("tells you the prescription carries over, so the swap doesn't change the day's work", () => {
      renderRunner({ exercises: [buildExercise({ exerciseNameEs: "Prensa unilateral" })] });
      openPanel();

      expect(screen.getByText(/Mantendrás las mismas series, reps, RIR y descanso de Prensa unilateral/)).toBeVisible();
    });

    it("is not offered once the exercise's target sets are already done", () => {
      const exercise = buildExercise({
        targetSets: 1,
        loggedSets: [buildSet()],
      });

      renderRunner({ exercises: [exercise] });

      expect(screen.queryByRole("button", { name: "Cambiar ejercicio" })).toBeNull();
    });
  });

  describe("correcting a logged set", () => {
    /** The open correction form — the one owning the "Guardar cambios" button. */
    function openEditor(): HTMLFormElement {
      const form = screen.getByRole("button", { name: "Guardar cambios" }).closest("form");
      if (!form) {
        throw new Error("Expected the set editor to be open.");
      }
      return form as HTMLFormElement;
    }

    it("opens an editor prefilled with what was actually logged, not the plan's targets", () => {
      const exercise = buildExercise({
        targetRir: 2,
        loggedSets: [buildSet({ actualWeightKg: "62.50", actualReps: 9, rir: 0, painScore: 4 })],
      });

      renderRunner({ exercises: [exercise] });
      fireEvent.click(screen.getByRole("button", { name: "Editar" }));

      // Scoped to the editor: the normal logging form is on screen too, with
      // its own identically-labelled fields defaulted from the prescription.
      const editor = within(openEditor());

      expect(editor.getByLabelText("Peso (kg)")).toHaveValue(62.5);
      expect(editor.getByLabelText("Reps")).toHaveValue(9);
      expect(editor.getByLabelText("Dolor (0-10)")).toHaveValue(4);
      // The set's real RIR of 0 must win over the prescription's target of 2 —
      // and 0 is falsy, so this also guards the `?? targetRir` choice.
      expect(editor.getByRole("radio", { name: toDisplayRir(0) })).toBeChecked();
      expect(editor.getByRole("radio", { name: toDisplayRir(2) })).not.toBeChecked();
    });

    it("submits the correction with the set's id, so the server updates in place", () => {
      const exercise = buildExercise({ loggedSets: [buildSet({ id: "set-to-fix" })] });

      renderRunner({ exercises: [exercise] });
      fireEvent.click(screen.getByRole("button", { name: "Editar" }));

      const form = screen.getByRole("button", { name: "Guardar cambios" }).closest("form");
      expect(form).not.toBeNull();
      expect(new FormData(form!).get("setLogId")).toBe("set-to-fix");
    });

    it("requires a confirmation step before deleting, and points at the wrong-exercise fix", () => {
      const exercise = buildExercise({ loggedSets: [buildSet()] });

      renderRunner({ exercises: [exercise] });
      fireEvent.click(screen.getByRole("button", { name: "Editar" }));

      expect(screen.queryByRole("button", { name: "Sí, borrar" })).toBeNull();

      fireEvent.click(screen.getByRole("button", { name: "Borrar este set" }));

      expect(screen.getByRole("button", { name: "Sí, borrar" })).toBeVisible();
      expect(screen.getByText(/vuelve a registrarlo en el correcto/)).toBeVisible();
    });

    it("marks a corrected set as edited, and leaves an untouched one unmarked", () => {
      const exercise = buildExercise({
        loggedSets: [
          buildSet({ id: "untouched", setNumber: 1 }),
          buildSet({ id: "corrected", setNumber: 2, updatedAt: new Date("2026-08-09T10:00:00Z") }),
        ],
      });

      renderRunner({ exercises: [exercise] });

      expect(screen.getAllByText(/editado/)).toHaveLength(1);
    });

    it("lets a set be corrected from the completed-session summary too", () => {
      const exercise = buildExercise({ loggedSets: [buildSet()] });

      renderRunner({ exercises: [exercise], session: buildSession({ status: "completed" }) });
      fireEvent.click(screen.getByRole("button", { name: "Editar" }));

      expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeVisible();
    });

    it("does not offer to edit the previous session's reference set", () => {
      const exercise = buildExercise({
        loggedSets: [],
        previousPerformance: {
          sessionId: "previous-session",
          prescriptionType: "strength",
          targetRepMax: 12,
          targetSets: 3,
          isUnilateral: false,
          sets: [buildSet({ id: "previous-set" })],
        },
      });

      renderRunner({ exercises: [exercise] });

      expect(screen.queryByRole("button", { name: "Editar" })).toBeNull();
    });
  });
});
