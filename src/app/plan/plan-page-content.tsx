import Link from "next/link";

import type { M1Readiness, M1ReadinessStep, M1ReadinessStatus } from "@/onboarding/readiness";
import type { NonAiPlanGate } from "@/plans/plan-gate";
import type { PlanPreviewSummary } from "@/plans/plan-preview";

import { AppShell } from "../app-shell";
import { FormStatusBanner } from "../form-status-banner";
import { SubmitButton } from "../submit-button";

export function PlanPageContent({
  readiness,
  gate,
  showStartFork,
  activePlanPreview,
  activePlanError,
  activatedAt,
  justSaved,
  editActivePlanAction,
  cloneActivePlanAction,
}: {
  readiness: M1Readiness;
  gate: NonAiPlanGate;
  showStartFork: boolean;
  activePlanPreview: PlanPreviewSummary | null;
  activePlanError: boolean;
  activatedAt: Date | null;
  justSaved: boolean;
  editActivePlanAction: () => Promise<void>;
  cloneActivePlanAction: () => Promise<void>;
}) {
  const hasActivePlan = Boolean(activePlanPreview) || activePlanError;

  return (
    <AppShell activeHref="/plan">
      <header className="space-y-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-500">Plan</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {hasActivePlan
              ? "Tu plan"
              : gate.status === "manual_review_ready"
                ? "Revisión pre-plan"
                : "Preparación del plan"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            {activePlanPreview
              ? "Este es tu plan real, guardado y activo. Todavía no genera IA ni registra series."
              : activePlanError
                ? "Tu plan activo tiene datos inválidos y no se puede mostrar. Corrígelo desde el editor."
                : "Revisa si las bases mínimas están listas. Esta pantalla no genera IA y no persiste borradores."}
          </p>
        </div>
      </header>

      <FormStatusBanner
        saved={justSaved}
        error={false}
        savedMessage="Tu plan quedó activado. Puedes revisarlo aquí cuando quieras."
      />

      <section className={`mt-7 rounded-3xl bg-zinc-900 p-4 ring-1 ${gateRingClass(gate.status)}`}>
        <p className="text-sm font-semibold text-emerald-300">Estado seguro</p>
        <h2 className="mt-2 text-2xl font-semibold">{gate.titleEs}</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-300">{gate.descriptionEs}</p>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <StatusTile label="Bases" value={`${readiness.completedFoundationSteps}/${readiness.totalFoundationSteps}`} />
          <StatusTile label="IA" value="Apagada" />
          <StatusTile label="Plan" value={activePlanPreview ? "Activo" : activePlanError ? "Con errores" : "Sin crear"} />
        </div>

        <div className="mt-5 rounded-2xl bg-zinc-950 p-3 ring-1 ring-zinc-800">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Acción sugerida</p>
          <Link
            href={gate.ctaHref}
            className="mt-3 block rounded-2xl bg-emerald-300 px-5 py-4 text-center font-semibold text-zinc-950 shadow-lg shadow-emerald-950/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-100"
          >
            {gate.ctaLabelEs}
          </Link>
        </div>
      </section>

      <section className="mt-6 grid gap-3 pb-10" aria-labelledby="plan-checklist-title">
        <div>
          <p id="plan-checklist-title" className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-500">
            Checklist pre-plan
          </p>
          <p className="mt-1 text-sm leading-6 text-zinc-400">Tu perfil es la base mínima antes de cualquier revisión de plan.</p>
        </div>

        {readiness.steps.map((step) => (
          <PlanChecklistItem key={step.id} step={step} />
        ))}

        {activePlanPreview ? (
          <ActivePlanSummary
            summary={activePlanPreview}
            activatedAt={activatedAt}
            editActivePlanAction={editActivePlanAction}
            cloneActivePlanAction={cloneActivePlanAction}
          />
        ) : activePlanError ? (
          <ActivePlanErrorNotice editActivePlanAction={editActivePlanAction} />
        ) : showStartFork ? (
          <StartPlanFork />
        ) : null}

        {activePlanError || showStartFork ? null : (
          <CustomPlanBuilderEntry hasActivePlan={Boolean(activePlanPreview)} />
        )}

        <div className="rounded-2xl bg-zinc-900 p-4 text-sm leading-6 text-zinc-300 ring-1 ring-amber-300/30">
          La progresión futura seguirá siendo pain-aware: dolor &gt;2 bloquea aumentos agresivos y dolor &gt;3 exige
          reducir, modificar o cambiar el movimiento.
        </div>
      </section>
    </AppShell>
  );
}

export function StatusTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-zinc-950 px-2 py-3 ring-1 ring-zinc-800">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-zinc-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-zinc-100">{value}</p>
    </div>
  );
}

