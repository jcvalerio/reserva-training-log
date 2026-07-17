import Link from "next/link";

import { baselineExerciseDefinitions } from "@/baseline/baseline-exercises";
import { getBaselineLiftsForProfile } from "@/baseline/baseline-repository";
import { getBaselineSides } from "@/baseline/baseline-schema";
import { requireCurrentUser } from "@/lib/auth-server";
import { getAthleteProfileForUser } from "@/profile/profile-repository";
import { rirLabelsEs, rirValues } from "@/training/rir";

import { saveBaselineAction } from "./actions";

export default async function BaselinePage() {
  const user = await requireCurrentUser();
  const profile = await getAthleteProfileForUser(user.id);

  if (!profile) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center bg-zinc-950 px-5 py-6 text-zinc-50">
        <div className="rounded-3xl bg-zinc-900 p-5 ring-1 ring-zinc-800">
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
          <Link href="/" className="mt-3 block text-center text-sm font-medium text-zinc-400">
            Volver a Inicio
          </Link>
        </div>
      </main>
    );
  }

  const baselineLifts = await getBaselineLiftsForProfile(profile.id);
  const baselineByKey = new Map(
    baselineLifts.map((lift) => [`${lift.exercise.slug}:${lift.side}`, lift]),
  );

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-zinc-950 px-5 py-6 text-zinc-50">
      <header className="space-y-3">
        <Link href="/" className="text-sm font-medium text-emerald-300">
          ← Inicio
        </Link>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-500">Pesos base</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Punto de partida real</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            Completa solo los ejercicios que conozcas. Cada fila guardada requiere kg, reps, series, RIR y dolor; las notas son opcionales.
          </p>
        </div>
      </header>

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

      <form action={saveBaselineAction} className="mt-6 grid gap-5 pb-10">
        {baselineExerciseDefinitions.map((exerciseDefinition) => (
          <section key={exerciseDefinition.slug} className="rounded-3xl bg-zinc-900 p-4 ring-1 ring-zinc-800">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{exerciseDefinition.nameEs}</h2>
                <p className="mt-1 text-xs text-zinc-400">
                  {exerciseDefinition.isUnilateral ? "Unilateral · izquierda/derecha" : "Bilateral"}
                </p>
              </div>
              <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs text-zinc-400 ring-1 ring-zinc-800">
                opcional
              </span>
            </div>

            <div className="mt-4 grid gap-4">
              {getBaselineSides(exerciseDefinition.isUnilateral).map((side) => {
                const prefix = `${exerciseDefinition.slug}:${side}`;
                const saved = baselineByKey.get(prefix);

                return (
                  <div key={side} className="rounded-2xl bg-zinc-950 p-3 ring-1 ring-zinc-800">
                    <p className="mb-3 text-sm font-semibold text-zinc-300">{sideLabelsEs[side]}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="kg">
                        <input
                          name={`${prefix}:weightKg`}
                          type="number"
                          inputMode="decimal"
                          min={0.5}
                          max={999}
                          step="0.5"
                          defaultValue={saved?.weightKg ?? ""}
                          className="input"
                        />
                      </Field>
                      <Field label="reps">
                        <input
                          name={`${prefix}:reps`}
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={50}
                          defaultValue={saved?.reps ?? ""}
                          className="input"
                        />
                      </Field>
                      <Field label="series">
                        <input
                          name={`${prefix}:sets`}
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={10}
                          defaultValue={saved?.sets ?? ""}
                          className="input"
                        />
                      </Field>
                      <Field label="dolor 0-10">
                        <input
                          name={`${prefix}:painScore`}
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={10}
                          defaultValue={saved?.painScore ?? ""}
                          className="input"
                        />
                      </Field>
                    </div>
                    <Field label="RIR">
                      <select name={`${prefix}:rir`} defaultValue={saved?.rir ?? ""} className="input mt-2">
                        <option value="">Seleccionar</option>
                        {rirValues.map((rir) => (
                          <option key={rir} value={rir}>
                            {rirLabelsEs[rir]}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Notas">
                      <textarea
                        name={`${prefix}:notes`}
                        rows={2}
                        defaultValue={saved?.notes ?? ""}
                        className="input mt-2 resize-none"
                        placeholder="Opcional. Útil para dictado en iPhone."
                      />
                    </Field>
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        <button
          type="submit"
          className="sticky bottom-4 rounded-2xl bg-emerald-300 px-5 py-4 text-base font-semibold text-zinc-950 shadow-lg shadow-emerald-950/30"
        >
          Guardar pesos base
        </button>
      </form>
    </main>
  );
}

const sideLabelsEs = {
  bilateral: "Bilateral",
  left: "Izquierda",
  right: "Derecha",
} as const;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-zinc-300">
      <span>{label}</span>
      {children}
    </label>
  );
}
