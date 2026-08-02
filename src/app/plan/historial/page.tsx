import Link from "next/link";

import { requireCurrentUser } from "@/lib/auth-server";
import { formatShortDateEs } from "@/lib/format";
import { PLAN_STATUS_LABEL_ES, PLAN_STATUS_PILL_CLASS, sortPlanHistoryRows, type PlanHistoryRow } from "@/plans/plan-history";
import { getAllPlansForProfile } from "@/plans/plan-repository";
import { getAthleteProfileForUser } from "@/profile/profile-repository";

import { AppShell } from "../../app-shell";

export default async function PlanHistorialPage() {
  const user = await requireCurrentUser();
  const profile = await getAthleteProfileForUser(user.id);

  if (!profile) {
    return (
      <AppShell activeHref="/plan">
        <div className="mt-20 rounded-3xl bg-zinc-900 p-5 ring-1 ring-zinc-800">
          <p className="text-sm font-semibold text-emerald-300">Perfil requerido</p>
          <h1 className="mt-2 text-2xl font-semibold">Primero crea tu perfil de atleta.</h1>
          <Link
            href="/perfil"
            className="mt-5 block rounded-2xl bg-emerald-300 px-5 py-4 text-center font-semibold text-zinc-950"
          >
            Crear perfil primero
          </Link>
        </div>
      </AppShell>
    );
  }

  const rows = sortPlanHistoryRows(await getAllPlansForProfile(profile.id));

  return (
    <AppShell activeHref="/plan">
      <header className="space-y-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-400">Plan</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Tus planes</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            Todos los planes que has tenido, incluidos los archivados — su historial registrado sigue disponible en
            Progreso aunque ya no estén activos.
          </p>
        </div>
      </header>

      {rows.length === 0 ? (
        <p className="mt-7 text-sm leading-6 text-zinc-400">Todavía no has creado ningún plan.</p>
      ) : (
        <section className="mt-6 grid gap-3 pb-10">
          {rows.map((row) => (
            <PlanHistoryCard key={row.plan.id} row={row} />
          ))}
        </section>
      )}

      <Link
        href="/plan"
        className="mt-4 block rounded-2xl bg-zinc-950 px-4 py-3 text-center text-sm font-semibold text-emerald-300 ring-1 ring-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
      >
        Volver a Plan
      </Link>
    </AppShell>
  );
}

function PlanHistoryCard({ row }: { row: PlanHistoryRow }) {
  const { plan, sessionCount } = row;

  return (
    <Link
      href={`/plan/historial/${plan.id}`}
      className="block rounded-2xl bg-zinc-900 p-3 ring-1 ring-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="min-w-0 truncate font-semibold text-zinc-100">{plan.nameEs}</h2>
        <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${PLAN_STATUS_PILL_CLASS[plan.status]}`}>
          {PLAN_STATUS_LABEL_ES[plan.status]}
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-zinc-400">
        {plan.daysPerWeek} días/semana · {sessionCount} {sessionCount === 1 ? "sesión registrada" : "sesiones registradas"}
      </p>
      <p className="mt-1 text-xs text-zinc-400">
        Creado {formatShortDateEs(plan.createdAt)}
        {plan.activatedAt ? ` · Activado ${formatShortDateEs(plan.activatedAt)}` : ""}
      </p>
    </Link>
  );
}
