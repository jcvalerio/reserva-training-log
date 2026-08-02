import Link from "next/link";

import { formatShortDateEs } from "@/lib/format";
import { PLAN_STATUS_LABEL_ES, PLAN_STATUS_PILL_CLASS } from "@/plans/plan-history";
import type { PlanPreviewSummary } from "@/plans/plan-preview";
import type { PlanSessionStats, WorkoutPlan } from "@/plans/plan-repository";

import { AppShell } from "../../../app-shell";
import { PlanDayPager } from "../../plan-day-pager";

export function PlanHistoryDetailContent({
  plan,
  stats,
  preview,
  previewError,
}: {
  plan: WorkoutPlan;
  stats: PlanSessionStats;
  preview: PlanPreviewSummary | null;
  previewError: boolean;
}) {
  return (
    <AppShell activeHref="/plan">
      <header className="space-y-3">
        <Link
          href="/plan/historial"
          className="text-sm font-semibold text-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
        >
          ← Volver a Tus planes
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-400">Plan</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">{plan.nameEs}</h1>
          </div>
          <span
            className={`mt-6 shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${PLAN_STATUS_PILL_CLASS[plan.status]}`}
          >
            {PLAN_STATUS_LABEL_ES[plan.status]}
          </span>
        </div>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-2 text-center">
        <StatTile label="Sesiones" value={String(stats.sessionCount)} />
        <StatTile label="Días/sem" value={String(plan.daysPerWeek)} />
      </section>

      <div className="mt-3 grid gap-1 text-xs text-zinc-400">
        {stats.firstSessionAt ? (
          <p>
            Primera sesión {formatShortDateEs(stats.firstSessionAt)}
            {stats.lastSessionAt && stats.lastSessionAt.getTime() !== stats.firstSessionAt.getTime()
              ? ` · Última ${formatShortDateEs(stats.lastSessionAt)}`
              : ""}
          </p>
        ) : (
          <p>Sin sesiones registradas todavía.</p>
        )}
        <p>
          Creado {formatShortDateEs(plan.createdAt)}
          {plan.activatedAt ? ` · Activado ${formatShortDateEs(plan.activatedAt)}` : ""}
        </p>
      </div>

      <div className="mt-6 pb-10">
        {preview && preview.sessions.length > 0 ? (
          <PlanDayPager sessions={preview.sessions} />
        ) : previewError ? (
          <p className="text-sm leading-6 text-zinc-400">
            No se pudo mostrar el detalle día por día de este plan (algún día no cumple los requisitos mínimos).
          </p>
        ) : (
          <p className="text-sm leading-6 text-zinc-400">Este plan no tiene días definidos.</p>
        )}
      </div>
    </AppShell>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-zinc-900 px-2 py-3 ring-1 ring-zinc-800">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-zinc-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-zinc-100">{value}</p>
    </div>
  );
}
