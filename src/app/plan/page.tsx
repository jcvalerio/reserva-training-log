import Link from "next/link";

import { getBaselineLiftsForProfile } from "@/baseline/baseline-repository";
import { requireCurrentUser } from "@/lib/auth-server";
import { getRecentBodyMeasurementsForProfile } from "@/measurements/measurement-repository";
import { getM1Readiness } from "@/onboarding/readiness";
import { getNonAiPlanGate } from "@/plans/plan-gate";
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

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-zinc-950 px-5 py-6 text-zinc-50">
      <header className="space-y-3">
        <Link href="/" className="text-sm font-medium text-emerald-300">
          ← Inicio
        </Link>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-500">Plan</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Plan no iniciado</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            Esta pantalla solo valida preparación y revisión manual. No dispara generación AI ni crea un plan.
          </p>
        </div>
      </header>

      <section className="mt-8 rounded-3xl bg-zinc-900 p-4 ring-1 ring-zinc-800">
        <p className="text-sm font-semibold text-emerald-300">Estado</p>
        <h2 className="mt-2 text-2xl font-semibold">{gate.titleEs}</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-300">{gate.descriptionEs}</p>
        <p className="mt-3 rounded-2xl bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-400 ring-1 ring-zinc-800">
          {readiness.completedFoundationSteps}/{readiness.totalFoundationSteps} bases listas. AI: apagado.
        </p>
        <Link
          href={gate.ctaHref}
          className="mt-5 block rounded-2xl bg-emerald-300 px-5 py-4 text-center font-semibold text-zinc-950"
        >
          {gate.ctaLabelEs}
        </Link>
      </section>

      <section className="mt-6 grid gap-3 pb-10">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-500">Checklist pre-plan</p>
        {readiness.steps.map((step) => (
          <article key={step.id} className="rounded-2xl bg-zinc-900 p-4 ring-1 ring-zinc-800">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-zinc-100">{step.labelEs}</h2>
                <p className="mt-1 text-sm leading-6 text-zinc-400">{step.descriptionEs}</p>
              </div>
              <span className="shrink-0 rounded-full bg-zinc-950 px-2 py-1 text-xs font-semibold text-zinc-300 ring-1 ring-zinc-800">
                {step.statusLabelEs}
              </span>
            </div>
          </article>
        ))}

        <div className="rounded-2xl bg-zinc-900 p-4 text-sm leading-6 text-zinc-300 ring-1 ring-amber-300/30">
          La progresión futura seguirá siendo pain-aware: dolor &gt;2 bloquea aumentos agresivos y dolor &gt;3 exige
          reducir, modificar o cambiar el movimiento.
        </div>
      </section>
    </main>
  );
}
