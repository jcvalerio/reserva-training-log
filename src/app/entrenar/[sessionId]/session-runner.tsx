"use client";

import Link from "next/link";
import { useActionState, useEffect, useId, useRef, useState } from "react";

import { formatKg, roundKgValue } from "@/lib/format";
import type { PlanSessionTemplate } from "@/plans/plan-repository";
import { convertDurationValue, durationInputToSeconds, secondsToDurationInput } from "@/training/duration";
import type { DurationUnit } from "@/training/duration";
import { painLocationLabelsEs, painLocations } from "@/training/muscle-taxonomy";
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
import type { SessionRecap } from "@/workouts/session-recap";
import {
  isSymptomReason,
  substitutionReasonLabelsEs,
  substitutionReasons,
  type SubstitutionReason,
} from "@/workouts/exercise-substitution";
import type { ExerciseWithLoggedSets, SetLog, WorkoutSession } from "@/workouts/workout-repository";

import { AppShell } from "../../app-shell";
import { SubmitButton } from "../../submit-button";
import { YoutubeTechniqueLink } from "../../youtube-technique-link";
import type {
  EditSetActionState,
  SaveSetActionState,
  SubstituteExerciseActionState,
  UpdateTargetSetsActionState,
} from "../actions";

const initialSaveSetState: SaveSetActionState = { status: "idle" };
const initialUpdateTargetSetsState: UpdateTargetSetsActionState = { status: "idle" };
const initialEditSetState: EditSetActionState = { status: "idle" };
const initialSubstituteState: SubstituteExerciseActionState = { status: "idle" };

