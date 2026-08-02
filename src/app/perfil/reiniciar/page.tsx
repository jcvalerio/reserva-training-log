import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/lib/auth-server";
import { getAthleteProfileForUser } from "@/profile/profile-repository";
import { getProfileResetSummary } from "@/profile/profile-reset";

import { AppShell } from "../../app-shell";
import { resetProfileDataAction } from "./actions";
import { ResetConfirmForm } from "./reset-confirm-form";

type ResetPageProps = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function ResetProfileDataPage({ searchParams }: ResetPageProps) {
  const user = await requireCurrentUser();
  const profile = await getAthleteProfileForUser(user.id);
  const params = searchParams ? await searchParams : {};

  if (!profile) {
    redirect("/perfil");
  }

  const summary = await getProfileResetSummary(profile.id);
  const hasAnyData = summary.planCount > 0 || summary.sessionCount > 0 || summary.measurementCount > 0;

  return (
    <AppShell activeHref="/perfil" backTo={{ href: "/perfil", label: "Perfil" }}>
      <header className="space-y-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-400">Perfil · Zona de peligro</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Eliminar planes y sesiones</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            Esto borra permanentemente todos tus planes (activos, borradores y archivados) y tus sesiones
            registradas. No se puede deshacer.
          </p>
        </div>
      </header>

      {params.error === "confirm" ? (
        <section role="alert" className="mt-6 rounded-3xl bg-amber-300/10 p-4 ring-1 ring-amber-300/30">
          <p className="text-sm font-semibold text-amber-200">No coincide</p>
          <p className="mt-1 text-sm leading-6 text-zinc-300">
            El texto escrito no coincide. Vuelve a intentarlo si de verdad quieres continuar.
          </p>
        </section>
      ) : null}

      <section className="mt-6 rounded-3xl bg-zinc-900 p-4 ring-1 ring-amber-300/30">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Tu cuenta tiene hoy</p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <StatTile label="Planes" value={summary.planCount} />
          <StatTile label="Sesiones" value={summary.sessionCount} />
          <StatTile label="Mediciones" value={summary.measurementCount} />
        </div>
        <p className="mt-4 text-xs leading-5 text-zinc-400">
          Tu perfil (nombre, contexto de entrenamiento, limitaciones) siempre se mantiene — planes y sesiones se
          borran siempre; tus mediciones son opcionales, ver abajo.
        </p>
      </section>

      {hasAnyData ? (
        <ResetConfirmForm action={resetProfileDataAction} summary={summary} />
      ) : (
        <p className="mt-6 text-sm leading-6 text-zinc-400">No tienes planes, sesiones ni mediciones que borrar.</p>
      )}
    </AppShell>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-zinc-950 p-3 ring-1 ring-zinc-800">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">{label}</p>
      <p className="mt-1 text-xl font-semibold text-zinc-100">{value}</p>
    </div>
  );
}
