"use client";

import Link from "next/link";
import { useActionState, useEffect, useId, useRef, useState } from "react";

import { formatKg, roundKgValue } from "@/lib/format";
import type { PlanSessionTemplate } from "@/plans/plan-repository";
import { convertDurationValue, durationInputToSeconds, secondsToDurationInput } from "@/training/duration";
import type { DurationUnit } from "@/training/duration";
import { rirValues, toDisplayRir } from "@/training/rir";
import { rpeLabelsEs, rpeValues } from "@/training/rpe";
import type { Rpe } from "@/training/rpe";
import type { ProgressionAction, ProgressionRiskFlag } from "@/training/progression";
import {
  buildProgressionSuggestion,
  isRepsFirstIncrease,
  splitPlannedAndBonusSets,
  suggestNextWeightKg,
} from "@/workouts/progression-view";
import type { ExerciseWithLoggedSets, SetLog, WorkoutSession } from "@/workouts/workout-repository";

import { AppShell } from "../../app-shell";
import { SubmitButton } from "../../submit-button";
import { YoutubeTechniqueLink } from "../../youtube-technique-link";
import type { EditSetActionState, SaveSetActionState, UpdateTargetSetsActionState } from "../actions";

const initialSaveSetState: SaveSetActionState = { status: "idle" };
const initialUpdateTargetSetsState: UpdateTargetSetsActionState = { status: "idle" };
const initialEditSetState: EditSetActionState = { status: "idle" };

