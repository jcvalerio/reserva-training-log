import Link from "next/link";

import { getBaselineLiftsForProfile } from "@/baseline/baseline-repository";
import { requireCurrentUser } from "@/lib/auth-server";
import { getAthleteProfileForUser } from "@/profile/profile-repository";

import { AppShell } from "../app-shell";
import { FormStatusBanner } from "../form-status-banner";
import { saveBaselineAction } from "./actions";
import { BaselineIntakeForm } from "./baseline-intake-form";

type BaselinePageProps = {
  searchParams?: Promise<{ saved?: string; error?: string }>;
};

export default async function BaselinePage({ searchParams }: BaselinePageProps) {
  const user = await requireCurrentUser();
  const profile = await getAthleteProfileForUser(user.id);
  const params = searchParams ? await searchParams : {};

  if (!profile) {
    return (
      <AppShell activeHref="/baseline">
        <div className="mt-20 rounded-3xl bg-zinc-900 p-5 ring-1 ring-zinc-800">
          <p className="text-sm font-semibold text-emerald-300">Perfil requerido</p>
          <h1 className="mt-2 text-2xl font-semibold">Primero crea tu perfil de atleta.</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            Los pesos base quedan vinculados a tu perfil privado y no deben guardarse sin ese contexto.
          </p>
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

  const baselineLifts = await getBaselineLiftsForProfile(profile.id);
  const savedLifts = baselineLifts.map((lift) => ({
    exerciseSlug: lift.exercise.slug,
    side: lift.side,
    weightKg: lift.weightKg,
    reps: lift.reps,
    sets: lift.sets,
    rir: lift.rir,
    painScore: lift.painScore,
    notes: lift.notes,
  }));

  return (
    <AppShell activeHref="/baseline">
      <header className="space-y-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-500">Pesos base</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Punto de partida real</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            Completa solo los ejercicios que conozcas. Cada fila guardada requiere kg, reps, series, RIR y dolor; las notas son opcionales.
          </p>
        </div>
      </header>

      <FormStatusBanner
        saved={params.saved === "1"}
        error={params.error === "validation"}
        savedMessage="Pesos base actualizados. La preparación M1 ya refleja estas entradas."
        errorMessage="Completa al menos una fila con kg, reps, series, RIR y dolor dentro de rango antes de guardar."
      />

      {baselineLifts.length > 0 ? (
        <section className="mt-6 rounded-3xl bg-zinc-900 p-4 ring-1 ring-emerald-400/30">
          <p className="text-sm font-semibold text-emerald-300">Base guardada</p>
          <p className="mt-1 text-sm leading-6 text-zinc-300">
            {baselineLifts.length} entradas listas para semana 1. Si guardas de nuevo, se reemplaza tu base actual con los valores visibles.
          </p>
        </section>
      ) : (
        <section className="mt-6 rounded-3xl bg-zinc-900 p-4 ring-1 ring-amber-300/30">
          <p className="text-sm font-semibold text-amber-200">Pesos base pendientes</p>
          <p className="mt-1 text-sm leading-6 text-zinc-300">
            Una fila completa basta para continuar la preparación. Puedes dejar ejercicios vacíos si hoy no tienes un dato confiable.
          </p>
        </section>
      )}

      <BaselineIntakeForm action={saveBaselineAction} savedLifts={savedLifts} />
    </AppShell>
  );
}