function PlanChecklistItem({ step }: { step: M1ReadinessStep }) {
  const content = (
    <article className="rounded-2xl bg-zinc-900 p-4 ring-1 ring-zinc-800">
      <div className="grid gap-3 min-[380px]:flex min-[380px]:items-start min-[380px]:justify-between">
        <div className="min-w-0">
          <h2 className="font-semibold text-zinc-100">{step.labelEs}</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-400">{step.descriptionEs}</p>
        </div>
        <span className={`w-fit shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${statusPillClass(step.status)}`}>
          {step.statusLabelEs}
        </span>
      </div>
    </article>
  );

  if (!step.href || step.id === "plan") {
    return content;
  }

  return (
    <Link
      href={step.href}
      aria-label={`Ir a ${step.labelEs}`}
      className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
    >
      {content}
    </Link>
  );
}

function StartPlanFork() {
  return (
    <section className="rounded-3xl bg-zinc-900 p-4 ring-1 ring-zinc-800" aria-labelledby="start-plan-fork-title">
      <p id="start-plan-fork-title" className="text-sm font-semibold text-zinc-100">
        ¿Cómo quieres empezar?
      </p>
      <p className="mt-2 text-sm leading-6 text-zinc-300">
        Elige una plantilla lista para usar o crea tu propia rutina desde cero. Ambas opciones son solo lectura hasta
        que las actives.
      </p>
      <div className="mt-4 grid gap-3">
        <Link
          href="/plan/templates"
          className="block rounded-2xl bg-emerald-300 px-5 py-4 text-center font-semibold text-zinc-950 shadow-lg shadow-emerald-950/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-100"
        >
          Usar una plantilla
        </Link>
        <Link
          href="/plan/builder"
          className="block rounded-2xl bg-zinc-950 px-5 py-4 text-center font-semibold text-emerald-300 ring-1 ring-emerald-300/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
        >
          Crear mi propio plan
        </Link>
      </div>
    </section>
  );
}

function ActivePlanErrorNotice({ editActivePlanAction }: { editActivePlanAction: () => Promise<void> }) {
  return (
    <section className="rounded-3xl bg-zinc-900 p-4 ring-1 ring-amber-300/30" aria-labelledby="active-plan-error-title">
      <p id="active-plan-error-title" className="text-sm font-semibold text-amber-200">
        Tu plan activo tiene un problema
      </p>
      <p className="mt-2 text-sm leading-6 text-zinc-300">
        Alguna sesión no cumple los requisitos mínimos (al menos 3 ejercicios por día). Edítalo para corregirlo; tu
        historial registrado no se pierde.
      </p>
      <form action={editActivePlanAction} className="mt-4">
        <SubmitButton className="w-full rounded-2xl bg-emerald-300 px-5 py-4 text-center font-semibold text-zinc-950 shadow-lg shadow-emerald-950/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-100">
          Editar este plan
        </SubmitButton>
      </form>
    </section>
  );
}