export function SessionRunner({
  session,
  template,
  exercises,
  saveSetAction,
  completeSessionAction,
  updateTargetSetsAction,
  updateSetAction,
  deleteSetAction,
  smallerSideHint,
}: {
  session: WorkoutSession;
  template: PlanSessionTemplate;
  exercises: ExerciseWithLoggedSets[];
  saveSetAction: (prevState: SaveSetActionState, formData: FormData) => Promise<SaveSetActionState>;
  completeSessionAction: (formData: FormData) => Promise<void>;
  updateTargetSetsAction: (
    prevState: UpdateTargetSetsActionState,
    formData: FormData,
  ) => Promise<UpdateTargetSetsActionState>;
  updateSetAction: (prevState: EditSetActionState, formData: FormData) => Promise<EditSetActionState>;
  deleteSetAction: (prevState: EditSetActionState, formData: FormData) => Promise<EditSetActionState>;
  smallerSideHint: "left" | "right" | null;
}) {
  const [exerciseIndex, setExerciseIndex] = useState(() => {
    const firstIncomplete = exercises.findIndex((exercise) => !isExerciseComplete(exercise));
    return firstIncomplete === -1 ? Math.max(exercises.length - 1, 0) : firstIncomplete;
  });
  const [saveState, formAction] = useActionState(saveSetAction, initialSaveSetState);
  const [targetSetsState, targetSetsFormAction] = useActionState(updateTargetSetsAction, initialUpdateTargetSetsState);
  const exerciseForTimer = exercises[exerciseIndex];
  const { remaining: restRemaining, skip: skipRest } = useRestTimer({
    justSavedThisExercise: saveState.status === "saved" && saveState.exercisePrescriptionId === exerciseForTimer?.id,
    saveState,
    restSeconds: exerciseForTimer?.restSeconds ?? 0,
    exerciseIndex,
  });

  // A bonus set (logged past targetSets) reopens the same logging form for
  // exactly one more set, then collapses back to the "+ set extra" button —
  // repeatable, and reset whenever the exercise changes or a save lands.
  // Both resets adjust state during render (React's documented pattern),
  // matching the exerciseIndex-reset approach useRestTimer already uses
  // below, instead of a setState-in-effect.
  const [showBonusForm, setShowBonusForm] = useState(false);
  const [lastBonusExerciseIndex, setLastBonusExerciseIndex] = useState(exerciseIndex);
  if (exerciseIndex !== lastBonusExerciseIndex) {
    setLastBonusExerciseIndex(exerciseIndex);
    if (showBonusForm) {
      setShowBonusForm(false);
    }
  }
  const currentSaveKey =
    saveState.status === "saved" ? `${saveState.exercisePrescriptionId}:${saveState.setNumber}` : null;
  const [lastHandledSaveKey, setLastHandledSaveKey] = useState<string | null>(null);
  if (currentSaveKey !== null && currentSaveKey !== lastHandledSaveKey) {
    setLastHandledSaveKey(currentSaveKey);
    if (showBonusForm) {
      setShowBonusForm(false);
    }
  }

  if (session.status === "completed") {
    return (
      <CompletedSessionSummary
        session={session}
        template={template}
        exercises={exercises}
        updateSetAction={updateSetAction}
        deleteSetAction={deleteSetAction}
      />
    );
  }

  const currentExercise = exercises[exerciseIndex];

  if (!currentExercise) {
    return (
      <AppShell activeHref="/entrenar" backTo={{ href: "/entrenar", label: "Entrenar" }}>
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
  // Whichever side has fewer logged sets goes next, same as before — only
  // the tie-break (both sides equal, most commonly at the very start) now
  // prefers the measurement-derived smaller side over always defaulting to
  // left, when that data exists.
  const isTiedSide = leftCount === rightCount;
  // Bonus mode picks its own default (see bonusDefaultSide below, which
  // deliberately defaults *away* from the thinner side) — this note assumes
  // the normal-mode tie-break logic and would misdescribe which side just
  // got preselected if shown during bonus logging.
  const tieBreakUsedHint = isTiedSide && smallerSideHint !== null && !showBonusForm;
  // Once both sides already reached targetSets (the only way into bonus
  // territory), leftSideComplete/rightSideComplete are both true — the
  // normal asymmetric fallback below would always land on "right". Bonus
  // mode instead balances whichever side has fewer bonus sets so far, and on
  // a tie defaults *away* from the thinner side (opposite of the caution
  // above), not toward it.
  const bonusDefaultSide =
    leftCount === rightCount ? (smallerSideHint === "left" ? "right" : "left") : leftCount < rightCount ? "left" : "right";
  const defaultSide = showBonusForm
    ? bonusDefaultSide
    : leftSideComplete
      ? "right"
      : rightSideComplete
        ? "left"
        : !isTiedSide
          ? leftCount < rightCount
            ? "left"
            : "right"
          : (smallerSideHint ?? "left");
  const justSavedThisExercise = saveState.status === "saved" && saveState.exercisePrescriptionId === currentExercise.id;

  const exerciseTargetReached = isExerciseComplete(currentExercise);
  const isLoggingAllowed = !exerciseTargetReached || showBonusForm;
  // How many sets the plan would need to cover the bonus work just logged —
  // per side for unilateral (matching how targetSets is already interpreted
  // there), the running total otherwise. Offered as a one-tap "make this the
  // plan" update once it actually exceeds today's target.
  const bonusCount = isUnilateral ? Math.max(leftCount, rightCount) : loggedCount;
  const isBonusSetJustSaved = justSavedThisExercise && bonusCount > currentExercise.targetSets;
  // The plan's own leg-priority template already warns against extra sets on
  // the thinner leg without professional evaluation — surfacing that caution
  // generically (from the same measurement-derived hint used for the side
  // default) whenever bonus logging is open, regardless of which template is
  // active.
  const showThinnerSideCaution = isUnilateral && showBonusForm && smallerSideHint !== null;

  // Duration-type exercises don't get a progression suggestion in this first
  // cut — no rep range/RIR to compare against, and comparing raw durations
  // session-over-session is a different, not-yet-built feature. Unlike the
  // suggestion below (an exercise-level takeaway), this stays available for
  // every set, not just the first, so the reference below can track whichever
  // set you're about to log next.
  const previousPerformance =
    !isDuration && currentExercise.previousPerformance?.prescriptionType === "strength"
      ? currentExercise.previousPerformance
      : null;
  // Anchors on the last *planned* set, not just whatever was logged last —
  // if the previous session's actual last set was a bonus backoff set, it
  // shouldn't become the baseline for this session's suggested weight.
  const previousLastSet = previousPerformance
    ? (splitPlannedAndBonusSets(previousPerformance.sets, previousPerformance.targetSets, previousPerformance.isUnilateral)
        .planned.at(-1) ?? null)
    : null;
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

  const rawDefaultWeightKg = lastSet?.actualWeightKg ?? suggestedWeightKg ?? "";
  const defaultWeightKg = rawDefaultWeightKg === "" ? "" : roundKgValue(rawDefaultWeightKg, 2);
  const defaultReps = lastSet?.actualReps ?? previousLastSet?.actualReps ?? currentExercise.targetRepMax ?? "";
  const defaultDurationSeconds = lastSet?.actualDurationSeconds ?? currentExercise.durationSeconds ?? "";

  // The set you're about to log next, matched against the same position (and
  // side, for unilateral exercises) from the previous session — so the
  // reference tracks whichever set you're on, not just the first.
  const upcomingSide = isUnilateral ? defaultSide : "bilateral";
  const upcomingPositionOnSide = isUnilateral ? (defaultSide === "left" ? leftCount : rightCount) + 1 : nextSetNumber;
  const matchingPreviousSet =
    previousPerformance && isLoggingAllowed
      ? (previousPerformance.sets.filter((set) => set.side === upcomingSide)[upcomingPositionOnSide - 1] ?? null)
      : null;

  return (
    <AppShell activeHref="/entrenar" backTo={{ href: "/entrenar", label: "Entrenar" }}>
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
        <div className="mt-2 flex items-center justify-between gap-2">
          <h2 className="text-xl font-semibold text-zinc-100">{currentExercise.exerciseNameEs}</h2>
          <YoutubeTechniqueLink
            nameEs={currentExercise.exerciseNameEs}
            nameEn={currentExercise.exerciseNameEn}
            isUnilateral={currentExercise.isUnilateral}
          />
        </div>
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
              // Keyed on updatedAt so a saved correction remounts the row
              // closed with fresh values, while a rejected one stays open
              // showing its error.
              <EditableSetRow
                key={`${set.id}:${set.updatedAt?.getTime() ?? 0}`}
                set={set}
                edit={{
                  sessionId: session.id,
                  isUnilateral,
                  prescriptionType: currentExercise.prescriptionType,
                  targetRir: currentExercise.targetRir,
                  updateSetAction,
                  deleteSetAction,
                }}
              />
            ))}
          </div>
        ) : null}

        {previousPerformance && previousSuggestion ? (
          <div className="mt-4 rounded-2xl bg-zinc-950 p-3 ring-1 ring-sky-300/20">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
              Última vez
              {matchingPreviousSet
                ? ` · Set ${upcomingPositionOnSide}${isUnilateral ? (upcomingSide === "left" ? " · Izq" : " · Der") : ""}`
                : ""}
            </p>
            <div className="mt-2 grid gap-1 text-sm text-zinc-300">
              {matchingPreviousSet ? (
                <LoggedSetRow set={matchingPreviousSet} />
              ) : (
                <p className="text-xs leading-5 text-zinc-400">
                  {exerciseTargetReached ? "Series objetivo completadas." : "La vez pasada no llegaste a este set."}
                </p>
              )}
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
            <Link
              href="/guia?open=matematica"
              className="mt-2 inline-block text-xs font-semibold text-sky-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
            >
              ¿Por qué esta sugerencia?
            </Link>
          </div>
        ) : null}

        {restRemaining !== null && restRemaining > 0 ? (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-zinc-950 px-4 py-3 ring-1 ring-emerald-300/30">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Descanso</p>
              <p className="text-lg font-semibold text-emerald-300">{formatRestTime(restRemaining)}</p>
            </div>
            <button
              type="button"
              onClick={skipRest}
              className="min-h-11 rounded-xl bg-zinc-900 px-3 text-sm font-semibold text-zinc-300 ring-1 ring-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
            >
              Saltar descanso
            </button>
          </div>
        ) : null}

        {isLoggingAllowed ? (
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
                    disabled={leftSideComplete && !showBonusForm}
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
                    disabled={rightSideComplete && !showBonusForm}
                    className="sr-only"
                  />
                  Derecha
                </label>
              </div>
            ) : null}
            {isUnilateral && tieBreakUsedHint ? (
              <p className="text-xs leading-5 text-zinc-400">
                Según tus mediciones, tu lado {smallerSideHint === "left" ? "izquierdo" : "derecho"} es más delgado —
                se preseleccionó primero.
              </p>
            ) : null}
            {showThinnerSideCaution ? (
              <p className="text-xs leading-5 text-amber-200">
                Tu lado {smallerSideHint === "left" ? "izquierdo" : "derecho"} es el más delgado según tus mediciones
                — evita series extra ahí sin valoración profesional; considera hacer la serie extra en el lado más
                fuerte.
              </p>
            ) : null}
            {!isUnilateral ? <input type="hidden" name="side" value="bilateral" /> : null}

            {isDuration ? (
              <DurationSetInput defaultSeconds={defaultDurationSeconds} />
            ) : (
              <StrengthSetFields
                defaultWeightKg={defaultWeightKg}
                defaultReps={defaultReps}
                targetRir={currentExercise.targetRir}
              />
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
          <div className="mt-4 grid gap-3">
            <p className="text-sm leading-6 text-emerald-300">Series objetivo completadas para este ejercicio.</p>
            {isBonusSetJustSaved ? (
              targetSetsState.status === "updated" &&
              targetSetsState.exercisePrescriptionId === currentExercise.id &&
              targetSetsState.targetSets === bonusCount ? (
                <p role="status" className="text-sm leading-6 text-emerald-300">
                  Objetivo actualizado a {targetSetsState.targetSets} series{isUnilateral ? " por lado" : ""}.
                </p>
              ) : (
                <form
                  action={targetSetsFormAction}
                  className="flex flex-wrap items-center gap-2 rounded-2xl bg-zinc-900 px-3 py-2 ring-1 ring-zinc-800"
                >
                  <input type="hidden" name="workoutSessionId" value={session.id} />
                  <input type="hidden" name="exercisePrescriptionId" value={currentExercise.id} />
                  <input type="hidden" name="targetSets" value={bonusCount} />
                  <p className="flex-1 text-xs leading-5 text-zinc-300">
                    ¿Hacer esto tu nuevo objetivo? ({bonusCount} series{isUnilateral ? " por lado" : ""})
                  </p>
                  <SubmitButton className="min-h-9 rounded-xl bg-zinc-950 px-3 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-300/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
                    Actualizar plan
                  </SubmitButton>
                </form>
              )
            ) : null}
            <button
              type="button"
              onClick={() => setShowBonusForm(true)}
              className="min-h-11 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-zinc-300 ring-1 ring-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
            >
              + Agregar un set extra
            </button>
          </div>
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

/**
 * Editing stays available here, not just mid-session: a mislogged weight or a
 * set recorded against the wrong exercise is most often noticed after
 * finishing, and every progression read derives from set_log live rather than
 * from a snapshot taken at completion — so a later correction simply makes
 * the next session's suggestion right.
 */
function CompletedSessionSummary({
  session,
  template,
  exercises,
  updateSetAction,
  deleteSetAction,
}: {
  session: WorkoutSession;
  template: PlanSessionTemplate;
  exercises: ExerciseWithLoggedSets[];
  updateSetAction: (prevState: EditSetActionState, formData: FormData) => Promise<EditSetActionState>;
  deleteSetAction: (prevState: EditSetActionState, formData: FormData) => Promise<EditSetActionState>;
}) {
  return (
    <AppShell activeHref="/entrenar" backTo={{ href: "/entrenar", label: "Entrenar" }}>
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
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold text-zinc-100">{exercise.exerciseNameEs}</h2>
              <YoutubeTechniqueLink
                nameEs={exercise.exerciseNameEs}
                nameEn={exercise.exerciseNameEn}
                isUnilateral={exercise.isUnilateral}
              />
            </div>
            {exercise.loggedSets.length === 0 ? (
              <p className="mt-1 text-sm text-zinc-400">Sin series registradas.</p>
            ) : (
              <div className="mt-2 grid gap-2 text-sm text-zinc-300">
                {exercise.loggedSets.map((set) => (
                  <EditableSetRow
                    key={`${set.id}:${set.updatedAt?.getTime() ?? 0}`}
                    set={set}
                    edit={{
                      sessionId: session.id,
                      isUnilateral: exercise.isUnilateral,
                      prescriptionType: exercise.prescriptionType,
                      targetRir: exercise.targetRir,
                      updateSetAction,
                      deleteSetAction,
                    }}
                  />
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </AppShell>
  );
}

type EditSetProps = {
  sessionId: string;
  isUnilateral: boolean;
  prescriptionType: "strength" | "duration";
  targetRir: number | null;
  updateSetAction: (prevState: EditSetActionState, formData: FormData) => Promise<EditSetActionState>;
  deleteSetAction: (prevState: EditSetActionState, formData: FormData) => Promise<EditSetActionState>;
};

/**
 * A logged set with an inline correction editor.
 *
 * Correcting a set matters beyond convenience: an un-editable log means a
 * mistyped rep count keeps driving progression (a 8-logged-as-18 makes
 * reachedTopOfRange fire and prefills a heavier weight next session), and a
 * mistyped pain score silently disables the pain brake. So the editor accepts
 * exactly the same values a fresh log does — it reuses the same form fields
 * and the same server-side parser — and never touches setNumber or which
 * exercise the set belongs to.
 *
 * Logging a set against the *wrong exercise* is fixed by deleting it here and
 * re-logging under the right one (the runner's Anterior/Siguiente navigation
 * already gets you there), rather than by a move: re-inserting into another
 * exercise's sequence could silently flip a set between planned and bonus on
 * both exercises, since splitPlannedAndBonusSets classifies by position.
 *
 * Callers key this on `set.updatedAt` so a successful save remounts the row
 * closed with fresh values, while a validation error keeps it open with the
 * message — no extra open/closed state machine needed.
 */
function EditableSetRow({ set, edit }: { set: SetLog; edit: EditSetProps }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [updateState, updateFormAction] = useActionState(edit.updateSetAction, initialEditSetState);
  const [deleteState, deleteFormAction] = useActionState(edit.deleteSetAction, initialEditSetState);

  if (!isOpen) {
    return (
      <LoggedSetRow
        set={set}
        action={
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="min-h-11 shrink-0 rounded-xl px-2 text-xs font-semibold text-zinc-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
          >
            Editar
          </button>
        }
      />
    );
  }

  const errorMessage =
    updateState.status === "error"
      ? updateState.message
      : deleteState.status === "error"
        ? deleteState.message
        : null;

  return (
    // px-2 rather than a uniform p-3: this editor is nested one level deeper
    // than the main logging form, and the extra side padding is enough to
    // clip the ± stepper's own value (see .input-stepper in globals.css).
    <form action={updateFormAction} className="grid gap-3 rounded-xl bg-zinc-950 px-2 py-3 ring-1 ring-emerald-300/30">
      <input type="hidden" name="workoutSessionId" value={edit.sessionId} />
      <input type="hidden" name="setLogId" value={set.id} />
      <input type="hidden" name="prescriptionType" value={edit.prescriptionType} />

      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Corregir set {set.setNumber}</p>

      {edit.isUnilateral ? (
        <div className="grid grid-cols-2 gap-2">
          {(["left", "right"] as const).map((side) => (
            <label
              key={side}
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-3 py-3 text-sm font-semibold ring-1 ring-zinc-800 has-[:checked]:bg-emerald-300 has-[:checked]:text-zinc-950 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-emerald-300"
            >
              {/* No disabled state here, unlike the logging form: this set
                  already exists, so either side is a legitimate correction. */}
              <input
                type="radio"
                name="side"
                value={side}
                defaultChecked={set.side === side}
                className="sr-only"
              />
              {side === "left" ? "Izquierda" : "Derecha"}
            </label>
          ))}
        </div>
      ) : (
        <input type="hidden" name="side" value={set.side} />
      )}

      {edit.prescriptionType === "duration" ? (
        <DurationSetInput defaultSeconds={set.actualDurationSeconds ?? ""} />
      ) : (
        <StrengthSetFields
          defaultWeightKg={set.actualWeightKg === null ? "" : roundKgValue(set.actualWeightKg, 2)}
          defaultReps={set.actualReps ?? ""}
          targetRir={edit.targetRir}
          selectedRir={set.rir}
        />
      )}

      <label className="grid gap-1 text-sm font-medium text-zinc-300">
        <span>Dolor (0-10)</span>
        <input
          name="painScore"
          type="number"
          inputMode="numeric"
          min={0}
          max={10}
          defaultValue={set.painScore}
          required
          className="input"
        />
      </label>

      <label className="grid gap-1 text-sm font-medium text-zinc-300">
        <span>Notas (opcional)</span>
        <textarea name="notes" rows={2} defaultValue={set.notes ?? ""} className="input resize-none" />
      </label>

      {errorMessage ? (
        <p role="alert" className="text-sm leading-6 text-amber-200">
          {errorMessage}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="min-h-12 rounded-2xl bg-zinc-900 text-sm font-semibold text-zinc-300 ring-1 ring-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
        >
          Cancelar
        </button>
        <SubmitButton className="min-h-12 rounded-2xl bg-emerald-300 text-sm font-semibold text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-100">
          Guardar cambios
        </SubmitButton>
      </div>

      {isConfirmingDelete ? (
        <div className="grid gap-2 rounded-xl bg-zinc-900 p-3 ring-1 ring-amber-200/30">
          <p className="text-xs leading-5 text-amber-200">
            ¿Borrar el set {set.setNumber}? Las series siguientes se renumeran. Si lo registraste en el ejercicio
            equivocado, bórralo aquí y vuelve a registrarlo en el correcto.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setIsConfirmingDelete(false)}
              className="min-h-11 rounded-xl bg-zinc-950 text-xs font-semibold text-zinc-300 ring-1 ring-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
            >
              Cancelar
            </button>
            {/* formNoValidate: deleting must work even if the edit fields
                above are momentarily invalid — otherwise the browser blocks
                the submit on a field the user is about to discard anyway. */}
            <SubmitButton
              formAction={deleteFormAction}
              formNoValidate
              className="min-h-11 rounded-xl bg-amber-200 text-xs font-semibold text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-100"
            >
              Sí, borrar
            </SubmitButton>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsConfirmingDelete(true)}
          className="min-h-11 rounded-xl text-xs font-semibold text-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
        >
          Borrar este set
        </button>
      )}
    </form>
  );
}

function LoggedSetRow({ set, action }: { set: SetLog; action?: React.ReactNode }) {
  const sideLabel = set.side !== "bilateral" ? ` · ${set.side === "left" ? "Izq" : "Der"}` : "";

  return (
    <div className="rounded-xl bg-zinc-950 px-3 py-2 text-sm ring-1 ring-zinc-800">
      <div className="flex items-center justify-between">
        <span className="text-zinc-300">
          Set {set.setNumber}
          {sideLabel}
          {set.updatedAt !== null ? <span className="ml-1 text-xs text-zinc-500">· editado</span> : null}
        </span>
        <span className="flex items-center gap-1">
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
          {action}
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

function StrengthSetFields({
  defaultWeightKg,
  defaultReps,
  targetRir,
  selectedRir,
}: {
  defaultWeightKg: number | "";
  defaultReps: number | "";
  targetRir: number | null;
  // When correcting an already-logged set, the checked RIR is whatever was
  // actually recorded — not the plan's target, which is only a sensible
  // default for a set that hasn't happened yet. `?? targetRir` (not `||`)
  // so a genuine RIR of 0 stays selected.
  selectedRir?: number | null;
}) {
  const checkedRir = selectedRir ?? targetRir;
  const [weight, setWeight] = useState<number | "">(defaultWeightKg);
  const [reps, setReps] = useState<number | "">(defaultReps);

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <NumericStepperField
          label="Peso (kg)"
          name="actualWeightKg"
          inputMode="decimal"
          step={0.5}
          min={0.5}
          max={999}
          value={weight}
          onChange={setWeight}
        />
        <NumericStepperField
          label="Reps"
          name="actualReps"
          inputMode="numeric"
          step={1}
          min={1}
          max={50}
          value={reps}
          onChange={setReps}
        />
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
                defaultChecked={value === checkedRir}
                className="sr-only"
              />
              {toDisplayRir(value)}
            </label>
          ))}
        </div>
      </div>
    </>
  );
}

// A small ± stepper beside the numeric field itself, so weight/reps can be
// adjusted with one thumb without opening the iOS keyboard for every set —
// mirrors the plate/rep-increment steppers competitor logging apps use.
function NumericStepperField({
  label,
  name,
  inputMode,
  step,
  min,
  max,
  value,
  onChange,
}: {
  label: string;
  name: string;
  inputMode: "decimal" | "numeric";
  step: number;
  min: number;
  max: number;
  value: number | "";
  onChange: (value: number | "") => void;
}) {
  const inputId = useId();

  function adjust(delta: number) {
    const base = value === "" ? min - delta : value;
    const next = Math.min(max, Math.max(min, Number((base + delta).toFixed(2))));
    onChange(next);
  }

  return (
    <div className="grid gap-1 text-sm font-medium text-zinc-300">
      {/* Explicit htmlFor, not a wrapping <label>: a <label> only implicitly
          associates with the first labelable descendant, which would be the
          minus button here, not the input. */}
      <label htmlFor={inputId}>{label}</label>
      <div className="grid grid-cols-[2.75rem_1fr_2.75rem] items-center gap-1.5">
        <button
          type="button"
          onClick={() => adjust(-step)}
          aria-label={`Restar ${step}`}
          className="flex h-11 items-center justify-center rounded-xl bg-zinc-950 text-lg font-semibold text-zinc-300 ring-1 ring-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
        >
          −
        </button>
        <input
          id={inputId}
          name={name}
          type="number"
          inputMode={inputMode}
          step={step}
          min={min}
          max={max}
          value={value}
          onChange={(event) => onChange(event.target.value === "" ? "" : Number(event.target.value))}
          required
          className="input input-stepper text-center"
        />
        <button
          type="button"
          onClick={() => adjust(step)}
          aria-label={`Sumar ${step}`}
          className="flex h-11 items-center justify-center rounded-xl bg-zinc-950 text-lg font-semibold text-zinc-300 ring-1 ring-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
        >
          +
        </button>
      </div>
    </div>
  );
}

// Starts a non-blocking rest countdown the moment a new set is saved for the
// exercise currently on screen. A ref (not just state) tracks which save was
// already handled so navigating back to an exercise after the timer already
// ran/was skipped doesn't restart it — only a genuinely new save does.
function useRestTimer({
  justSavedThisExercise,
  saveState,
  restSeconds,
  exerciseIndex,
}: {
  justSavedThisExercise: boolean;
  saveState: SaveSetActionState;
  restSeconds: number;
  exerciseIndex: number;
}) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const lastHandledSetRef = useRef<string | null>(null);

  // Resetting on an exerciseIndex change during render (React's documented
  // "adjusting state when a prop changes" pattern) instead of in an effect —
  // avoids the extra render an effect-based reset would cause.
  const [lastExerciseIndex, setLastExerciseIndex] = useState(exerciseIndex);
  if (exerciseIndex !== lastExerciseIndex) {
    setLastExerciseIndex(exerciseIndex);
    if (remaining !== null) {
      setRemaining(null);
    }
  }

  useEffect(() => {
    if (!justSavedThisExercise || saveState.status !== "saved" || restSeconds <= 0) {
      return;
    }
    const signature = `${saveState.exercisePrescriptionId}:${saveState.setNumber}`;
    if (lastHandledSetRef.current === signature) {
      return;
    }
    lastHandledSetRef.current = signature;
    setRemaining(restSeconds);
  }, [justSavedThisExercise, saveState, restSeconds]);

  useEffect(() => {
    if (remaining === null || remaining <= 0) {
      return;
    }
    const timer = setTimeout(() => {
      setRemaining((current) => (current !== null ? current - 1 : current));
    }, 1000);
    return () => clearTimeout(timer);
  }, [remaining]);

  useEffect(() => {
    if (remaining === 0 && typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(200);
    }
  }, [remaining]);

  return { remaining, skip: () => setRemaining(null) };
}

function formatRestTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
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
