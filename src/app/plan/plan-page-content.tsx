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
  seededPreview,
  activePlanPreview,
  activatedAt,
  justSaved,
  activatePlanAction,
}: {
  readiness: M1Readiness;
  gate: NonAiPlanGate;
  seededPreview: PlanPreviewSummary | null;
  activePlanPreview: PlanPreviewSummary | null;
  activatedAt: Date | null;
  justSaved: boolean;
  activatePlanAction: () => Promise<void>;
}) {
  return (
    <AppShell activeHref="/plan">
      <header className="space-y-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-500">Plan</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {activePlanPreview
              ? "Tu plan"
              : gate.status === "manual_review_ready"
                ? "Revisión pre-plan"
                : "Preparación del plan"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            {activePlanPreview
              ? "Este es tu plan real, guardado y activo. Todavía no genera IA ni registra series."
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
          <StatusTile label="Plan" value={activePlanPreview ? "Activo" : "Sin crear"} />
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
          <p className="mt-1 text-sm leading-6 text-zinc-400">
            Perfil, pesos base y mediciones son la base mínima antes de cualquier revisión de plan.
          </p>
        </div>

        {readiness.steps.map((step) => (
          <PlanChecklistItem key={step.id} step={step} />
        ))}

        {activePlanPreview ? (
          <ActivePlanSummary summary={activePlanPreview} activatedAt={activatedAt} />
        ) : (
          <>
            {seededPreview ? <SeededPlanPreview summary={seededPreview} activatePlanAction={activatePlanAction} /> : null}
            <CustomPlanBuilderEntry />
          </>
        )}

        <div className="rounded-2xl bg-zinc-900 p-4 text-sm leading-6 text-zinc-300 ring-1 ring-amber-300/30">
          La progresión futura seguirá siendo pain-aware: dolor &gt;2 bloquea aumentos agresivos y dolor &gt;3 exige
          reducir, modificar o cambiar el movimiento.
        </div>
      </section>
    </AppShell>
  );
}

function StatusTile({ label, value }: { label: string; value: string }) {
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

function SeededPlanPreview({
  summary,
  activatePlanAction,
}: {
  summary: PlanPreviewSummary;
  activatePlanAction: () => Promise<void>;
}) {
  return (
    <section className="rounded-3xl bg-zinc-900 p-4 ring-1 ring-sky-300/30" aria-labelledby="seeded-preview-title">
      <p id="seeded-preview-title" className="text-sm font-semibold text-sky-200">
        Vista previa no guardada
      </p>
      <h2 className="mt-2 text-xl font-semibold text-zinc-100">{summary.nameEs}</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-300">
        Estructura base predefinida para revisión futura. Es solo lectura: no viene de IA, no se guarda y todavía no se
        puede activar.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {summary.previewBoundaryLabelsEs.map((label) => (
          <span
            key={label}
            className="rounded-full bg-sky-300/10 px-2 py-1 text-xs font-semibold text-sky-200 ring-1 ring-sky-300/20"
          >
            {label}
          </span>
        ))}
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

      <form action={activatePlanAction} className="mt-4">
        <SubmitButton className="w-full rounded-2xl bg-emerald-300 px-5 py-4 text-center font-semibold text-zinc-950 shadow-lg shadow-emerald-950/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-100">
          Activar este plan
        </SubmitButton>
      </form>
      <p className="mt-3 text-sm leading-6 text-zinc-400">
        Al activar, este plan pasa a ser tu plan real y guardado. Editar y registrar series quedan fuera de esta
        iteración.
      </p>
    </section>
  );
}

function CustomPlanBuilderEntry() {
  return (
    <section className="rounded-3xl bg-zinc-900 p-4 ring-1 ring-zinc-800" aria-labelledby="custom-plan-builder-title">
      <p id="custom-plan-builder-title" className="text-sm font-semibold text-zinc-100">
        ¿Prefieres tu propia rutina?
      </p>
      <p className="mt-2 text-sm leading-6 text-zinc-300">
        Define tus propios días de entrenamiento y ejercicios, revísalos y actívalos cuando estén listos.
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

function ActivePlanSummary({ summary, activatedAt }: { summary: PlanPreviewSummary; activatedAt: Date | null }) {
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
    </section>
  );
}

function PlanSessionsList({ sessions }: { sessions: PlanPreviewSummary["sessions"] }) {
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
                          {exercise.phaseLabelEs} · {exercise.sideModeLabelEs}
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-5 text-zinc-300">
                      {exercise.targetSets}×{exercise.targetRepMin}-{exercise.targetRepMax} · RIR {exercise.targetRir}{" "}
                      · descanso {exercise.restSeconds}s
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
