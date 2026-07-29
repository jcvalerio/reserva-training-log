"use client";

import { useActionState, useState } from "react";

import type { PlanSessionTemplate } from "@/plans/plan-repository";
import { rirValues, toDisplayRir } from "@/training/rir";
import type { ProgressionAction } from "@/training/progression";
import { buildProgressionSuggestion, suggestNextWeightKg } from "@/workouts/progression-view";
import type { ExerciseWithLoggedSets, WorkoutSession } from "@/workouts/workout-repository";

import { AppShell } from "../../app-shell";
import { SubmitButton } from "../../submit-button";
import type { SaveSetActionState } from "../actions";

const initialSaveSetState: SaveSetActionState = { status: "idle" };

export function SessionRunner({
  session,
  template,
  exercises,
  saveSetAction,
  completeSessionAction,
}: {
  session: WorkoutSession;
  template: PlanSessionTemplate;
  exercises: ExerciseWithLoggedSets[];
  saveSetAction: (prevState: SaveSetActionState, formData: FormData) => Promise<SaveSetActionState>;
  completeSessionAction: (formData: FormData) => Promise<void>;
}) {
  const [exerciseIndex, setExerciseIndex] = useState(() => {
    const firstIncomplete = exercises.findIndex((exercise) => exercise.loggedSets.length < exercise.targetSets);
    return firstIncomplete === -1 ? Math.max(exercises.length - 1, 0) : firstIncomplete;
  });
  const [saveState, formAction] = useActionState(saveSetAction, initialSaveSetState);

  if (session.status === "completed") {
    return <CompletedSessionSummary template={template} exercises={exercises} />;
  }

  const currentExercise = exercises[exerciseIndex];

  if (!currentExercise) {
    return (
      <AppShell activeHref="/entrenar">
        <p className="text-sm leading-6 text-zinc-300">Esta sesión no tiene ejercicios configurados.</p>
      </AppShell>
    );
  }

  const loggedCount = currentExercise.loggedSets.length;
  const nextSetNumber = loggedCount + 1;
  const lastSet = currentExercise.loggedSets[loggedCount - 1];
  const isUnilateral = currentExercise.sideMode !== "bilateral";
  const leftCount = currentExercise.loggedSets.filter((set) => set.side === "left").length;
  const rightCount = currentExercise.loggedSets.filter((set) => set.side === "right").length;
  const defaultSide = leftCount <= rightCount ? "left" : "right";
  const justSavedThisExercise = saveState.status === "saved" && saveState.exercisePrescriptionId === currentExercise.id;

  const previousPerformance = loggedCount === 0 ? currentExercise.previousPerformance : null;
  const previousLastSet = previousPerformance?.sets.at(-1) ?? null;
  const previousSuggestion = previousPerformance
    ? buildProgressionSuggestion(previousPerformance.sets, previousPerformance.targetRepMax, previousPerformance.targetSets)
    : null;
  const suggestedWeightKg =
    previousLastSet && previousSuggestion ? suggestNextWeightKg(previousLastSet.actualWeightKg, previousSuggestion.action) : null;

  const defaultWeightKg = lastSet?.actualWeightKg ?? suggestedWeightKg ?? "";
  const defaultReps = lastSet?.actualReps ?? previousLastSet?.actualReps ?? currentExercise.targetRepMax;

  return (
    <AppShell activeHref="/entrenar">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-500">
          Semana {template.weekNumber} · Día {template.dayIndex}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{template.nameEs}</h1>
        <p className="text-sm leading-6 text-zinc-400">{template.focus}</p>
      </header>

      <form action={completeSessionAction} className="mt-4">
        <input type="hidden" name="workoutSessionId" value={session.id} />
        <SubmitButton className="w-full rounded-2xl bg-zinc-900 px-4 py-3 text-center text-sm font-semibold text-emerald-300 ring-1 ring-emerald-300/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
          Completar entrenamiento
        </SubmitButton>
      </form>

      <section className="mt-6 rounded-3xl bg-zinc-900 p-4 ring-1 ring-zinc-800">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Ejercicio {exerciseIndex + 1} de {exercises.length}
        </p>
        <h2 className="mt-2 text-xl font-semibold text-zinc-100">{currentExercise.exerciseNameEs}</h2>
        <p className="mt-1 text-sm leading-6 text-zinc-400">
          {currentExercise.targetSets}×{currentExercise.targetRepMin}-{currentExercise.targetRepMax} · RIR{" "}
          {currentExercise.targetRir} · descanso {currentExercise.restSeconds}s
        </p>
        {currentExercise.painSensitive ? (
          <p className="mt-2 text-xs leading-5 text-amber-200">
            Vigilar dolor. Sustituciones: {currentExercise.substitutionOptionsEs.join(", ")}.
          </p>
        ) : null}

        {currentExercise.loggedSets.length > 0 ? (
          <div className="mt-4 grid gap-2">
            {currentExercise.loggedSets.map((set) => (
              <div
                key={set.id}
                className="flex items-center justify-between rounded-xl bg-zinc-950 px-3 py-2 text-sm ring-1 ring-zinc-800"
              >
                <span className="text-zinc-300">
                  Set {set.setNumber}
                  {set.side !== "bilateral" ? ` · ${set.side === "left" ? "Izq" : "Der"}` : ""}
                </span>
                <span className="font-semibold text-zinc-100">
                  {set.actualWeightKg}kg × {set.actualReps} · RIR {formatStoredRir(set.rir)} · dolor {set.painScore}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        {previousPerformance && previousSuggestion ? (
          <div className="mt-4 rounded-2xl bg-zinc-950 p-3 ring-1 ring-sky-300/20">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Última vez</p>
            <div className="mt-2 grid gap-1 text-sm text-zinc-300">
              {previousPerformance.sets.map((set) => (
                <p key={set.id}>
                  Set {set.setNumber}
                  {set.side !== "bilateral" ? ` · ${set.side === "left" ? "Izq" : "Der"}` : ""}: {set.actualWeightKg}
                  kg × {set.actualReps} · RIR {formatStoredRir(set.rir)} · dolor {set.painScore}
                </p>
              ))}
            </div>
            <div className={`mt-3 rounded-xl px-3 py-2 text-sm font-semibold ${suggestionClass(previousSuggestion.action)}`}>
              {suggestionLabelEs(previousSuggestion.action)}
              {suggestedWeightKg ? ` → ${suggestedWeightKg}kg` : ""}
            </div>
            <p className="mt-1 text-xs leading-5 text-zinc-400">{previousSuggestion.reasonEs}</p>
          </div>
        ) : null}

        {loggedCount < currentExercise.targetSets ? (
          <form key={`${currentExercise.id}:${nextSetNumber}`} action={formAction} className="mt-4 grid gap-3">
            <input type="hidden" name="workoutSessionId" value={session.id} />
            <input type="hidden" name="exercisePrescriptionId" value={currentExercise.id} />

            {isUnilateral ? (
              <div className="grid grid-cols-2 gap-2">
                <label className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-3 py-3 text-sm font-semibold ring-1 ring-zinc-800 has-[:checked]:bg-emerald-300 has-[:checked]:text-zinc-950 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-emerald-300">
                  <input
                    type="radio"
                    name="side"
                    value="left"
                    defaultChecked={defaultSide === "left"}
                    className="sr-only"
                  />
                  Izquierda
                </label>
                <label className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-3 py-3 text-sm font-semibold ring-1 ring-zinc-800 has-[:checked]:bg-emerald-300 has-[:checked]:text-zinc-950 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-emerald-300">
                  <input
                    type="radio"
                    name="side"
                    value="right"
                    defaultChecked={defaultSide === "right"}
                    className="sr-only"
                  />
                  Derecha
                </label>
              </div>
            ) : (
              <input type="hidden" name="side" value="bilateral" />
            )}

            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1 text-sm font-medium text-zinc-300">
                <span>Peso (kg)</span>
                <input
                  name="actualWeightKg"
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  min={0.5}
                  max={999}
                  defaultValue={defaultWeightKg}
                  required
                  className="input"
                />
              </label>
              <label className="grid gap-1 text-sm font-medium text-zinc-300">
                <span>Reps</span>
                <input
                  name="actualReps"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={50}
                  defaultValue={defaultReps}
                  required
                  className="input"
                />
              </label>
            </div>

            <div className="grid gap-1 text-sm font-medium text-zinc-300">
              <span>Reps en reserva (RIR)</span>
              <div className="grid grid-cols-5 gap-2">
                {rirValues.map((value) => (
                  <label
                    key={value}
                    className="flex min-h-12 items-center justify-center rounded-xl bg-zinc-950 text-sm font-semibold ring-1 ring-zinc-800 has-[:checked]:bg-emerald-300 has-[:checked]:text-zinc-950 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-emerald-300"
                  >
                    <input
                      type="radio"
                      name="rir"
                      value={value}
                      defaultChecked={value === currentExercise.targetRir}
                      className="sr-only"
                    />
                    {toDisplayRir(value)}
                  </label>
                ))}
              </div>
            </div>

            <label className="grid gap-1 text-sm font-medium text-zinc-300">
              <span>Dolor (0-10)</span>
              <input
                name="painScore"
                type="number"
                inputMode="numeric"
                min={0}
                max={10}
                defaultValue={0}
                required
                className="input"
              />
            </label>

            <label className="grid gap-1 text-sm font-medium text-zinc-300">
              <span>Notas (opcional)</span>
              <textarea name="notes" rows={2} className="input resize-none" />
            </label>

            {saveState.status === "error" ? (
              <p role="alert" className="text-sm leading-6 text-amber-200">
                {saveState.message}
              </p>
            ) : null}
            {justSavedThisExercise ? (
              saveState.painScore >= 7 ? (
                <p role="status" className="text-sm leading-6 text-amber-200">
                  Dolor alto registrado. Considera reducir carga, modificar el ejercicio o detenerte si persiste.
                </p>
              ) : (
                <p role="status" className="text-sm leading-6 text-emerald-300">
                  Set {saveState.setNumber} guardado.
                </p>
              )
            ) : null}

            <SubmitButton className="rounded-2xl bg-emerald-300 px-5 py-4 text-center font-semibold text-zinc-950 shadow-lg shadow-emerald-950/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-100">
              Guardar set {nextSetNumber}
            </SubmitButton>
          </form>
        ) : (
          <p className="mt-4 text-sm leading-6 text-emerald-300">Series objetivo completadas para este ejercicio.</p>
        )}
      </section>

      <div className="mt-4 grid grid-cols-2 gap-3 pb-10">
        <button
          type="button"
          onClick={() => setExerciseIndex((index) => Math.max(index - 1, 0))}
          disabled={exerciseIndex === 0}
          className="min-h-12 rounded-2xl bg-zinc-900 text-sm font-semibold text-zinc-300 ring-1 ring-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:opacity-40"
        >
          Anterior
        </button>
        <button
          type="button"
          onClick={() => setExerciseIndex((index) => Math.min(index + 1, exercises.length - 1))}
          disabled={exerciseIndex === exercises.length - 1}
          className="min-h-12 rounded-2xl bg-emerald-300 text-sm font-semibold text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-100 disabled:opacity-40"
        >
          Siguiente ejercicio
        </button>
      </div>

      <div className="rounded-2xl bg-zinc-900 p-4 text-sm leading-6 text-zinc-300 ring-1 ring-amber-300/30">
        Dolor &gt;2 bloquea aumentos agresivos, dolor &gt;3 exige reducir, modificar o cambiar el movimiento, dolor
        ≥7 significa detener y buscar orientación profesional si persiste.
      </div>
    </AppShell>
  );
}

function CompletedSessionSummary({
  template,
  exercises,
}: {
  template: PlanSessionTemplate;
  exercises: ExerciseWithLoggedSets[];
}) {
  return (
    <AppShell activeHref="/entrenar">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-500">
          Semana {template.weekNumber} · Día {template.dayIndex}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{template.nameEs}</h1>
        <p className="text-sm font-semibold text-emerald-300">Sesión completada</p>
      </header>

      <div className="mt-6 grid gap-3 pb-10">
        {exercises.map((exercise) => (
          <article key={exercise.id} className="rounded-2xl bg-zinc-900 p-3 ring-1 ring-zinc-800">
            <h2 className="font-semibold text-zinc-100">{exercise.exerciseNameEs}</h2>
            {exercise.loggedSets.length === 0 ? (
              <p className="mt-1 text-sm text-zinc-500">Sin series registradas.</p>
            ) : (
              <div className="mt-2 grid gap-1 text-sm text-zinc-300">
                {exercise.loggedSets.map((set) => (
                  <p key={set.id}>
                    Set {set.setNumber}
                    {set.side !== "bilateral" ? ` · ${set.side === "left" ? "Izq" : "Der"}` : ""}: {set.actualWeightKg}
                    kg × {set.actualReps} · RIR {formatStoredRir(set.rir)} · dolor {set.painScore}
                  </p>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </AppShell>
  );
}

function formatStoredRir(rir: number) {
  return rir >= 4 ? "4+" : String(rir);
}

function suggestionLabelEs(action: ProgressionAction) {
  return { increase: "Sube carga", hold: "Mantén la carga", reduce_or_modify: "Reduce o modifica" }[action];
}

function suggestionClass(action: ProgressionAction) {
  return {
    increase: "bg-emerald-300/10 text-emerald-300",
    hold: "bg-sky-300/10 text-sky-200",
    reduce_or_modify: "bg-amber-300/10 text-amber-200",
  }[action];
}
