import Link from "next/link";

import { formatKg } from "@/lib/format";
import type { PlanSessionTemplate } from "@/plans/plan-repository";
import { rpeLabelsEs, rpeValues } from "@/training/rpe";
import type { FinishSummary, UnfinishedExercise } from "@/workouts/session-finish";

import { AppShell } from "../../../app-shell";
import { SubmitButton } from "../../../submit-button";
import { RecapTile } from "../session-runner";

export function FinishSessionView({
  sessionId,
  template,
  summary,
  returnToExerciseId,
  completeSessionAction,
}: {
  sessionId: string;
  template: PlanSessionTemplate;
  summary: FinishSummary;
  /** Which exercise the athlete left, so cancelling returns them to it. */
  returnToExerciseId: string | null;
  completeSessionAction: (formData: FormData) => Promise<void>;
}) {
  const backHref = returnToExerciseId
    ? `/entrenar/${sessionId}?ejercicio=${encodeURIComponent(returnToExerciseId)}`
    : `/entrenar/${sessionId}`;
  const hasUnfinished = summary.unfinished.length > 0;

  return (
    // AppShell renders "← Volver a {label}", so the label must read as a bare
    // noun phrase. "el entrenamiento" produced "Volver a el entrenamiento",
    // which Spanish contracts to "al"; every other call site passes a bare noun.
    <AppShell
      activeHref="/entrenar"
      backTo={{ href: backHref, label: "tu entrenamiento" }}
      showBrandBar={false}
    >
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-400">Día {template.dayIndex}</p>
        <h1 className="text-2xl font-semibold tracking-tight">Terminar entrenamiento</h1>
        <p className="text-sm leading-6 text-zinc-400">{template.nameEs}</p>
      </header>

      <p className="mt-6 text-xl font-semibold text-zinc-100">
        {summary.completedCount} de {summary.exerciseCount}{" "}
        {summary.exerciseCount === 1 ? "ejercicio completo" : "ejercicios completos"}
      </p>

      {/* The unfinished list is navigation, not a scolding: every row is a way
          back into the work. That is what makes this screen worth its extra
          tap instead of reading as a nag. */}
      {hasUnfinished ? (
        <section className="mt-4" aria-labelledby="te-faltan">
          <h2
            id="te-faltan"
            className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400"
          >
            Te faltan
          </h2>
          <ul className="mt-2 grid gap-2">
            {summary.unfinished.map((exercise) => (
              <li key={exercise.id}>
                <Link
                  href={`/entrenar/${sessionId}?ejercicio=${encodeURIComponent(exercise.id)}`}
                  className="flex min-h-12 items-center justify-between gap-3 rounded-2xl bg-zinc-900 px-4 py-3 ring-1 ring-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-zinc-100">
                      {exercise.exerciseNameEs}
                    </span>
                    <span className="block text-xs leading-5 text-zinc-400">{progressLabelEs(exercise)}</span>
                  </span>
                  <span aria-hidden className="shrink-0 text-lg text-zinc-500">
                    ›
                  </span>
                  <span className="sr-only">Ir a este ejercicio</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Completaste todos los ejercicios de la sesión.
        </p>
      )}

      {/* Plain counts and sums of what is already loaded. Deliberately not the
          post-workout recap: how many exercises improved and whether anything
          was a record need two extra history queries, and they are results —
          they belong to the summary after finishing, not to a preview of it. */}
      <section className="mt-5 grid grid-cols-3 gap-2 text-center" aria-label="Lo que llevas registrado">
        <RecapTile
          label="Duración"
          value={summary.elapsedMinutes !== null ? `${summary.elapsedMinutes} min` : "—"}
        />
        <RecapTile label="Series registradas" value={String(summary.loggedSetCount)} />
        <RecapTile label="Volumen" value={formatKg(summary.totalVolumeLoadKg, 0)} />
      </section>

      {/* Expanded, not a disclosure. This is the one screen where these two
          fields compete with nothing — as a collapsed row beside the old
          finish button they were both easy to miss and easy to mistake for
          the button itself. */}
      <form action={completeSessionAction} className="mt-6 grid gap-3">
        <input type="hidden" name="workoutSessionId" value={sessionId} />
        <h2 className="text-lg font-semibold text-zinc-100">¿Cómo te sentiste?</h2>
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
        <p className="text-xs leading-5 text-zinc-500">Los dos campos son opcionales.</p>

        {hasUnfinished ? (
          <p className="text-sm leading-6 text-zinc-400">
            Al terminar, la sesión se cierra y las series que falten quedan sin registrar.
          </p>
        ) : null}

        {/* Confirm sits below the unfinished list on purpose: the thumb has to
            travel past what it is about to abandon. That travel is the safety
            mechanism, so this is deliberately not a sticky action bar. */}
        <div className="mb-10 grid grid-cols-2 gap-3">
          <Link
            href={backHref}
            className="flex min-h-12 items-center justify-center rounded-2xl bg-zinc-900 px-2 text-center text-sm font-semibold text-zinc-300 ring-1 ring-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
          >
            Volver al entrenamiento
          </Link>
          <SubmitButton
            pendingChildren="Terminando…"
            className="min-h-12 rounded-2xl bg-emerald-300 px-2 text-sm font-semibold text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-100"
          >
            Terminar entrenamiento
          </SubmitButton>
        </div>
      </form>
    </AppShell>
  );
}

function progressLabelEs(exercise: UnfinishedExercise): string {
  if (exercise.isUnilateral) {
    return `izq ${exercise.leftCount} de ${exercise.targetSets} · der ${exercise.rightCount} de ${exercise.targetSets}`;
  }
  return exercise.loggedCount === 0
    ? "Sin series registradas"
    : `${exercise.loggedCount} de ${exercise.targetSets} series`;
}
