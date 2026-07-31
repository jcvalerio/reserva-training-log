"use client";

import { useActionState, useState } from "react";

import { formatKg } from "@/lib/format";
import type { PlanSessionTemplate } from "@/plans/plan-repository";
import { convertDurationValue, durationInputToSeconds, secondsToDurationInput } from "@/training/duration";
import type { DurationUnit } from "@/training/duration";
import { rirValues, toDisplayRir } from "@/training/rir";
import { rpeLabelsEs, rpeValues } from "@/training/rpe";
import type { Rpe } from "@/training/rpe";
import type { ProgressionAction, ProgressionRiskFlag } from "@/training/progression";
import { buildProgressionSuggestion, isRepsFirstIncrease, suggestNextWeightKg } from "@/workouts/progression-view";
import type { ExerciseWithLoggedSets, SetLog, WorkoutSession } from "@/workouts/workout-repository";

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
    const firstIncomplete = exercises.findIndex((exercise) => !isExerciseComplete(exercise));
    return firstIncomplete === -1 ? Math.max(exercises.length - 1, 0) : firstIncomplete;
  });
  const [saveState, formAction] = useActionState(saveSetAction, initialSaveSetState);

  if (session.status === "completed") {
    return <CompletedSessionSummary session={session} template={template} exercises={exercises} />;
  }

  const currentExercise = exercises[exerciseIndex];

  if (!currentExercise) {
    return (
      <AppShell activeHref="/entrenar">
        <p className="text-sm leading-6 text-zinc-300">Esta sesión no tiene ejercicios configurados.</p>
      </AppShell>
    );
  }

  const isDuration = currentExercise.prescriptionType === "duration";
  const loggedCount = currentExercise.loggedSets.length;
  const nextSetNumber = loggedCount + 1;
  const lastSet = currentExercise.loggedSets[loggedCount - 1];
  const isUnilateral = currentExercise.isUnilateral;
  const leftCount = currentExercise.loggedSets.filter((set) => set.side === "left").length;
  const rightCount = currentExercise.loggedSets.filter((set) => set.side === "right").length;
  const leftSideComplete = isUnilateral && leftCount >= currentExercise.targetSets;
  const rightSideComplete = isUnilateral && rightCount >= currentExercise.targetSets;
  const defaultSide = leftSideComplete ? "right" : rightSideComplete ? "left" : leftCount <= rightCount ? "left" : "right";
  const justSavedThisExercise = saveState.status === "saved" && saveState.exercisePrescriptionId === currentExercise.id;

  // Duration-type exercises don't get a progression suggestion in this first
  // cut — no rep range/RIR to compare against, and comparing raw durations
  // session-over-session is a different, not-yet-built feature.
  const previousPerformance =
    !isDuration && loggedCount === 0 && currentExercise.previousPerformance?.prescriptionType === "strength"
      ? currentExercise.previousPerformance
      : null;
  const previousLastSet = previousPerformance?.sets.at(-1) ?? null;
  const previousSuggestion = previousPerformance
    ? buildProgressionSuggestion(
        previousPerformance.sets,
        previousPerformance.targetRepMax,
        previousPerformance.targetSets,
        previousPerformance.isUnilateral,
      )
    : null;
  const repsFirstIncrease = previousSuggestion
    ? isRepsFirstIncrease(previousSuggestion.action, currentExercise.loadMechanism, currentExercise.isCompound)
    : false;
  const suggestedWeightKg =
    previousLastSet?.actualWeightKg && previousSuggestion
      ? suggestNextWeightKg(
          previousLastSet.actualWeightKg,
          previousSuggestion.action,
          currentExercise.loadMechanism,
          currentExercise.isCompound,
        )
      : null;

  const defaultWeightKg = lastSet?.actualWeightKg ?? suggestedWeightKg ?? "";
  const defaultReps = lastSet?.actualReps ?? previousLastSet?.actualReps ?? currentExercise.targetRepMax ?? "";
  const defaultDurationSeconds = lastSet?.actualDurationSeconds ?? currentExercise.durationSeconds ?? "";

  return (
    <AppShell activeHref="/entrenar">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-400">Día {template.dayIndex}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{template.nameEs}</h1>
        <p className="text-sm leading-6 text-zinc-400">{template.focus}</p>
        <p className="text-xs leading-5 text-zinc-400">{template.mobilityNotesEs}</p>
      </header>

      <section className="mt-6 rounded-3xl bg-zinc-900 p-4 ring-1 ring-zinc-800">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
          Ejercicio {exerciseIndex + 1} de {exercises.length}
        </p>
        <h2 className="mt-2 text-xl font-semibold text-zinc-100">{currentExercise.exerciseNameEs}</h2>
        <p className="mt-1 text-sm leading-6 text-zinc-400">
          {isDuration ? (
            <>
              {currentExercise.targetSets}× {formatDurationSeconds(currentExercise.durationSeconds ?? 0)}
              {isUnilateral ? " por lado" : ""} · descanso {currentExercise.restSeconds}s
            </>
          ) : (
            <>
              {currentExercise.targetSets}×{currentExercise.targetRepMin}-{currentExercise.targetRepMax}
              {isUnilateral ? " por lado" : ""} · RIR {currentExercise.targetRir} · descanso{" "}
              {currentExercise.restSeconds}s
            </>
          )}
        </p>
        <p className="mt-2 text-xs leading-5 text-zinc-400">{currentExercise.notesEs}</p>
        {currentExercise.painSensitive ? (
          <p className="mt-2 text-xs leading-5 text-amber-200">
            Vigilar dolor. Sustituciones: {currentExercise.substitutionOptionsEs.join(", ")}.
          </p>
        ) : null}

        {currentExercise.loggedSets.length > 0 ? (
          <div className="mt-4 grid gap-2">
            {currentExercise.loggedSets.map((set) => (
              <LoggedSetRow key={set.id} set={set} />
            ))}
          </div>
        ) : null}

        {previousPerformance && previousSuggestion ? (
          <div className="mt-4 rounded-2xl bg-zinc-950 p-3 ring-1 ring-sky-300/20">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Última vez</p>
            <div className="mt-2 grid gap-1 text-sm text-zinc-300">
              {previousPerformance.sets.map((set) => (
                <LoggedSetRow key={set.id} set={set} />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className={`rounded-xl px-3 py-2 text-sm font-semibold ${suggestionClass(previousSuggestion.action)}`}>
                {repsFirstIncrease ? "Añade una repetición" : suggestionLabelEs(previousSuggestion.action)}
                {suggestedWeightKg && !repsFirstIncrease ? ` → ${formatKg(suggestedWeightKg, 2)}` : ""}
              </div>
              {previousSuggestion.riskFlag !== "none" ? (
                <span
                  className={`rounded-full px-2 py-1 text-xs font-semibold ${riskFlagClass(previousSuggestion.riskFlag)}`}
                >
                  {riskFlagLabelEs(previousSuggestion.riskFlag)}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs leading-5 text-zinc-400">
              {repsFirstIncrease
                ? "Ejercicio de aislamiento: manten el peso y suma una repetición antes de subir carga."
                : previousSuggestion.reasonEs}
            </p>
          </div>
        ) : null}

        {!isExerciseComplete(currentExercise) ? (
          <form key={`${currentExercise.id}:${nextSetNumber}`} action={formAction} className="mt-4 grid gap-3">
            <input type="hidden" name="workoutSessionId" value={session.id} />
            <input type="hidden" name="exercisePrescriptionId" value={currentExercise.id} />
            <input type="hidden" name="prescriptionType" value={currentExercise.prescriptionType} />

            {isUnilateral ? (
              <div className="grid grid-cols-2 gap-2">
                <label className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-3 py-3 text-sm font-semibold ring-1 ring-zinc-800 has-[:checked]:bg-emerald-300 has-[:checked]:text-zinc-950 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-emerald-300 has-[:disabled]:opacity-40">
                  <input
                    type="radio"
                    name="side"
                    value="left"
                    defaultChecked={defaultSide === "left"}
                    disabled={leftSideComplete}
                    className="sr-only"
                  />
                  Izquierda
                </label>
                <label className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-3 py-3 text-sm font-semibold ring-1 ring-zinc-800 has-[:checked]:bg-emerald-300 has-[:checked]:text-zinc-950 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-emerald-300 has-[:disabled]:opacity-40">
                  <input
                    type="radio"
                    name="side"
                    value="right"
                    defaultChecked={defaultSide === "right"}
                    disabled={rightSideComplete}
                    className="sr-only"
                  />
                  Derecha
                </label>
              </div>
            ) : (
              <input type="hidden" name="side" value="bilateral" />
            )}

            {isDuration ? (
              <DurationSetInput defaultSeconds={defaultDurationSeconds} />
            ) : (
              <>
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
              </>
            )}

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

      <div className="mt-4 grid grid-cols-2 gap-3">
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

      <form action={completeSessionAction} className="mt-4 grid gap-3">
        <input type="hidden" name="workoutSessionId" value={session.id} />
        <details className="rounded-2xl bg-zinc-900 p-3 ring-1 ring-zinc-800">
          <summary className="cursor-pointer text-sm font-semibold text-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
            ¿Cómo te sentiste? (opcional)
          </summary>
          <div className="mt-3 grid gap-3">
            <label className="grid gap-1 text-sm font-medium text-zinc-300">
              <span>Esfuerzo percibido (RPE)</span>
              <select name="sessionRpe" defaultValue="" className="input">
                <option value="">Sin especificar</option>
                {rpeValues.map((value) => (
                  <option key={value} value={value}>
                    {value} — {rpeLabelsEs[value]}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-zinc-300">
              <span>Notas de la sesión</span>
              <textarea
                name="notes"
                rows={2}
                className="input resize-none"
                placeholder="¿Algo a considerar para la próxima?"
              />
            </label>
          </div>
        </details>
        <SubmitButton className="w-full rounded-2xl bg-zinc-900 px-4 py-3 text-center text-sm font-semibold text-emerald-300 ring-1 ring-emerald-300/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
          Completar entrenamiento
        </SubmitButton>
      </form>

      <div className="mt-4 rounded-2xl bg-zinc-900 p-4 text-sm leading-6 text-zinc-300 ring-1 ring-amber-300/30 mb-10">
        Dolor &gt;2 bloquea aumentos agresivos, dolor &gt;3 exige reducir, modificar o cambiar el movimiento, dolor
        ≥7 significa detener y buscar orientación profesional si persiste.
      </div>
    </AppShell>
  );
}

function CompletedSessionSummary({
  session,
  template,
  exercises,
}: {
  session: WorkoutSession;
  template: PlanSessionTemplate;
  exercises: ExerciseWithLoggedSets[];
}) {
  return (
    <AppShell activeHref="/entrenar">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-400">Día {template.dayIndex}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{template.nameEs}</h1>
        <p className="text-sm font-semibold text-emerald-300">Sesión completada</p>
        {session.sessionRpe !== null ? (
          <p className="text-sm leading-6 text-zinc-300">
            Esfuerzo percibido: {session.sessionRpe} — {rpeLabelsEs[session.sessionRpe as Rpe]}
          </p>
        ) : null}
        {session.notes ? <p className="text-sm leading-6 text-zinc-400">{session.notes}</p> : null}
      </header>

      <div className="mt-6 grid gap-3 pb-10">
        {exercises.map((exercise) => (
          <article key={exercise.id} className="rounded-2xl bg-zinc-900 p-3 ring-1 ring-zinc-800">
            <h2 className="font-semibold text-zinc-100">{exercise.exerciseNameEs}</h2>
            {exercise.loggedSets.length === 0 ? (
              <p className="mt-1 text-sm text-zinc-400">Sin series registradas.</p>
            ) : (
              <div className="mt-2 grid gap-1 text-sm text-zinc-300">
                {exercise.loggedSets.map((set) => (
                  <LoggedSetRow key={set.id} set={set} />
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </AppShell>
  );
}

function LoggedSetRow({ set }: { set: SetLog }) {
  const sideLabel = set.side !== "bilateral" ? ` · ${set.side === "left" ? "Izq" : "Der"}` : "";

  return (
    <div className="rounded-xl bg-zinc-950 px-3 py-2 text-sm ring-1 ring-zinc-800">
      <div className="flex items-center justify-between">
        <span className="text-zinc-300">
          Set {set.setNumber}
          {sideLabel}
        </span>
        <span className="font-semibold text-zinc-100">
          {set.actualDurationSeconds !== null ? (
            <>
              {formatDurationSeconds(set.actualDurationSeconds)} · dolor {set.painScore}
            </>
          ) : (
            <>
              {formatKg(set.actualWeightKg!, 2)} × {set.actualReps} · RIR {formatStoredRir(set.rir ?? 0)} · dolor{" "}
              {set.painScore}
            </>
          )}
        </span>
      </div>
      {set.notes ? <p className="mt-1 text-xs leading-5 text-zinc-400">{set.notes}</p> : null}
    </div>
  );
}

/**
 * A unilateral exercise's targetSets means sets per side, not a shared total
 * — completing 3 left-side sets says nothing about the right side.
 */
function isExerciseComplete(exercise: ExerciseWithLoggedSets): boolean {
  if (!exercise.isUnilateral) {
    return exercise.loggedSets.length >= exercise.targetSets;
  }

  const leftCount = exercise.loggedSets.filter((set) => set.side === "left").length;
  const rightCount = exercise.loggedSets.filter((set) => set.side === "right").length;
  return leftCount >= exercise.targetSets && rightCount >= exercise.targetSets;
}

function DurationSetInput({ defaultSeconds }: { defaultSeconds: number | "" }) {
  const initial = secondsToDurationInput(typeof defaultSeconds === "number" ? defaultSeconds : null);
  const [unit, setUnit] = useState<DurationUnit>(initial.unit);
  const [value, setValue] = useState<number | "">(initial.value);

  function handleUnitChange(nextUnit: DurationUnit) {
    setValue((current) => (current === "" ? current : convertDurationValue(current, unit, nextUnit)));
    setUnit(nextUnit);
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <label className="grid gap-1 text-sm font-medium text-zinc-300">
        <span>Duración real</span>
        <input
          type="number"
          inputMode={unit === "minutes" ? "decimal" : "numeric"}
          step={unit === "minutes" ? 0.5 : 1}
          min={unit === "minutes" ? 0.5 : 1}
          max={unit === "minutes" ? 60 : 3600}
          value={value}
          onChange={(event) => setValue(event.target.value === "" ? "" : Number(event.target.value))}
          required
          className="input"
        />
      </label>
      <label className="grid gap-1 text-sm font-medium text-zinc-300">
        <span>Unidad</span>
        <select value={unit} onChange={(event) => handleUnitChange(event.target.value as DurationUnit)} className="input">
          <option value="seconds">Segundos</option>
          <option value="minutes">Minutos</option>
        </select>
      </label>
      <input
        type="hidden"
        name="actualDurationSeconds"
        value={value === "" ? "" : durationInputToSeconds(value, unit)}
      />
    </div>
  );
}

function formatStoredRir(rir: number) {
  return rir >= 4 ? "4+" : String(rir);
}

function formatDurationSeconds(totalSeconds: number) {
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds === 0 ? `${minutes} min` : `${minutes}:${String(seconds).padStart(2, "0")} min`;
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

function riskFlagLabelEs(riskFlag: ProgressionRiskFlag) {
  return { pain: "Dolor", fatigue: "Fatiga", technique: "Técnica", none: "" }[riskFlag];
}

function riskFlagClass(riskFlag: ProgressionRiskFlag) {
  return {
    pain: "bg-amber-300/10 text-amber-200",
    fatigue: "bg-amber-300/10 text-amber-200",
    technique: "bg-sky-300/10 text-sky-200",
    none: "",
  }[riskFlag];
}