export function SessionRunner({
  session,
  template,
  exercises,
  recap,
  saveSetAction,
  completeSessionAction,
  updateTargetSetsAction,
  updateSetAction,
  deleteSetAction,
  substituteExerciseAction,
  substitutesByExerciseId,
  planSubstituteChoices,
  smallerSideHint,
}: {
  session: WorkoutSession;
  template: PlanSessionTemplate;
  exercises: ExerciseWithLoggedSets[];
  /** Only computed by the server page when session.status === "completed". */
  recap: SessionRecap | null;
  saveSetAction: (prevState: SaveSetActionState, formData: FormData) => Promise<SaveSetActionState>;
  completeSessionAction: (formData: FormData) => Promise<void>;
  updateTargetSetsAction: (
    prevState: UpdateTargetSetsActionState,
    formData: FormData,
  ) => Promise<UpdateTargetSetsActionState>;
  updateSetAction: (prevState: EditSetActionState, formData: FormData) => Promise<EditSetActionState>;
  deleteSetAction: (prevState: EditSetActionState, formData: FormData) => Promise<EditSetActionState>;
  substituteExerciseAction: (
    prevState: SubstituteExerciseActionState,
    formData: FormData,
  ) => Promise<SubstituteExerciseActionState>;
  substitutesByExerciseId: Record<string, { exerciseNameEs: string }[]>;
  planSubstituteChoices: { exerciseNameEs: string }[];
  smallerSideHint: "left" | "right" | null;
}) {
  const [exerciseIndex, setExerciseIndex] = useState(() => {
    const firstIncomplete = exercises.findIndex((exercise) => !isExerciseComplete(exercise));
    return firstIncomplete === -1 ? Math.max(exercises.length - 1, 0) : firstIncomplete;
  });
  const [saveState, formAction] = useActionState(saveSetAction, initialSaveSetState);
  const [targetSetsState, targetSetsFormAction] = useActionState(updateTargetSetsAction, initialUpdateTargetSetsState);
  const [substituteState, substituteFormAction] = useActionState(substituteExerciseAction, initialSubstituteState);
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
  // Drives whether the "¿dónde te duele?" select is shown. Local rather than
  // read off the form, because the input is uncontrolled and this is the only
  // thing that needs to react to it.
  const [painScoreInput, setPainScoreInput] = useState(0);
  const [showBonusForm, setShowBonusForm] = useState(false);
  // The swap panel follows the same reset rule: moving to another exercise
  // should never leave a half-filled "cambiar ejercicio" form open against the
  // wrong exercise.
  const [showSubstitutePanel, setShowSubstitutePanel] = useState(false);
  const [lastBonusExerciseIndex, setLastBonusExerciseIndex] = useState(exerciseIndex);
  if (exerciseIndex !== lastBonusExerciseIndex) {
    setLastBonusExerciseIndex(exerciseIndex);
    if (showBonusForm) {
      setShowBonusForm(false);
    }
    if (showSubstitutePanel) {
      setShowSubstitutePanel(false);
    }
  }
  // Swapping is a commitment to do the replacement now, so land on it rather
  // than leaving the athlete on the exercise they just rejected. Handled once
  // per swap via the same render-time state adjustment used above.
  const substituteKey =
    substituteState.status === "substituted"
      ? `${substituteState.originalPrescriptionId}:${substituteState.exerciseNameEs}`
      : null;
  const [lastHandledSubstituteKey, setLastHandledSubstituteKey] = useState<string | null>(null);
  if (substituteKey !== null && substituteKey !== lastHandledSubstituteKey) {
    setLastHandledSubstituteKey(substituteKey);
    setShowSubstitutePanel(false);
    const swappedToIndex = exercises.findIndex(
      (exercise) =>
        exercise.substitutedForPrescriptionId !== null &&
        exercise.exerciseNameEs === (substituteState as { exerciseNameEs: string }).exerciseNameEs,
    );
    if (swappedToIndex !== -1) {
      setExerciseIndex(swappedToIndex);
      setLastBonusExerciseIndex(swappedToIndex);
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
        recap={recap}
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

        {isLoggingAllowed && !showSubstitutePanel ? (
          <button
            type="button"
            onClick={() => setShowSubstitutePanel(true)}
            className="mt-3 min-h-11 rounded-xl px-2 text-xs font-semibold text-sky-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
          >
            Cambiar ejercicio
          </button>
        ) : null}

        {showSubstitutePanel ? (
          <SubstituteExercisePanel
            sessionId={session.id}
            exercise={currentExercise}
            existingSubstitutes={substitutesByExerciseId[currentExercise.id] ?? []}
            planChoices={planSubstituteChoices}
            state={substituteState}
            formAction={substituteFormAction}
            onClose={() => setShowSubstitutePanel(false)}
          />
        ) : null}

        <LoggedSetsList
          sets={currentExercise.loggedSets}
          isUnilateral={isUnilateral}
          targetSets={currentExercise.targetSets}
          className="mt-4 grid gap-2"
          renderRow={(set, displayNumber) => (
            // Keyed on updatedAt so a saved correction remounts the row
            // closed with fresh values, while a rejected one stays open
            // showing its error.
            <EditableSetRow
              key={`${set.id}:${set.updatedAt?.getTime() ?? 0}`}
              set={set}
              displayNumber={displayNumber}
              edit={{
                sessionId: session.id,
                isUnilateral,
                prescriptionType: currentExercise.prescriptionType,
                targetRir: currentExercise.targetRir,
                updateSetAction,
                deleteSetAction,
              }}
            />
          )}
        />

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

            {previousPerformance.sets.length > 0 ? (
              // Keyed on the exercise so moving to "Siguiente ejercicio"
              // always remounts this closed, instead of carrying an earlier
              // exercise's expanded state onto one nobody asked to see yet.
              <details key={currentExercise.id} className="mt-3 rounded-xl bg-zinc-900/60 ring-1 ring-sky-300/20">
                <summary className="flex min-h-11 cursor-pointer items-center px-3 text-xs font-semibold text-sky-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300">
                  {previousPerformance.sets.length === 1
                    ? "Ver la serie de la vez pasada"
                    : `Ver las ${previousPerformance.sets.length} series de la vez pasada`}
                </summary>
                <LoggedSetsList
                  sets={previousPerformance.sets}
                  isUnilateral={previousPerformance.isUnilateral}
                  targetSets={previousPerformance.targetSets}
                  className="grid gap-2 px-3 pb-3 pt-2"
                  renderRow={(set, displayNumber) => (
                    <LoggedSetRow key={set.id} set={set} displayNumber={displayNumber} />
                  )}
                />
              </details>
            ) : null}

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
                onChange={(event) => setPainScoreInput(Number(event.target.value) || 0)}
              />
            </label>

            {/* Only once there is pain to locate. Every set logged to date
                carries pain 0, so in the normal flow this never appears and
                costs nothing — but when it does appear it turns the
                pain-by-joint report from an inference into a measurement. */}
            {painScoreInput > 0 ? (
              <label className="grid gap-1 text-sm font-medium text-zinc-300">
                <span>¿Dónde te duele?</span>
                <select name="painLocation" defaultValue="" className="input">
                  <option value="">Sin especificar</option>
                  {painLocations.map((location) => (
                    <option key={location} value={location}>
                      {painLocationLabelsEs[location]}
                    </option>
                  ))}
                </select>
                <span className="text-xs leading-5 text-zinc-400">
                  Las agujetas y el dolor articular no son lo mismo. Anotarlo deja ver si una articulación se queja
                  siempre en el mismo movimiento.
                </span>
              </label>
            ) : null}

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
  recap,
  updateSetAction,
  deleteSetAction,
}: {
  session: WorkoutSession;
  template: PlanSessionTemplate;
  exercises: ExerciseWithLoggedSets[];
  recap: SessionRecap | null;
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

      {recap ? <SessionRecapCard recap={recap} /> : null}

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
              <LoggedSetsList
                sets={exercise.loggedSets}
                isUnilateral={exercise.isUnilateral}
                targetSets={exercise.targetSets}
                className="mt-2 grid gap-2 text-sm text-zinc-300"
                renderRow={(set, displayNumber) => (
                  <EditableSetRow
                    key={`${set.id}:${set.updatedAt?.getTime() ?? 0}`}
                    set={set}
                    displayNumber={displayNumber}
                    edit={{
                      sessionId: session.id,
                      isUnilateral: exercise.isUnilateral,
                      prescriptionType: exercise.prescriptionType,
                      targetRir: exercise.targetRir,
                      updateSetAction,
                      deleteSetAction,
                    }}
                  />
                )}
              />
            )}
          </article>
        ))}
      </div>
    </AppShell>
  );
}