function CustomPlanBuilderEntry({ hasActivePlan }: { hasActivePlan: boolean }) {
  return (
    <section className="rounded-3xl bg-zinc-900 p-4 ring-1 ring-zinc-800" aria-labelledby="custom-plan-builder-title">
      <p id="custom-plan-builder-title" className="text-sm font-semibold text-zinc-100">
        ¿Prefieres tu propia rutina?
      </p>
      <p className="mt-2 text-sm leading-6 text-zinc-300">
        {hasActivePlan
          ? "Define tus propios días de entrenamiento y ejercicios, revísalos y actívalos cuando estén listos. Al activar tu plan personalizado, reemplaza el plan activo actual (tu historial registrado se mantiene visible en Progreso)."
          : "Define tus propios días de entrenamiento y ejercicios, revísalos y actívalos cuando estén listos."}
      </p>
      <Link
        href="/plan/builder"
        className="mt-4 block rounded-2xl bg-zinc-950 px-5 py-4 text-center font-semibold text-emerald-300 ring-1 ring-emerald-300/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
      >
        Crear mi propio plan
      </Link>
    </section>
  );
}

function ActivePlanSummary({
  summary,
  activatedAt,
  editActivePlanAction,
  cloneActivePlanAction,
}: {
  summary: PlanPreviewSummary;
  activatedAt: Date | null;
  editActivePlanAction: () => Promise<void>;
  cloneActivePlanAction: () => Promise<void>;
}) {
  return (
    <section className="rounded-3xl bg-zinc-900 p-4 ring-1 ring-emerald-300/30" aria-labelledby="active-plan-title">
      <p id="active-plan-title" className="text-sm font-semibold text-emerald-200">
        Tu plan activo
      </p>
      <h2 className="mt-2 text-xl font-semibold text-zinc-100">{summary.nameEs}</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-300">
        Este es tu plan real, guardado y activo. No viene de IA. El registro de series por RIR y dolor llega en la
        siguiente iteración.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {["Plan activo", "Sin IA", activatedAt ? `Activado ${formatActivatedAt(activatedAt)}` : "Activado"].map(
          (label) => (
            <span
              key={label}
              className="rounded-full bg-emerald-300/10 px-2 py-1 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-300/20"
            >
              {label}
            </span>
          ),
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <StatusTile label="Ejercicios" value={String(summary.exerciseCount)} />
        <StatusTile label="Días/sem" value={String(summary.daysPerWeek)} />
        <StatusTile label="Min" value={String(summary.sessionDurationMinutes)} />
      </div>

      <div className="mt-4 rounded-2xl bg-zinc-950 p-3 ring-1 ring-zinc-800">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Logging futuro por serie</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {summary.requiredSetLogFieldsEs.map((field) => (
            <span
              key={field}
              className="rounded-full bg-zinc-900 px-2 py-1 text-xs font-semibold text-zinc-300 ring-1 ring-zinc-800"
            >
              {field}
            </span>
          ))}
        </div>
      </div>

      <PlanSessionsList sessions={summary.sessions} />

      <div className="mt-4 grid grid-cols-2 gap-2">
        <form action={editActivePlanAction}>
          <SubmitButton className="w-full rounded-2xl bg-zinc-950 px-4 py-3 text-center text-sm font-semibold text-emerald-300 ring-1 ring-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
            Editar mi plan
          </SubmitButton>
        </form>
        <form action={cloneActivePlanAction}>
          <SubmitButton className="w-full rounded-2xl bg-zinc-950 px-4 py-3 text-center text-sm font-semibold text-emerald-300 ring-1 ring-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
            Duplicar como borrador
          </SubmitButton>
        </form>
      </div>
      <p className="mt-3 text-xs leading-5 text-zinc-500">
        Editar toma tu plan como borrador hasta que lo reactives; tu historial registrado no se pierde. Duplicar crea
        un borrador nuevo a partir de este plan sin afectar el que está activo.
      </p>
    </section>
  );
}

export function PlanSessionsList({ sessions }: { sessions: PlanPreviewSummary["sessions"] }) {
  return (
    <div className="mt-4 rounded-2xl bg-zinc-950 p-3 ring-1 ring-zinc-800">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Tu rutina</p>
      <div className="mt-3 grid gap-3">
        {sessions.map((session) => (
          <article key={session.dayIndex} className="rounded-2xl bg-zinc-900 p-3 ring-1 ring-zinc-800">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Día {session.dayIndex}</p>
            <h3 className="mt-1 font-semibold text-zinc-100">{session.nameEs}</h3>
            <p className="mt-1 text-sm leading-5 text-zinc-400">{session.focus}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full bg-zinc-950 px-2 py-1 text-zinc-300 ring-1 ring-zinc-800">
                {session.exerciseCount} ejercicios
              </span>
              {session.unilateralExerciseCount > 0 ? (
                <span className="rounded-full bg-emerald-300/10 px-2 py-1 text-emerald-300">unilateral</span>
              ) : null}
              {session.painSensitiveExerciseCount > 0 ? (
                <span className="rounded-full bg-amber-300/10 px-2 py-1 text-amber-200">dolor vigilado</span>
              ) : null}
            </div>

            <details className="mt-3 rounded-2xl bg-zinc-950 p-3 text-sm ring-1 ring-zinc-800">
              <summary className="min-h-12 cursor-pointer rounded-xl py-3 font-semibold text-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
                Ver ejercicios y objetivos
                <span className="ml-2 text-xs font-medium text-zinc-500">tocar para expandir</span>
              </summary>
              <div className="mt-3 grid gap-3">
                {session.exercises.map((exercise) => (
                  <div key={exercise.orderIndex} className="rounded-2xl bg-zinc-900 p-3 ring-1 ring-zinc-800">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 shrink-0 rounded-full bg-zinc-950 px-2 py-1 text-xs font-semibold text-zinc-400 ring-1 ring-zinc-800">
                        {exercise.orderIndex}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-zinc-100">{exercise.nameEs}</h4>
                        <p className="mt-1 text-xs text-zinc-500">
                          {exercise.phaseLabelEs} · {exercise.sideLabelEs}
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-5 text-zinc-300">
                      {exercise.prescriptionType === "duration" ? (
                        <>
                          {exercise.targetSets}× {formatDurationSeconds(exercise.durationSeconds ?? 0)} · descanso{" "}
                          {exercise.restSeconds}s
                        </>
                      ) : (
                        <>
                          {exercise.targetSets}×{exercise.targetRepMin}-{exercise.targetRepMax} · RIR{" "}
                          {exercise.targetRir} · descanso {exercise.restSeconds}s
                        </>
                      )}
                    </p>
                    {exercise.painSensitive ? (
                      <p className="mt-2 text-xs leading-5 text-amber-200">
                        Vigilar dolor. Sustituciones: {exercise.substitutionOptionsEs.join(", ")}.
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </details>
          </article>
        ))}
      </div>
    </div>
  );
}

function formatActivatedAt(date: Date) {
  return new Intl.DateTimeFormat("es-CR", { day: "2-digit", month: "short" }).format(date);
}

function formatDurationSeconds(totalSeconds: number) {
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds === 0 ? `${minutes} min` : `${minutes}:${String(seconds).padStart(2, "0")} min`;
}

function gateRingClass(status: "blocked" | "manual_review_ready") {
  return {
    blocked: "ring-amber-300/30",
    manual_review_ready: "ring-emerald-400/30",
  }[status];
}

function statusPillClass(status: M1ReadinessStatus) {
  return {
    complete: "bg-emerald-300/10 text-emerald-300",
    incomplete: "bg-amber-300/10 text-amber-200",
    blocked: "bg-zinc-800 text-zinc-400",
    pending: "bg-sky-300/10 text-sky-200",
  }[status];
}
