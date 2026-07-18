import Link from "next/link";

import { getBaselineLiftsForProfile } from "@/baseline/baseline-repository";
import { requireCurrentUser } from "@/lib/auth-server";
import { getRecentBodyMeasurementsForProfile } from "@/measurements/measurement-repository";
import { getM1Readiness, type M1ReadinessStep, type M1ReadinessStatus } from "@/onboarding/readiness";
import { getNonAiPlanGate } from "@/plans/plan-gate";
import { getPlanPreviewSummary, type PlanPreviewSummary } from "@/plans/plan-preview";
import { createSeededHypertrophyPlan } from "@/plans/seeded-plan";
import { getAthleteProfileForUser } from "@/profile/profile-repository";

export default async function PlanPage() {
  const user = await requireCurrentUser();
  const profile = await getAthleteProfileForUser(user.id);

  const [baselineLifts, bodyMeasurements] = profile
    ? await Promise.all([
        getBaselineLiftsForProfile(profile.id),
        getRecentBodyMeasurementsForProfile(profile.id, 1),
      ])
    : [[], []];

  const readiness = getM1Readiness({
    hasProfile: Boolean(profile),
    baselineLiftCount: baselineLifts.length,
    bodyMeasurementCount: bodyMeasurements.length,
  });
  const gate = getNonAiPlanGate(readiness);
  const seededPreview = readiness.foundationReady ? getPlanPreviewSummary(createSeededHypertrophyPlan()) : null;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-zinc-950 px-4 py-5 text-zinc-50 min-[380px]:px-5 min-[380px]:py-6">
      <header className="space-y-3">
        <Link href="/" className="text-sm font-medium text-emerald-300">
          ← Inicio
        </Link>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-500">Plan</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {gate.status === "manual_review_ready" ? "Revisión pre-plan" : "Preparación del plan"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            Revisa si las bases mínimas están listas. Esta pantalla no genera AI, no persiste borradores y no activa planes.
          </p>
        </div>
      </header>

      <section className={`mt-7 rounded-3xl bg-zinc-900 p-4 ring-1 ${gateRingClass(gate.status)}`}>
        <p className="text-sm font-semibold text-emerald-300">Estado seguro</p>
        <h2 className="mt-2 text-2xl font-semibold">{gate.titleEs}</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-300">{gate.descriptionEs}</p>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <StatusTile label="Bases" value={`${readiness.completedFoundationSteps}/${readiness.totalFoundationSteps}`} />
          <StatusTile label="AI" value="Apagado" />
          <StatusTile label="Plan" value="Sin crear" />
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

        {seededPreview ? <SeededPlanPreview summary={seededPreview} /> : null}

        <div className="rounded-2xl bg-zinc-900 p-4 text-sm leading-6 text-zinc-300 ring-1 ring-amber-300/30">
          La progresión futura seguirá siendo pain-aware: dolor &gt;2 bloquea aumentos agresivos y dolor &gt;3 exige
          reducir, modificar o cambiar el movimiento.
        </div>
      </section>
    </main>
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

function SeededPlanPreview({ summary }: { summary: PlanPreviewSummary }) {
  return (
    <section className="rounded-3xl bg-zinc-900 p-4 ring-1 ring-sky-300/30" aria-labelledby="seeded-preview-title">
      <p id="seeded-preview-title" className="text-sm font-semibold text-sky-200">
        Vista previa no guardada
      </p>
      <h2 className="mt-2 text-xl font-semibold text-zinc-100">{summary.nameEs}</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-300">
        Estructura base predefinida para revisión futura. No viene de AI, no se persiste y todavía no se puede activar.
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <StatusTile label="Semanas" value={String(summary.durationWeeks)} />
        <StatusTile label="Días/sem" value={String(summary.daysPerWeek)} />
        <StatusTile label="Min" value={String(summary.sessionDurationMinutes)} />
      </div>

      <div className="mt-4 rounded-2xl bg-zinc-950 p-3 ring-1 ring-zinc-800">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Logging futuro por serie</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {summary.requiredSetLogFieldsEs.map((field) => (
            <span key={field} className="rounded-full bg-zinc-900 px-2 py-1 text-xs font-semibold text-zinc-300 ring-1 ring-zinc-800">
              {field}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-zinc-950 p-3 ring-1 ring-zinc-800">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Semana 1</p>
        <div className="mt-3 grid gap-3">
          {summary.firstWeekSessions.map((session) => (
            <article key={session.dayIndex} className="rounded-2xl bg-zinc-900 p-3 ring-1 ring-zinc-800">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Día {session.dayIndex}</p>
              <h3 className="mt-1 font-semibold text-zinc-100">{session.nameEs}</h3>
              <p className="mt-1 text-sm leading-5 text-zinc-400">{session.focus}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full bg-zinc-950 px-2 py-1 text-zinc-300 ring-1 ring-zinc-800">
                  {session.exerciseCount} ejercicios
                </span>
                {session.unilateralExerciseCount > 0 ? (
                  <span className="rounded-full bg-emerald-300/10 px-2 py-1 text-emerald-300">
                    unilateral
                  </span>
                ) : null}
                {session.painSensitiveExerciseCount > 0 ? (
                  <span className="rounded-full bg-amber-300/10 px-2 py-1 text-amber-200">
                    dolor vigilado
                  </span>
                ) : null}
              </div>

              <details className="mt-3 rounded-2xl bg-zinc-950 p-3 text-sm ring-1 ring-zinc-800">
                <summary className="cursor-pointer font-semibold text-emerald-300">Ver ejercicios y objetivos</summary>
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
                        {exercise.targetSets}×{exercise.targetRepMin}-{exercise.targetRepMax} · RIR {exercise.targetRir} · descanso {exercise.restSeconds}s
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

      <p className="mt-3 text-sm leading-6 text-zinc-400">
        Aceptar, editar y activar el plan quedan fuera de esta iteración.
      </p>
    </section>
  );
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