/**
 * Duration, sets, and volume are all trivially available from what was just
 * logged; the improvement line reuses computeExerciseImprovement verbatim
 * (via buildExerciseImprovements) rather than a second comparison. Honest by
 * construction — no claimed personal record here, since that needs an
 * all-time-best query this app doesn't have yet. No colour coding either:
 * the app's own rule reserves colour for pain, not for "didn't improve."
 */
function SessionRecapCard({ recap }: { recap: SessionRecap }) {
  return (
    <section className="mt-5 rounded-3xl bg-zinc-900 p-4 ring-1 ring-zinc-800" aria-label="Resumen de la sesión">
      <div className="grid grid-cols-3 gap-2 text-center">
        <RecapTile label="Duración" value={recap.durationMinutes !== null ? `${recap.durationMinutes} min` : "—"} />
        <RecapTile label="Series completadas" value={String(recap.completedSetCount)} />
        <RecapTile label="Volumen" value={formatKg(recap.totalVolumeLoadKg, 0)} />
      </div>
      {recap.comparableCount > 0 ? (
        <p className="mt-3 text-sm leading-6 text-zinc-300">
          {recap.improvedCount} de {recap.comparableCount}{" "}
          {recap.comparableCount === 1 ? "ejercicio mejoró" : "ejercicios mejoraron"} vs. tu sesión anterior.
        </p>
      ) : null}
    </section>
  );
}

function RecapTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-zinc-950 px-2 py-3 ring-1 ring-zinc-800">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-zinc-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-zinc-100">{value}</p>
    </div>
  );
}

/**
 * "Cambiar ejercicio" — the busy/broken machine case, and the "no me siento
 * bien para este movimiento" case.
 *
 * Placed on the exercise card itself rather than behind a menu, because the
 * decision happens standing in front of an occupied machine. Reason first,
 * then what you're doing instead: the reason isn't bookkeeping, it's the only
 * record that anything was wrong when the answer is "no me sentí bien" — the
 * original ends the session with no logged sets, so nothing else captures it.
 *
 * The app deliberately doesn't grade the swap. With no muscle-group taxonomy
 * in this schema it cannot tell whether an alternative preserves the movement
 * pattern, and inventing a confident-sounding warning it can't back would be
 * worse than staying quiet.
 */
function SubstituteExercisePanel({
  sessionId,
  exercise,
  existingSubstitutes,
  planChoices,
  state,
  formAction,
  onClose,
}: {
  sessionId: string;
  exercise: ExerciseWithLoggedSets;
  existingSubstitutes: { exerciseNameEs: string }[];
  planChoices: { exerciseNameEs: string }[];
  state: SubstituteExerciseActionState;
  formAction: (formData: FormData) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<SubstitutionReason>("machine_busy");
  const [name, setName] = useState("");
  const choices = planChoices.filter(
    (choice) => choice.exerciseNameEs.toLocaleLowerCase("es") !== exercise.exerciseNameEs.toLocaleLowerCase("es"),
  );
  // Empty whenever the name was typed rather than picked, so the picker shows
  // its placeholder instead of a stale unrelated selection.
  const selectedFromPlan = choices.some((choice) => choice.exerciseNameEs === name) ? name : "";

  return (
    <form action={formAction} className="mt-4 grid gap-3 rounded-2xl bg-zinc-950 px-3 py-4 ring-1 ring-sky-300/30">
      <input type="hidden" name="workoutSessionId" value={sessionId} />
      <input type="hidden" name="originalPrescriptionId" value={exercise.id} />
      <input type="hidden" name="reason" value={reason} />
      <input type="hidden" name="exerciseNameEs" value={name} />

      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Cambiar ejercicio</p>
      <p className="leading-6 text-zinc-400">
        Mantendrás las mismas series, reps, RIR y descanso de {exercise.exerciseNameEs}.
      </p>

      <div className="grid gap-1">
        <span className="font-medium text-zinc-300">¿Por qué lo cambias?</span>
        <div className="grid grid-cols-2 gap-2">
          {substitutionReasons.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setReason(value)}
              aria-pressed={reason === value}
              className={`min-h-12 rounded-xl px-2 font-semibold ring-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${
                reason === value
                  ? "bg-sky-300 text-zinc-950 ring-sky-300"
                  : "bg-zinc-900 text-zinc-300 ring-zinc-800"
              }`}
            >
              {substitutionReasonLabelsEs[value]}
            </button>
          ))}
        </div>
      </div>

      {isSymptomReason(reason) ? (
        <p className="leading-6 text-amber-200">
          Queda registrado que este movimiento no se sintió bien. Si aparece dolor en el ejercicio que hagas en su
          lugar, anótalo en la serie — el dolor manda antes que la carga.
        </p>
      ) : null}

      {existingSubstitutes.length > 0 ? (
        <div className="grid gap-1">
          <span className="font-medium text-zinc-300">Ya usaste antes</span>
          <div className="grid gap-2">
            {existingSubstitutes.map((choice) => (
              <button
                key={choice.exerciseNameEs}
                type="button"
                onClick={() => setName(choice.exerciseNameEs)}
                aria-pressed={name === choice.exerciseNameEs}
                className={`min-h-12 rounded-xl px-3 text-left font-semibold ring-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${
                  name === choice.exerciseNameEs
                    ? "bg-sky-300 text-zinc-950 ring-sky-300"
                    : "bg-zinc-900 text-zinc-300 ring-zinc-800"
                }`}
              >
                {choice.exerciseNameEs}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* One question, two ways to answer it — the text field and the picker
          drive the same value, so the picker is controlled off `name` rather
          than pinned to "". Pinned to "" it snapped straight back to the
          placeholder after every choice, which read as though the tap hadn't
          registered even though the name had in fact been filled in above. */}
      <div className="grid gap-2">
        <span className="font-medium text-zinc-300">¿Qué vas a hacer en su lugar?</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Escribe la máquina o ejercicio"
          aria-label="¿Qué vas a hacer en su lugar?"
          className="input"
        />
        {/* A native <select> here rendered its options in the browser's own
            popup — unstyleable, visually unrelated to the rest of the app, and
            on desktop a full-height list that covered the panel. This is the
            same collapsed-accordion-plus-tappable-list pattern used for "ya
            usaste antes" above, so it looks like the app and stays out of the
            way until asked for. */}
        {choices.length > 0 ? (
          <details className="rounded-xl bg-zinc-900 ring-1 ring-zinc-800">
            <summary className="flex min-h-11 cursor-pointer items-center px-3 font-semibold text-zinc-300">
              O elígelo de tu plan
            </summary>
            <div className="grid max-h-64 gap-2 overflow-y-auto px-3 pb-3">
              {choices.map((choice) => (
                <button
                  key={choice.exerciseNameEs}
                  type="button"
                  onClick={() => setName(choice.exerciseNameEs)}
                  aria-pressed={selectedFromPlan === choice.exerciseNameEs}
                  className={`min-h-12 rounded-xl px-3 text-left font-semibold ring-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${
                    selectedFromPlan === choice.exerciseNameEs
                      ? "bg-sky-300 text-zinc-950 ring-sky-300"
                      : "bg-zinc-950 text-zinc-300 ring-zinc-800"
                  }`}
                >
                  {choice.exerciseNameEs}
                </button>
              ))}
            </div>
          </details>
        ) : null}
      </div>

      {state.status === "error" ? (
        <p role="alert" className="leading-6 text-amber-200">
          {state.message}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onClose}
          className="min-h-12 rounded-2xl bg-zinc-900 font-semibold text-zinc-300 ring-1 ring-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
        >
          Cancelar
        </button>
        <SubmitButton className="min-h-12 rounded-2xl bg-sky-300 font-semibold text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-100">
          Cambiar
        </SubmitButton>
      </div>
    </form>
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
function EditableSetRow({
  set,
  edit,
  displayNumber,
}: {
  set: SetLog;
  edit: EditSetProps;
  displayNumber?: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [updateState, updateFormAction] = useActionState(edit.updateSetAction, initialEditSetState);
  const [deleteState, deleteFormAction] = useActionState(edit.deleteSetAction, initialEditSetState);
  const shownNumber = displayNumber ?? set.setNumber;

  if (!isOpen) {
    return (
      <LoggedSetRow
        set={set}
        targetRir={edit.targetRir}
        displayNumber={displayNumber}
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

      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Corregir set {shownNumber}</p>

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
            ¿Borrar el set {shownNumber}? Las series siguientes se renumeran. Si lo registraste en el ejercicio
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

function LoggedSetRow({
  set,
  targetRir,
  displayNumber,
  action,
}: {
  set: SetLog;
  // Only meaningful for a strength set with a real target to compare
  // against — omitted entirely by callers with nothing sensible to compare
  // (e.g. the single "Última vez" reference row, whose target may not match
  // today's).
  targetRir?: number | null;
  // Overrides the shown set number for a row grouped into a per-side list
  // (position within that side, not the shared/global setNumber, which
  // interleaves both sides and would otherwise read as skipping numbers —
  // e.g. "Set 1, Set 3" in the left column). Falls back to the stored
  // setNumber when omitted.
  displayNumber?: number;
  action?: React.ReactNode;
}) {
  const sideLabel = set.side !== "bilateral" ? ` · ${set.side === "left" ? "Izq" : "Der"}` : "";
  const showRirTarget =
    set.actualDurationSeconds === null && set.rir !== null && targetRir !== undefined && targetRir !== null;
  const rirMismatch = showRirTarget && set.rir !== targetRir;
  // RIR counts down to failure (0 = failed the set, 4+ = easy), so an actual
  // *below* target means the set was harder than prescribed — the direction
  // worth a second look. Actual above target (more left in the tank) isn't a
  // caution, so it stays the same neutral color as every other number here.
  const rirHarderThanTarget = rirMismatch && (set.rir as number) < (targetRir as number);

  return (
    <div className="rounded-xl bg-zinc-950 px-3 py-2 text-sm ring-1 ring-zinc-800">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="text-zinc-300">
          Set {displayNumber ?? set.setNumber}
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
                {formatKg(set.actualWeightKg!, 2)} × {set.actualReps} · RIR{" "}
                <span className={rirHarderThanTarget ? "text-amber-200" : undefined}>
                  {formatStoredRir(set.rir ?? 0)}
                  {rirMismatch ? ` (obj. ${formatStoredRir(targetRir as number)})` : ""}
                </span>{" "}
                · dolor {set.painScore}
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
 * Renders a set list either flat (bilateral) or split into two labeled,
 * independently-numbered groups (unilateral) — one component so the live
 * session list, the completed-session summary, and the "última vez" history
 * all group the same way instead of drifting into three slightly different
 * layouts. Side groups are derived here at render time via a plain filter
 * (mirroring how leftCount/rightCount are already computed above) rather
 * than persisted anywhere, so nothing downstream that depends on the
 * original setNumber-ordered array is affected.
 */
function LoggedSetsList({
  sets,
  isUnilateral,
  targetSets,
  className,
  renderRow,
}: {
  sets: SetLog[];
  isUnilateral: boolean;
  targetSets: number;
  className: string;
  renderRow: (set: SetLog, displayNumber?: number) => React.ReactNode;
}) {
  if (sets.length === 0) {
    return null;
  }

  if (!isUnilateral) {
    return <div className={className}>{sets.map((set) => renderRow(set))}</div>;
  }

  const leftSets = sets.filter((set) => set.side === "left");
  const rightSets = sets.filter((set) => set.side === "right");

  return (
    <div className={className}>
      {leftSets.length > 0 ? (
        <div className="grid gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
            Izquierda · {leftSets.length}/{targetSets}
          </p>
          {leftSets.map((set, index) => renderRow(set, index + 1))}
        </div>
      ) : null}
      {rightSets.length > 0 ? (
        <div className="grid gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
            Derecha · {rightSets.length}/{targetSets}
          </p>
          {rightSets.map((set, index) => renderRow(set, index + 1))}
        </div>
      ) : null}
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
